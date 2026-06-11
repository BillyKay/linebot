import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import * as line from "@line/bot-sdk";
import { fetchFAQ } from "@/lib/sheet";
import { generateReply, DEFAULT_REPLY } from "@/lib/gemini";
import { shouldHandoff, notifyAdmin } from "@/lib/handoff";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 30;

const channelSecret = process.env.LINE_CHANNEL_SECRET!;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

async function replyWithRetry(
  client: line.messagingApi.MessagingApiClient,
  replyToken: string,
  text: string,
  attempts = 3
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text }],
      });
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    log.warn("webhook.invalid_signature");
    return new NextResponse("invalid signature", { status: 403 });
  }

  let body: { events: line.webhook.Event[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken,
  });

  const textEvents = body.events.filter(
    (e): e is line.webhook.MessageEvent & {
      message: line.webhook.TextMessageContent;
    } =>
      e.type === "message" &&
      (e as line.webhook.MessageEvent).message.type === "text"
  );

  await Promise.all(
    textEvents.map(async (event) => {
      const replyToken = event.replyToken;
      if (!replyToken) return;

      const userMessage = event.message.text;
      const userId = event.source?.userId ?? "unknown";
      const startTime = Date.now();

      try {
        // Smart Handoff — check BEFORE calling Gemini
        if (shouldHandoff(userMessage)) {
          await notifyAdmin(userId, userMessage);
          await replyWithRetry(
            client,
            replyToken,
            "ขอแอดมินติดต่อกลับนะคะ 🙏"
          );
          log.info("handoff.routed", {
            userId,
            latencyMs: Date.now() - startTime,
          });
          return;
        }

        const faqText = await fetchFAQ();

        const reply = await Promise.race([
          generateReply(userMessage, faqText),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("gemini_timeout")), 8000)
          ),
        ]).catch((err: Error) => {
          log.error("gemini.failed", { err: err.message });
          return DEFAULT_REPLY;
        });

        await replyWithRetry(client, replyToken, reply);

        log.info("reply.sent", {
          userId,
          latencyMs: Date.now() - startTime,
          replyLength: reply.length,
        });
      } catch (err) {
        log.error("webhook.error", {
          err: (err as Error).message,
          userId,
        });
        try {
          await client.replyMessage({
            replyToken,
            messages: [{ type: "text", text: DEFAULT_REPLY }],
          });
        } catch {
          /* replyToken expired — swallow */
        }
      }
    })
  );

  return NextResponse.json({ ok: true });
}
