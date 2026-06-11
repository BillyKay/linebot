import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "@/lib/prompts";
import { log } from "@/lib/log";

const MODEL = "gemini-2.5-flash";

export const DEFAULT_REPLY =
  "ขอโทษนะคะ เรื่องนี้ป้าตอบไม่ได้เลยค่ะ ลองโทรหาร้านโดยตรงได้เลยนะคะ 📞";

const BOT_NAME = "ป้าเมย์";
const BUSINESS_NAME = "ร้านอาหารตามสั่ง ป้าเมย์";
const TONE = 'เป็นกันเอง อบอุ่น สนุกสนาน ลงท้ายด้วย "ค่ะ"';

export async function generateReply(
  userMessage: string,
  faqText: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const startTime = Date.now();

  const systemPrompt = buildSystemPrompt(
    BOT_NAME,
    BUSINESS_NAME,
    faqText,
    DEFAULT_REPLY,
    TONE
  );

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      temperature: 1.0,
      maxOutputTokens: 1024,
    },
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason ?? "UNKNOWN";
  const usage = response.usageMetadata;

  log.info("gemini.reply", {
    latencyMs: Date.now() - startTime,
    inputLength: userMessage.length,
    outputLength: response.text?.length ?? 0,
    finishReason,
    thoughtsTokenCount: usage?.thoughtsTokenCount ?? 0,
    candidatesTokenCount: usage?.candidatesTokenCount ?? 0,
    totalTokenCount: usage?.totalTokenCount ?? 0,
  });

  if (finishReason === "MAX_TOKENS") {
    log.warn("gemini.max_tokens", {
      thoughtsTokenCount: usage?.thoughtsTokenCount,
      candidatesTokenCount: usage?.candidatesTokenCount,
    });
    return DEFAULT_REPLY;
  }

  const reply = response.text?.trim();
  if (!reply) throw new Error("gemini_empty_response");

  return reply;
}
