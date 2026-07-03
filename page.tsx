"use client"

import { useEffect, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { TopBar } from "@/components/vela/topbar"
import { DocumentSidebar } from "@/components/vela/document-sidebar"
import { DocumentEditor } from "@/components/vela/document-editor"
import { AgentChat } from "@/components/vela/agent-chat"
import { SettingsDialog } from "@/components/vela/settings-dialog"
import { useVela } from "@/lib/store"

export default function Home() {
  const { getActiveDocument, updateDocumentContent } = useVela()
  const doc = getActiveDocument()
  const [rightMode, setRightMode] = useState<"agent" | "outline">("agent")

  // Make sure there's an active doc on first mount
  useEffect(() => {
    const state = useVela.getState()
    if (!state.activeDocId && state.documents[0]) {
      state.selectDocument(state.documents[0].id)
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar rightMode={rightMode} onRightModeChange={setRightMode} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel defaultSize={18} minSize={14} maxSize={28}>
          <DocumentSidebar />
        </ResizablePanel>

        <ResizableHandle />

        {/* Editor */}
        <ResizablePanel defaultSize={56} minSize={30}>
          <div className="flex h-full flex-col bg-muted/30">
            <div className="flex-1 overflow-hidden p-4">
              {doc ? (
                <DocumentEditor
                  key={doc.id}
                  value={doc.content}
                  onChange={(md) => updateDocumentContent(doc.id, md)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No document selected.
                </div>
              )}
            </div>
            {doc && (
              <div className="flex items-center justify-between border-t bg-background px-4 py-1.5 text-[11px] text-muted-foreground">
                <span>
                  {doc.content.split(/\s+/).filter(Boolean).length} words ·{" "}
                  {doc.content.length} chars
                </span>
                <span>
                  Last updated{" "}
                  {new Date(doc.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Agent panel */}
        <ResizablePanel defaultSize={26} minSize={20} maxSize={45}>
          <AgentChat />
        </ResizablePanel>
      </ResizablePanelGroup>

      <SettingsDialog />
    </div>
  )
}
