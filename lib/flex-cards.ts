import type * as line from "@line/bot-sdk";

export function menuCard(
  items: { name: string; price: number }[]
): line.messagingApi.FlexMessage {
  return {
    type: "flex",
    altText: "เมนูร้านป้าเมย์",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#C0533A",
        contents: [
          {
            type: "text",
            text: "เมนูแนะนำ 🍳",
            weight: "bold",
            size: "xl",
            color: "#FFFFFF",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: items.map((item) => ({
          type: "box" as const,
          layout: "horizontal" as const,
          contents: [
            {
              type: "text" as const,
              text: item.name,
              size: "md" as const,
              flex: 3,
              wrap: true,
            },
            {
              type: "text" as const,
              text: `${item.price} ฿`,
              size: "md" as const,
              align: "end" as const,
              color: "#C0533A",
              weight: "bold" as const,
              flex: 1,
            },
          ],
        })),
      },
    },
  };
}
