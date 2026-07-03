"use client"

import { useState } from "react"
import { useVela } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { Plus, FileText, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function DocumentSidebar() {
  const {
    documents,
    activeDocId,
    createDocument,
    selectDocument,
    deleteDocument,
    renameDocument,
  } = useVela()

  const [query, setQuery] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  )

  const startRename = (id: string, current: string) => {
    setRenamingId(id)
    setRenameValue(current)
  }

  const commitRename = () => {
    if (renamingId) {
      const t = renameValue.trim() || "Untitled document"
      renameDocument(renamingId, t)
    }
    setRenamingId(null)
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => createDocument()}
          aria-label="New document"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No documents
          </div>
        ) : (
          filtered.map((d) => {
            const isActive = d.id === activeDocId
            const isRenaming = renamingId === d.id
            return (
              <ContextMenu key={d.id}>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={() => selectDocument(d.id)}
                    className={cn(
                      "group mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60"
                    )}
                  >
                    <FileText
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    {isRenaming ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename()
                          if (e.key === "Escape") setRenamingId(null)
                        }}
                        className="h-6 px-1 py-0 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 truncate">{d.title}</span>
                    )}
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => startRename(d.id, d.title)}
                  >
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (documents.length === 1) return
                      if (confirm(`Delete "${d.title}"?`)) {
                        deleteDocument(d.id)
                      }
                    }}
                    disabled={documents.length === 1}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
        {documents.length} document{documents.length !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
