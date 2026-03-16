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
  const selectionRangeRef = useRef<Range | null>(null);

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

  const syncHtml = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const captureSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    selectionRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = selectionRangeRef.current;

    if (!selection || !range) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const insertImageAtSelection = (uploadedUrl: string) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    focusEditor();
    const restored = restoreSelection();

    if (restored) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (range) {
        range.deleteContents();
        const paragraph = document.createElement("p");
        const image = document.createElement("img");
        image.src = uploadedUrl;
        image.alt = "";
        paragraph.appendChild(image);
        range.insertNode(paragraph);
        range.setStartAfter(paragraph);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        selectionRangeRef.current = range.cloneRange();
        syncHtml();
        return;
      }
    }

    editor.insertAdjacentHTML("beforeend", `<p><img src="${uploadedUrl}" alt="" /></p>`);
    syncHtml();
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    captureSelection();
    syncHtml();
  };

  const handleInput = () => {
    captureSelection();
    syncHtml();
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const uploadedUrl = await onUploadImage(file);

    if (uploadedUrl) {
      insertImageAtSelection(uploadedUrl);
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
        onBlur={captureSelection}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        className="job-description-editor min-h-[280px] px-5 py-4 text-[15px] leading-7 text-[var(--color-ink)] outline-none [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-brand-strong)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:max-h-[380px] [&_img]:max-w-full [&_img]:rounded-2xl [&_img]:object-contain [&_img]:shadow-md [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
      />

      <div className="border-t border-[var(--color-border)] px-5 py-3 text-xs text-[var(--color-muted)]">
        Write the description the way candidates should read it. Images are uploaded first and inserted directly into the content.
      </div>
    </div>
  );
}
