import type {
  AgentToolName,
  ChatMessage,
  VelaDocument,
  VelaSettings,
} from "./types"

/**
 * OpenRouter Chat Completions types (subset).
 * Reference: https://openrouter.ai/docs
 */
interface ORTool {
  type: "function"
  function: {
    name: AgentToolName
    description: string
    parameters: Record<string, unknown>
  }
}

interface ORToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

interface ORMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: Omit<ORToolCall, "id">[] & { id?: string }[]
  tool_call_id?: string
  name?: string
}

interface ORChoice {
  message: {
    role: "assistant"
    content: string | null
    tool_calls?: ORToolCall[]
  }
  finish_reason: string
}

interface ORResponse {
  choices: ORChoice[]
  error?: { message: string; code?: number }
}

export const VELA_TOOLS: ORTool[] = [
  {
    type: "function",
    function: {
      name: "set_title",
      description:
        "Set the document title (the name shown in the document list and the H1 is NOT updated — only the sidebar title).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "New document title" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_document",
      description:
        "REPLACE the entire document body with the provided Markdown content. Use this when the user asks to rewrite the whole thing, draft a fresh document, or replace existing content. Markdown supports # H1/H2/H3, **bold**, *italic*, > blockquote, - lists, 1. numbered lists, `code`, [links](url), and | tables |.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Full Markdown content of the new document body",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_content",
      description:
        "APPEND Markdown content to the END of the document without modifying what's already there. Use for adding paragraphs, sections, or lists after the existing content.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Markdown content to append",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "insert_table",
      description:
        "Insert a Markdown table at the end of the document. Provide either (rows, cols) for an empty table, or (cols + headers + data) for a pre-filled table. data is a 2D array of strings (rows x cols).",
      parameters: {
        type: "object",
        properties: {
          rows: {
            type: "integer",
            description: "Total number of rows including header row",
          },
          cols: { type: "integer", description: "Number of columns" },
          headers: {
            type: "array",
            items: { type: "string" },
            description: "Header labels (length should equal cols)",
          },
          data: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
            },
            description: "Body rows (each row is an array of cell strings)",
          },
        },
        required: ["rows", "cols"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_document",
      description: "Erase all content from the document body (title is kept).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_document",
      description:
        "Read the current document title and content. Use this BEFORE rewriting if you need to know what's currently in the doc, or when the user asks 'what's in my doc'.",
      parameters: { type: "object", properties: {} },
    },
  },
]

export const DEFAULT_SYSTEM_PROMPT = `You are Vela — an AI document agent embedded inside the Vela word processor.

Your job is to help the user WRITE and EDIT their documents. You can ONLY modify the document by calling the provided tools. You cannot ask the user to click buttons or type — if they want something done to the document, YOU do it via tools.

Available tools (Markdown is the document format):
- set_title(title): rename the document in the sidebar
- write_document(content): REPLACE the entire document body with the given Markdown
- append_content(content): APPEND Markdown at the end of the current document
- insert_table(rows, cols, headers?, data?): insert a Markdown table at the end of the document
- clear_document(): erase the document body
- get_document(): read the current document (title + content)

Rules:
1. Always call a tool when the user asks for a document change. Do not just describe what you would do — DO it.
2. When the user asks to "rewrite" the document, first call get_document if you don't already know the content, then call write_document with the full rewritten Markdown.
3. When inserting a table, prefer providing headers and data so the user gets a filled table, not an empty grid.
4. Keep your prose short. After calling tools, write ONE or TWO sentences summarizing what you did.
5. The document content is Markdown. Use proper Markdown: # / ## / ### for headings, **bold**, *italic*, > blockquotes, - bullet lists, 1. numbered lists, and | tables | for tables.
6. Never invent document state. If you need to know the current content, call get_document first.
7. If the user asks something unrelated to the document (e.g. trivia), it's OK to answer briefly without calling a tool, but nudge them back to writing tasks.`

interface AgentLoopOptions {
  settings: VelaSettings
  doc: VelaDocument
  history: ChatMessage[]
  userMessage: string
  /** Called for each new message (assistant text, tool calls, tool results) */
  onMessage: (msg: ChatMessage) => void
  /** Called for each assistant chunk (for streaming feel) */
  onAssistantText?: (text: string) => void
  /** Abort signal */
  signal?: AbortSignal
}

