"use client";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "neutral";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  const confirmClassName = tone === "danger"
    ? "border-rose-300 bg-rose-600 text-white"
    : tone === "warning"
      ? "border-amber-300 bg-amber-500 text-white"
      : "border-[var(--color-sidebar-accent)] bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,20,10,0.48)] px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
          Confirmation Required
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{message}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLoading}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium disabled:opacity-70 ${confirmClassName}`}
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-70"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
