// Core types for Vela

export interface VelaDocument {
  id: string
  title: string
  /** Markdown content of the document body */
  content: string
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  /** Tool calls made by the assistant, if any */
  toolCalls?: AgentToolCall[]
  /** Tool results, if any */
  toolResults?: AgentToolResult[]
  createdAt: number
}

export interface AgentToolCall {
  id: string
  name: AgentToolName
  args: Record<string, unknown>
}

export interface AgentToolResult {
  toolCallId: string
  ok: boolean
  message: string
}

export type AgentToolName =
  | "set_title"
  | "write_document"
  | "append_content"
  | "insert_table"
  | "clear_document"
  | "get_document"

export interface VelaSettings {
  openRouterApiKey: string
  modelId: string
  /** Temperature for the model */
  temperature: number
  /** Optional system prompt override */
  systemPrompt: string
}

export const DEFAULT_SETTINGS: VelaSettings = {
  openRouterApiKey: "",
  modelId: "openai/gpt-4o-mini",
  temperature: 0.4,
  systemPrompt: "",
}

export const DEFAULT_MODEL_OPTIONS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.7-sonnet",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-chat",
  "qwen/qwen-2.5-72b-instruct",
]
