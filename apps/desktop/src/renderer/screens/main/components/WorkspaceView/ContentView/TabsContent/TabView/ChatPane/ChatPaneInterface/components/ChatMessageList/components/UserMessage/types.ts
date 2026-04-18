import type { UseChatDisplayReturn } from "@spectralset/chat/client";

export type ChatMessage = NonNullable<UseChatDisplayReturn["messages"]>[number];

export type ChatMessagePart = ChatMessage["content"][number];
