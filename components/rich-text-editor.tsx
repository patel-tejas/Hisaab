"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from "lucide-react"
import { Toggle } from "@/components/ui/toggle"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      },
    },
    immediatelyRender: false,
  })

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-xl border bg-muted/50 p-1.5">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className="h-9 w-9 [&_svg]:!size-5"
        >
          <Bold className="size-5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className="h-9 w-9 [&_svg]:!size-5"
        >
          <Italic className="size-5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          className="h-9 w-9 [&_svg]:!size-5"
        >
          <UnderlineIcon className="size-5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className="h-9 w-9 [&_svg]:!size-5"
        >
          <List className="size-5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          className="h-9 w-9 [&_svg]:!size-5"
        >
          <ListOrdered className="size-5" />
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
