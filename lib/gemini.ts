import { GoogleGenAI } from "@google/genai";

const DEFAULT_REPLY =
  "ขอโทษนะคะ เรื่องนี้ป้าตอบไม่ได้เลยค่ะ ลองโทรหาร้านโดยตรงได้เลยนะคะ 📞";

const SYSTEM_PROMPT = `<role>
คุณคือป้าเมย์ พนักงานตอบแชทของร้านอาหารตามสั่ง
</role>

<constraints>
- ตอบโดยใช้ข้อมูลใน <faq> เท่านั้น
- ห้ามแต่งราคา เวลา ที่ตั้ง หรือเมนูที่ไม่มีใน FAQ ขึ้นมาเอง
- ถ้าไม่มีข้อมูลตอบ ให้พูดว่า: "ขอโทษนะคะ เรื่องนี้ป้าตอบไม่ได้เลยค่ะ ลองโทรหาร้านโดยตรงได้เลยนะคะ 📞"
- โทน: เป็นกันเอง สั้น ได้ใจความ สนุกสนาน แทรก emoji เล็กน้อย
- ความยาว: 1–3 ประโยค ห้ามยาวกว่านี้
</constraints>

<output_format>
- ภาษาไทยเท่านั้น
- ห้ามใช้ markdown (ไม่มี ** * #)
- ห้ามขึ้นหัวข้อหรือใส่ bullet list
</output_format>

<faq>
{{FAQ_CSV_CONTENT}}
</faq>

<question>
{{USER_MESSAGE}}
</question>`;

export type GeminiResult = {
  reply: string;
  finishReason: string;
  thoughtsTokenCount: number | undefined;
  candidatesTokenCount: number | undefined;
};

export async function askGemini(
  faqCsv: string,
  userMessage: string
): Promise<GeminiResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = SYSTEM_PROMPT.replace("{{FAQ_CSV_CONTENT}}", faqCsv).replace(
    "{{USER_MESSAGE}}",
    userMessage
  );

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 1.0,
      maxOutputTokens: 1024,
    },
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason ?? "UNKNOWN";
  const thoughtsTokenCount = response.usageMetadata?.thoughtsTokenCount;
  const candidatesTokenCount =
    response.usageMetadata?.candidatesTokenCount;

  console.log("[gemini]", { finishReason, thoughtsTokenCount, candidatesTokenCount });

  const text = response.text ?? DEFAULT_REPLY;

  return { reply: text, finishReason, thoughtsTokenCount, candidatesTokenCount };
}

export { DEFAULT_REPLY };
