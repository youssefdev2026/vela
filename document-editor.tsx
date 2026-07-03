"use client"

import { useEffect, useRef } from "react"
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  tablePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  UndoRedo,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  linkPlugin,
  InsertCodeBlock,
} from "@mdxeditor/editor"
import "@mdxeditor/editor/style.css"

interface DocumentEditorProps {
  value: string
  onChange: (markdown: string) => void
  readOnly?: boolean
}

export function DocumentEditor({
  value,
  onChange,
  readOnly = false,
}: DocumentEditorProps) {
  const ref = useRef<MDXEditorMethods>(null)

  // Sync external value into the editor when it changes from outside
  // (e.g. agent replaced the whole document).
  useEffect(() => {
    if (ref.current && value !== ref.current.getMarkdown()) {
      ref.current.setMarkdown(value)
    }
  }, [value])

  return (
    <div className="vela-editor-wrap flex h-full flex-col overflow-hidden rounded-lg border bg-white">
      <MDXEditor
        ref={ref}
        markdown={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder="Start writing, or ask the Vela agent to write for you…"
        className="vela-mdx flex-1 overflow-hidden"
        contentEditableClassName="prose prose-sm sm:prose-base max-w-none focus:outline-none px-8 py-6 min-h-full"
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          linkPlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          codeBlockPlugin(),
          codeMirrorPlugin({
            codeBlockLanguages: {
              js: "JavaScript",
              ts: "TypeScript",
              text: "Plain text",
              bash: "Bash",
              json: "JSON",
            },
          }),
          tablePlugin(),
          diffSourcePlugin(),
          toolbarPlugin({
            toolbarContents: () => (
              <div className="flex flex-wrap items-center gap-1">
                <UndoRedo />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles />
                <CreateLink />
                <InsertCodeBlock />
                <InsertTable />
                <InsertThematicBreak />
                <ListsToggle />
              </div>
            ),
          }),
        ]}
      />
    </div>
  )
}
