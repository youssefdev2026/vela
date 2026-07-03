"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVela } from "@/lib/store"
import { DEFAULT_MODEL_OPTIONS } from "@/lib/types"
import { ExternalLink, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SettingsDialog() {
  const { settings, setSettings, isSettingsOpen, setSettingsOpen } = useVela()
  const { toast } = useToast()
  const [showKey, setShowKey] = useState(false)
  const [draft, setDraft] = useState(settings)

  // Resync draft when the dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) setDraft(settings)
    setSettingsOpen(open)
  }

  const save = () => {
    setSettings(draft)
    setSettingsOpen(false)
    toast({
      title: "Settings saved",
      description: `Model: ${draft.modelId || "(not set)"}`,
    })
  }

  return (
    <Dialog open={isSettingsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Agent Settings
          </DialogTitle>
          <DialogDescription>
            Vela talks to any OpenRouter-compatible model. Your API key is
            stored locally in this app and is sent only to OpenRouter.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* API key */}
          <div className="grid gap-2">
            <Label htmlFor="or-key" className="flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              OpenRouter API Key
            </Label>
            <div className="relative">
              <Input
                id="or-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-or-v1-…"
                value={draft.openRouterApiKey}
                onChange={(e) =>
                  setDraft({ ...draft, openRouterApiKey: e.target.value })
                }
                className="pr-10 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get a key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
              >
                openrouter.ai/keys
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Model ID */}
          <div className="grid gap-2">
            <Label htmlFor="model-id">Model ID</Label>
            <div className="flex gap-2">
              <Select
                value={
                  DEFAULT_MODEL_OPTIONS.includes(draft.modelId)
                    ? draft.modelId
                    : "__custom__"
                }
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setDraft({ ...draft, modelId: "" })
                  } else {
                    setDraft({ ...draft, modelId: v })
                  }
                }}
              >
                <SelectTrigger id="model-id" className="w-[260px]">
                  <SelectValue placeholder="Pick a model" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom…</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="e.g. openai/gpt-4o-mini"
                value={draft.modelId}
                onChange={(e) =>
                  setDraft({ ...draft, modelId: e.target.value })
                }
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Type a custom model ID or pick from the list.
            </p>
          </div>

          {/* Temperature */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temp">Temperature</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {draft.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              id="temp"
              min={0}
              max={1.5}
              step={0.05}
              value={[draft.temperature]}
              onValueChange={([v]) => setDraft({ ...draft, temperature: v })}
            />
            <p className="text-xs text-muted-foreground">
              Lower = more deterministic. 0.3–0.6 is good for editing.
            </p>
          </div>

          {/* System prompt override */}
          <div className="grid gap-2">
            <Label htmlFor="sys">Custom system prompt (optional)</Label>
            <Textarea
              id="sys"
              rows={4}
              placeholder="Leave blank to use Vela's default agent prompt."
              value={draft.systemPrompt}
              onChange={(e) =>
                setDraft({ ...draft, systemPrompt: e.target.value })
              }
              className="resize-y text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
