import DOMPurify from "dompurify";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
} from "lucide-react";

const ToolbarButton = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition-colors ${
      active
        ? "bg-cyan-500/20 text-cyan-300"
        : "text-gray-400 hover:text-white hover:bg-white/10"
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px h-5 bg-white/10 mx-1" />
);

const RichTextEditor = ({ content, onChange, placeholder = "Write description...", minHeight = "150px" }) => {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-cyan-400 hover:text-cyan-300 underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      const html = DOMPurify.sanitize(editor.getHTML());
      onChange?.(html);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(DOMPurify.sanitize(content || ""), false);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden focus-within:border-cyan-500/50 transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.02]">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title={t("richTextEditor.bold")}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title={t("richTextEditor.italic")}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title={t("richTextEditor.underline")}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title={t("richTextEditor.strikethrough")}>
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title={t("richTextEditor.heading1")}>
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title={t("richTextEditor.heading2")}>
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title={t("richTextEditor.bulletList")}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title={t("richTextEditor.orderedList")}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title={t("richTextEditor.blockquote")}>
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title={t("richTextEditor.inlineCode")}>
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title={t("richTextEditor.alignLeft")}>
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title={t("richTextEditor.alignCenter")}>
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title={t("richTextEditor.alignRight")}>
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={addLink} active={editor.isActive("link")} title={t("richTextEditor.insertLink")}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title={t("richTextEditor.insertImage")}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title={t("richTextEditor.horizontalRule")}>
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title={t("richTextEditor.undo")}>
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title={t("richTextEditor.redo")}>
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="px-4 py-3 text-white" style={{ minHeight }}>
        <EditorContent editor={editor} className="prose prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:text-gray-300 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-500 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_ul]:text-gray-300 [&_.ProseMirror_ol]:text-gray-300 [&_.ProseMirror_h1]:text-white [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h3]:text-white [&_.ProseMirror_blockquote]:text-gray-400 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-cyan-500/50 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_code]:bg-white/10 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg" />
      </div>

      <div className="px-4 py-1 border-t border-white/10 bg-white/[0.02]">
        <p className="text-[10px] text-gray-500">{t("richTextEditor.footerText")}</p>
      </div>
    </div>
  );
};

export default RichTextEditor;
