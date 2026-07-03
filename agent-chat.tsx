"use client"

import { useEffect, useRef, useState } from "react"
import { useVela } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Bot,
  CheckCircle2,
  XCircle,
  Settings as SettingsIcon,
  Send,
  Square,
  Trash2,
  Wrench,
  User as UserIcon,
} from "lucide-react"
import { runAgentLoopV2 } from "@/lib/agent"
import type { AgentToolName, ChatMessage } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const TOOL_LABELS: Record<AgentToolName, string> = {
  set_title: "Rename",
  write_document: "Replace document",
  append_content: "Append content",
  insert_table: "Insert table",
  clear_document: "Clear document",
  get_document: "Read document",
}

const EMPTY_ARRAY: ChatMessage[] = []

export function AgentChat() {
  const {
    getActiveDocument,
    appendMessage,
    clearChat,
    settings,
    isAgentBusy,
    setAgentBusy,
    setSettingsOpen,
    executeTool,
    isSettingsOpen,
  } = useVela()
  const [input, setInput] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const doc = getActiveDocument()
  const docId = doc?.id ?? null
  const messages = useVela((s) =>
    docId ? (s.chats[docId] ?? EMPTY_ARRAY) : EMPTY_ARRAY
  )

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, isAgentBusy])

  const hasKey = !!settings.openRouterApiKey.trim()
  const hasModel = !!settings.modelId.trim()

  const send = async () => {
    if (!doc) return
    const text = input.trim()
    if (!text || isAgentBusy) return

    if (!hasKey || !hasModel) {
      setSettingsOpen(true)
      toast({
        title: "Configure the agent first",
        description: "Add your OpenRouter API key and pick a model.",
        variant: "destructive",
      })
      return
    }

    // Push user message
    appendMessage(doc.id, {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    })
    setInput("")

    const history = useVela.getState().chats[doc.id] ?? []
    const controller = new AbortController()
    abortRef.current = controller
    setAgentBusy(true)

    try {
      const result = await runAgentLoopV2({
        settings,
        doc: useVela.getState().getActiveDocument()!,
        history,
        userMessage: text,
        signal: controller.signal,
        executeTool: async (call) => {
          const r = await useVela
            .getState()
            .executeTool(doc.id, {
              id: call.id,
              name: call.name,
              args: call.args,
            })
          // Make sure the active document reference is fresh for subsequent
          // tools in the same turn.
          return r
        },
        onMessage: (msg) => {
          appendMessage(doc.id, msg)
        },
      })

      if (!result.finalText && result.toolCallsCount === 0) {
        appendMessage(doc.id, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "_(no response)_",
          createdAt: Date.now(),
        })
      }
    } catch (err) {
      const msg = (err as Error).message
      appendMessage(doc.id, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `**Error:** ${msg}`,
        createdAt: Date.now(),
      })
      toast({
        title: "Agent error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setAgentBusy(false)
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    setAgentBusy(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Agent</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {hasKey && hasModel
                ? `${settings.modelId}`
                : "Not configured"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Agent settings"
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Agent settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (doc) clearChat(doc.id)
                  }}
                  disabled={isAgentBusy || messages.length === 0}
                  aria-label="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 ? (
          <EmptyState
            hasKey={hasKey}
            hasModel={hasModel}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} msg={m} />)
        )}
        {isAgentBusy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"></span>
            </div>
            <span>Agent is working…</span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            hasKey && hasModel
              ? "Ask the agent to write, rewrite, or insert a table…"
              : "Open Settings (gear icon) to add your OpenRouter key…"
          }
          rows={3}
          className="mb-2 resize-none text-sm"
          disabled={isAgentBusy}
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </span>
          {isAgentBusy ? (
            <Button size="sm" variant="outline" onClick={cancel}>
              <Square className="h-3.5 w-3.5" /> Stop
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => void send()}
              disabled={!input.trim()}
            >
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  hasKey,
  hasModel,
  onOpenSettings,
}: {
  hasKey: boolean
  hasModel: boolean
  onOpenSettings: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Bot className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-medium">Vela Agent</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask the agent to write, rewrite, summarize, or insert tables into
          your document. The agent edits the doc for you.
        </p>
      </div>
      {(!hasKey || !hasModel) && (
        <Button size="sm" variant="outline" onClick={onOpenSettings}>
          <SettingsIcon className="h-3.5 w-3.5" /> Configure agent
        </Button>
      )}
      <div className="mt-2 grid gap-1 text-left text-[11px] text-muted-foreground">
        <span>· &quot;Write a product brief for a smart water bottle&quot;</span>
        <span>· &quot;Insert a 3x4 table of coffee blends&quot;</span>
        <span>· &quot;Rewrite the whole doc in a formal tone&quot;</span>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "tool") {
    return (
      <div className="ml-7 space-y-1 border-l-2 border-primary/40 pl-3">
        {msg.toolCalls?.map((tc) => (
          <div
            key={tc.id}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Wrench className="h-3 w-3" />
            <span className="font-mono">{TOOL_LABELS[tc.name] ?? tc.name}</span>
            <ArgsPreview args={tc.args} />
          </div>
        ))}
        {msg.toolResults?.map((r) => {
          const ok = r.ok
          return (
            <div
              key={r.toolCallId}
              className="flex items-start gap-1.5 text-[11px]"
            >
              {ok ? (
                <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-3 w-3 text-destructive" />
              )}
              <span
                className={
                  ok ? "text-muted-foreground" : "text-destructive"
                }
              >
                {r.message}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const isUser = msg.role === "user"
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          isUser
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {msg.content ? (
          <MarkdownLite text={msg.content} />
        ) : msg.toolCalls?.length ? (
          <span className="text-muted-foreground italic">
            calling {msg.toolCalls.length} tool
            {msg.toolCalls.length > 1 ? "s" : ""}…
          </span>
        ) : null}
      </div>
    </div>
  )
}

function ArgsPreview({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args ?? {})
  if (!entries.length) return null
  const preview = entries
    .map(([k, v]) => {
      const s = typeof v === "string" ? v : JSON.stringify(v)
      const short = s.length > 60 ? s.slice(0, 60) + "…" : s
      return `${k}=${short}`
    })
    .join(", ")
  return <span className="font-mono text-[10px] opacity-70">({preview})</span>
}

/** Tiny inline markdown renderer (bold, italic, code, line breaks). */
function MarkdownLite({ text }: { text: string }) {
  // Split by lines for paragraph spacing
  const lines = text.split(/\n/)
  return (
    <div className="space-y-1 [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]">
      {lines.map((line, i) => (
        <p key={i} className="leading-relaxed whitespace-pre-wrap">
          {renderInline(line)}
        </p>
      ))}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code`, [text](url)
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith("[")) {
      const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
      if (m) {
        parts.push(
          <a key={key++} href={m[2]} target="_blank" rel="noreferrer">
            {m[1]}
          </a>
        )
      } else {
        parts.push(token)
      }
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>)
    }
    lastIndex = match.index + token.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}
