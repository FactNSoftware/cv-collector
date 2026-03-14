"use client";

import { ChangeEvent, useEffect, useRef } from "react";
import { ImagePlus, List, ListOrdered, Pilcrow, Quote, Type } from "lucide-react";

type JobDescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  disabled?: boolean;
};

const TOOLBAR_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-brand-strong)] hover:bg-[var(--color-panel-strong)]";

export function JobDescriptionEditor({
  value,
  onChange,
  onUploadImage,
  disabled = false,
}: JobDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || editor.innerHTML === value) {
      return;
    }

    editor.innerHTML = value;
  }, [value]);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const uploadedUrl = await onUploadImage(file);

    if (uploadedUrl) {
      runCommand("insertHTML", `<p><img src="${uploadedUrl}" alt="" /></p>`);
    }

    event.target.value = "";
  };

  return (
    <div className="rounded-[26px] border border-[var(--color-border-strong)] bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("bold")} disabled={disabled}>
          <Type className="mr-2 h-4 w-4" />
          Bold
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("formatBlock", "<p>")} disabled={disabled}>
          <Pilcrow className="mr-2 h-4 w-4" />
          Paragraph
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("insertUnorderedList")} disabled={disabled}>
          <List className="mr-2 h-4 w-4" />
          Bullets
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("insertOrderedList")} disabled={disabled}>
          <ListOrdered className="mr-2 h-4 w-4" />
          Numbered
        </button>
        <button type="button" className={TOOLBAR_BUTTON_CLASS} onClick={() => runCommand("formatBlock", "<blockquote>")} disabled={disabled}>
          <Quote className="mr-2 h-4 w-4" />
          Quote
        </button>
        <button
          type="button"
          className={TOOLBAR_BUTTON_CLASS}
          onClick={() => imageInputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Upload Image
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelection}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        className="job-description-editor min-h-[280px] px-5 py-4 text-[15px] leading-7 text-[var(--color-ink)] outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-brand-strong)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-4 [&_img]:max-h-[380px] [&_img]:rounded-2xl [&_img]:object-cover [&_img]:shadow-md [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
      />

      <div className="border-t border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-muted)]">
        Write the description the way candidates should read it. Images are uploaded first and inserted directly into the content.
      </div>
    </div>
  );
}
