"use client"

import { useVela } from "@/lib/store"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  PenLine,
  Settings as SettingsIcon,
  Bot,
  FileText,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

function useIsMounted() {
  const [m, setM] = useState(false)
  useEffect(() => {
    // Defer to next tick to avoid the set-state-in-effect lint
    const id = window.requestAnimationFrame(() => setM(true))
    return () => window.cancelAnimationFrame(id)
  }, [])
  return m
}

interface TopBarProps {
  /** Active right-panel mode: 'agent' | 'outline' */
  rightMode: "agent" | "outline"
  onRightModeChange: (m: "agent" | "outline") => void
}

export function TopBar({ rightMode, onRightModeChange }: TopBarProps) {
  const { getActiveDocument, setSettingsOpen, settings } = useVela()
  const doc = getActiveDocument()
  const { resolvedTheme, setTheme } = useTheme()
  // next-themes needs an isomorphic guard to avoid SSR/CSR mismatch.
  const mounted = useIsMounted()

  const hasKey = !!settings.openRouterApiKey.trim()
  const hasModel = !!settings.modelId.trim()

  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-3">
      {/* Left: brand + active doc title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <PenLine className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Vela</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
            v1
          </span>
        </div>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <FileText className="h-3 w-3" />
          <span className="max-w-[280px] truncate">
            {doc?.title ?? "No document"}
          </span>
        </div>
      </div>

      {/* Right: tools */}
      <div className="flex items-center gap-1">
        {/* Right-panel mode toggle */}
        <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
          <Button
            size="sm"
            variant={rightMode === "agent" ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onRightModeChange("agent")}
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Agent</span>
            {(!hasKey || !hasModel) && rightMode !== "agent" && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
            )}
          </Button>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agent settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {mounted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                  aria-label="Toggle theme"
                >
                  <ThemeIcon theme={resolvedTheme} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  )
}

function ThemeIcon({ theme }: { theme?: string }) {
  if (theme === "dark") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
