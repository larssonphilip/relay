export type Role = "system" | "user" | "assistant";

export type ChatMessage = { role: Role; content: string };

export type GenerateTextParams = {
  model: string;
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
};

export type GenerateTextResult = {
  text: string;
  raw?: unknown;
};

export interface LLMProvider {
  name: string;
  supportsModel(model: string): boolean;
  generateText(params: GenerateTextParams): Promise<GenerateTextResult>;
}
