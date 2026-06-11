# PRD · LINE Bot ป้าเมย์

## Goal

ร้านอาหารตามสั่ง "ป้าเมย์" ต้องการตอบลูกค้า LINE OA 24 ชม. โดยไม่ต้องจ้างแอดมิน
กะดึก · บอท AI ตอบเองด้วย FAQ ที่เจ้าของแก้ใน Google Sheet ได้ทันที

## Users

- **ลูกค้า** — ทักเข้า LINE OA · ถามเรื่องเมนู ราคา เวลา ที่ตั้ง
- **เจ้าของ (ป้าเมย์)** — แก้ Google Sheet จากมือถือเมื่อมีเมนูใหม่หรือเปลี่ยนราคา
- **แอดมิน** (optional) — รับ notification เมื่อลูกค้า trigger Smart Handoff

## Acceptance criteria

1. ลูกค้าทักข้อความ → บอทตอบภายใน 5 วินาที (ภาษาธรรมชาติ ตรง FAQ)
2. ลูกค้าถามเรื่องไม่อยู่ใน FAQ → ตอบ default reply (ไม่แต่งข้อมูล)
3. ลูกค้าถามด้วย paraphrase/synonym → บอทเข้าใจและตอบจาก FAQ
4. ลูกค้า trigger handoff (ขอแอดมิน / ร้องเรียน / ขายส่ง) → แจ้งกลุ่ม LINE
5. Sheet ดึงไม่ได้ชั่วคราว → fallback ตอบ default · ไม่ crash
6. Gemini timeout → fallback ตอบ default ภายใน 10s

## Bot identity

- ชื่อ: ป้าเมย์
- ร้าน: ร้านอาหารตามสั่ง ป้าเมย์
- โทน: เป็นกันเอง อบอุ่น สนุกสนาน · ลงท้ายด้วย "ค่ะ"
- default reply: "ขอโทษนะคะ เรื่องนี้ป้าตอบไม่ได้เลยค่ะ ลองโทรหาร้านโดยตรงได้เลยนะคะ 📞"

## Google Sheet schema

| คอลัมน์ | Header | ตัวอย่าง |
|---|---|---|
| A | question | เปิดกี่โมง |
| B | answer | เปิด 10 โมงเช้า ถึง 3 ทุ่มค่ะ |
| C | tags | เวลา, ร้าน |

## Non-goals (รอบแรก)

- ❌ Multi-LINE OA
- ❌ Voice input
- ❌ Order checkout / ชำระเงินในแชท
- ❌ Multi-language (ไทยเท่านั้น)