interface AgentLoopResult {
  finalText: string
  toolCallsCount: number
}

/**
 * Run the agent loop. Calls OpenRouter with tool support, executes tools
 * locally, feeds results back, and repeats until the assistant answers
 * without a tool call.
 */
export async function runAgentLoop(
  opts: AgentLoopOptions
): Promise<AgentLoopResult> {
  const { settings, doc, history, userMessage, onMessage, signal } = opts

  if (!settings.openRouterApiKey.trim()) {
    throw new Error(
      "No OpenRouter API key set. Click the gear icon in the Agent panel to add one."
    )
  }
  if (!settings.modelId.trim()) {
    throw new Error(
      "No model ID set. Open the gear icon in the Agent panel to pick a model."
    )
  }

  const systemPrompt =
    settings.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT

  // Build OpenRouter messages: system, prior history, current user
  const messages: ORMessage[] = [{ role: "system", content: systemPrompt }]

  // Include a hint about the current doc state
  messages.push({
    role: "system",
    content: `Current document title: ${doc.title}\nCurrent document content (Markdown):\n"""\n${doc.content}\n"""`,
  })

  for (const m of history) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content })
    } else if (m.role === "assistant") {
      if (m.toolCalls && m.toolCalls.length) {
        messages.push({
          role: "assistant",
          content: m.content || "",
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args ?? {}),
            },
          })) as never,
        })
      } else {
        messages.push({ role: "assistant", content: m.content })
      }
    } else if (m.role === "tool" && m.toolResults) {
      for (const r of m.toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: r.toolCallId,
          content: r.message,
        })
      }
    }
  }

  // Add the new user message
  messages.push({ role: "user", content: userMessage })

  let totalToolCalls = 0
  let finalText = ""
  const MAX_ITERATIONS = 8

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (signal?.aborted) throw new Error("Agent cancelled")

    const body = {
      model: settings.modelId,
      messages,
      tools: VELA_TOOLS,
      tool_choice: "auto",
      temperature: settings.temperature,
      // Limit tool fan-out
      max_tokens: 2048,
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openRouterApiKey}`,
        "HTTP-Referer": "https://vela.app",
        "X-Title": "Vela Word Processor",
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      let errText = `OpenRouter error ${res.status}`
      try {
        const j = (await res.json()) as ORResponse
        if (j.error?.message) errText = j.error.message
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(errText)
    }

    const data = (await res.json()) as ORResponse
    const choice = data.choices?.[0]
    if (!choice) throw new Error("OpenRouter returned no choices")

    const assistantText = choice.message.content ?? ""
    const toolCalls = choice.message.tool_calls ?? []

    // Push assistant message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantText,
      toolCalls: toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.function.name as AgentToolName,
        args: safeParseArgs(tc.function.arguments),
      })),
      createdAt: Date.now(),
    }
    onMessage(assistantMsg)
    if (assistantText) finalText = assistantText
    if (opts.onAssistantText && assistantText) opts.onAssistantText(assistantText)

    // No tool calls → done
    if (!toolCalls.length) {
      return { finalText, toolCallsCount: totalToolCalls }
    }

    // Execute each tool and collect results
    const toolResults: ChatMessage["toolResults"] = []
    for (const tc of toolCalls) {
      totalToolCalls += 1
      const call = {
        id: tc.id,
        name: tc.function.name as AgentToolName,
        args: safeParseArgs(tc.function.arguments),
      }
      // We push the tool result to the store via onMessage callback below.
      // We just need the result string here for the next iteration.
      toolResults.push({
        toolCallId: tc.id,
        ok: true,
        message: "__pending__",
      })
    }

    // Push a tool message (placeholder; the actual execution will be
    // done by the store, but for the loop we need the results back).
    onMessage({
      id: crypto.randomUUID(),
      role: "tool",
      content: "",
      toolCalls: assistantMsg.toolCalls,
      toolResults,
      createdAt: Date.now(),
    })

    // We need the actual tool results to feed back. The caller of this
    // function is responsible for executing tools. So we return control
    // to the caller here and expect them to call us again with updated
    // history. BUT to keep this self-contained, we'll execute tools
    // via a callback passed in by the caller.

    // Actually, simpler: we'll execute tools here via the callback.
    // Re-architect: caller passes `executeTool`.
    throw new Error(
      "Internal: tool execution requires the caller-provided executor. Use runAgentLoopWithExecutor instead."
    )
  }

  return { finalText, toolCallsCount: totalToolCalls }
}

function safeParseArgs(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Cleaner agent loop that uses a tool executor callback.
 * This is the one actually used by the UI.
 */
export async function runAgentLoopV2(
  opts: {
    settings: VelaSettings
    doc: VelaDocument
    history: ChatMessage[]
    userMessage: string
    onMessage: (msg: ChatMessage) => void
    executeTool: (
      call: { id: string; name: AgentToolName; args: Record<string, unknown> }
    ) => Promise<{ ok: boolean; message: string }>
    signal?: AbortSignal
  }
): Promise<{ finalText: string; toolCallsCount: number }> {
  const { settings, doc, history, userMessage, onMessage, executeTool, signal } =
    opts

  if (!settings.openRouterApiKey.trim()) {
    throw new Error(
      "No OpenRouter API key set. Click the gear icon in the Agent panel to add one."
    )
  }
  if (!settings.modelId.trim()) {
    throw new Error(
      "No model ID set. Open the gear icon in the Agent panel to pick a model."
    )
  }

  const systemPrompt =
    settings.systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT

  const messages: ORMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `Current document title: ${doc.title}\nCurrent document content (Markdown):\n"""\n${doc.content}\n"""`,
    },
  ]

  // Replay history
  for (const m of history) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content })
    } else if (m.role === "assistant") {
      if (m.toolCalls && m.toolCalls.length) {
        messages.push({
          role: "assistant",
          content: m.content || "",
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.args ?? {}),
            },
          })) as never,
        })
      } else {
        messages.push({ role: "assistant", content: m.content })
      }
    } else if (m.role === "tool" && m.toolResults) {
      for (const r of m.toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: r.toolCallId,
          content: r.message,
        })
      }
    }
  }

  messages.push({ role: "user", content: userMessage })

  let totalToolCalls = 0
  let finalText = ""
  const MAX_ITERATIONS = 8

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (signal?.aborted) throw new Error("Agent cancelled")

    const body = {
      model: settings.modelId,
      messages,
      tools: VELA_TOOLS,
      tool_choice: "auto",
      temperature: settings.temperature,
      max_tokens: 2048,
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openRouterApiKey}`,
        "HTTP-Referer": "https://vela.app",
        "X-Title": "Vela Word Processor",
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      let errText = `OpenRouter error ${res.status}`
      try {
        const j = (await res.json()) as ORResponse
        if (j.error?.message) errText = j.error.message
      } catch {
        // ignore
      }
      throw new Error(errText)
    }

    const data = (await res.json()) as ORResponse
    const choice = data.choices?.[0]
    if (!choice) throw new Error("OpenRouter returned no choices")

    const assistantText = choice.message.content ?? ""
    const toolCalls = choice.message.tool_calls ?? []

    const parsedCalls = toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name as AgentToolName,
      args: safeParseArgs(tc.function.arguments),
    }))

    // Emit assistant message
    onMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantText,
      toolCalls: parsedCalls,
      createdAt: Date.now(),
    })
    if (assistantText) finalText = assistantText

    // No tool calls → done
    if (!parsedCalls.length) {
      return { finalText, toolCallsCount: totalToolCalls }
    }

    // Execute tools, collect results
    const toolResults: NonNullable<ChatMessage["toolResults"]> = []
    for (const call of parsedCalls) {
      totalToolCalls += 1
      const result = await executeTool(call)
      toolResults.push({
        toolCallId: call.id,
        ok: result.ok,
        message: result.message,
      })
    }

    // Emit tool message
    onMessage({
      id: crypto.randomUUID(),
      role: "tool",
      content: "",
      toolCalls: parsedCalls,
      toolResults,
      createdAt: Date.now(),
    })

    // Feed tool results back into the conversation for next iteration
    messages.push({
      role: "assistant",
      content: assistantText || "",
      tool_calls: parsedCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args ?? {}),
        },
      })) as never,
    })
    for (const r of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: r.toolCallId,
        content: r.message,
      })
    }
  }

  return { finalText, toolCallsCount: totalToolCalls }
}
