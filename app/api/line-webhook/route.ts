import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import * as line from "@line/bot-sdk";
import { getFaqCsv } from "@/lib/sheet";
import { askGemini, DEFAULT_REPLY } from "@/lib/gemini";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const channelSecret = process.env.LINE_CHANNEL_SECRET!;

function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { events: line.webhook.Event[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const client = new line.messagingApi.MessagingApiClient({ channelAccessToken });

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

      const faqCsv = await getFaqCsv();

      let replyText = DEFAULT_REPLY;
      try {
        const { reply, finishReason, thoughtsTokenCount, candidatesTokenCount } =
          await askGemini(faqCsv, userMessage);

        if (finishReason === "MAX_TOKENS") {
          console.warn("[webhook] MAX_TOKENS hit", {
            thoughtsTokenCount,
            candidatesTokenCount,
          });
          replyText = DEFAULT_REPLY;
        } else if (finishReason !== "STOP") {
          console.warn("[webhook] unexpected finishReason:", finishReason);
          replyText = DEFAULT_REPLY;
        } else {
          replyText = reply;
        }
      } catch (err) {
        console.error("[webhook] gemini error:", err);
      }

      try {
        await client.replyMessage({
          replyToken,
          messages: [{ type: "text", text: replyText }],
        });
      } catch (err) {
        console.error("[webhook] replyMessage failed:", err);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
