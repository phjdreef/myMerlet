import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className = "",
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t("beginTyping");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: defaultPlaceholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border rounded-md",
      },
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`rounded-lg border ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b bg-gray-50 p-2 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("bold")
              ? "bg-gray-300 font-bold dark:bg-gray-600"
              : ""
          }`}
          title={t("bold")}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("italic")
              ? "bg-gray-300 italic dark:bg-gray-600"
              : ""
          }`}
          title={t("italic")}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("strike")
              ? "bg-gray-300 line-through dark:bg-gray-600"
              : ""
          }`}
          title={t("strikethrough")}
        >
          <s>S</s>
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-300 font-bold dark:bg-gray-600"
              : ""
          }`}
          title={t("heading2")}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-gray-300 font-bold dark:bg-gray-600"
              : ""
          }`}
          title={t("heading3")}
        >
          H3
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("bulletList") ? "bg-gray-300 dark:bg-gray-600" : ""
          }`}
          title="Lijst met opsommingstekens"
        >
          • Lijst
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("orderedList") ? "bg-gray-300 dark:bg-gray-600" : ""
          }`}
          title="Genummerde lijst"
        >
          1. Lijst
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${
            editor.isActive("blockquote") ? "bg-gray-300 dark:bg-gray-600" : ""
          }`}
          title="Citaat"
        >
          " "
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="rounded px-3 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          title={t("horizontalLine")}
        >
          ―
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="rounded px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
          title={t("undo")}
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="rounded px-3 py-1 text-sm hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
          title={t("redo")}
        >
          ↷
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
