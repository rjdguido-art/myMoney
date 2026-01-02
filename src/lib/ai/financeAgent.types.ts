export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = { role: ChatRole; content: string };

export type AgentRequest = {
  userId: string;
  messages: ChatMessage[];
  locale?: string;
  timezone?: string;
};

export type AgentResponse = { message: string };
