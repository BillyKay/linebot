# CLAUDE.md — LINE Bot ป้าเมย์

## What we're building

LINE Official Account bot สำหรับ "ร้านอาหารตามสั่ง ป้าเมย์" ตอบลูกค้า 24 ชม.
โดยใช้ Gemini 2.5 Flash อ่าน FAQ จาก Google Sheet · ส่ง reply กลับ LINE

## Stack — locked

- Next.js 14 App Router + TypeScript
- `@line/bot-sdk` v8+ — Messaging API (MessagingApiClient · webhook types)
- `@google/genai` — Gemini 2.5 Flash
- Google Sheet CSV public URL สำหรับ FAQ (question, answer, tags)
- Vercel (Hobby tier · `maxDuration = 30`)

## Repo structure

- `app/api/line-webhook/route.ts` — POST handler: verify sig → handoff → Gemini → reply
- `lib/sheet.ts` — fetch + parse CSV → readable FAQ text · cache 60s
- `lib/gemini.ts` — call Gemini · log tokens · return reply string
- `lib/prompts.ts` — buildSystemPrompt (Hallucination Guard · 2-layer)
- `lib/handoff.ts` — shouldHandoff (keyword) + notifyAdmin (push to group)
- `lib/flex-cards.ts` — Flex Message builders
- `lib/log.ts` — structured JSON logging (Vercel-friendly)

## Env vars

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `GEMINI_API_KEY`
- `SHEET_CSV_URL`
- `ADMIN_GROUP_ID` (Smart Handoff · optional)

## SDK notes (v8+)

- ไม่มี `Client` หรือ `validateSignature` export ตรงๆ — ใช้ `line.messagingApi.MessagingApiClient`
- Event types อยู่ใต้ `line.webhook.*` (เช่น `line.webhook.Event`, `line.webhook.MessageEvent`)
- `replyMessage` signature ใหม่: `{ replyToken, messages: [...] }`
- `pushMessage` signature ใหม่: `{ to, messages: [...] }`
- Signature verify ทำเอง ด้วย `crypto.createHmac("sha256", secret).update(body).digest("base64")`

## Don'ts

- ❌ Hardcode token/key — ใช้ `process.env` เท่านั้น
- ❌ ข้าม signature verification
- ❌ ไม่มี timeout บน Gemini — webhook ต้องตอบภายใน 10s (เรา race กับ 8s)
- ❌ Cache FAQ เกิน 60s — เจ้าของแก้ Sheet ต้องเห็นผลเร็ว
- ❌ Log เนื้อหาข้อความลูกค้า — log แค่ metadata (userId, latencyMs)
