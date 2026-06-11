import * as line from "@line/bot-sdk";
import { log } from "@/lib/log";

const HANDOFF_TRIGGERS = [
  "คุยกับคน",
  "ขอแอดมิน",
  "ขอเจ้าของ",
  "ขอป้าเมย์",
  "ฟ้อง",
  "ร้องเรียน",
  "ไม่พอใจ",
  "ขายส่ง",
  "wholesale",
  "อยากซื้อจำนวน",
  "franchise",
];

export function shouldHandoff(message: string): boolean {
  const lower = message.toLowerCase();
  return HANDOFF_TRIGGERS.some((trigger) => lower.includes(trigger));
}

export async function notifyAdmin(
  userId: string,
  userMessage: string
): Promise<void> {
  const adminGroupId = process.env.ADMIN_GROUP_ID;
  if (!adminGroupId) {
    log.warn("handoff.no_admin_group");
    return;
  }

  const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  });

  await client.pushMessage({
    to: adminGroupId,
    messages: [
      {
        type: "text",
        text: `🔔 ลูกค้าต้องการคุยกับแอดมิน\n\nUserID: ${userId}\nข้อความ: ${userMessage}\n\nไปคุยที่: https://manager.line.biz/chats`,
      },
    ],
  });
}
