"use client";

type LoadingPanelProps = {
  title: string;
  message?: string;
  className?: string;
};

export function LoadingPanel({
  title,
  message = "Preparing content...",
  className = "",
}: LoadingPanelProps) {
  return (
    <div className={`flex items-center justify-center bg-[var(--color-panel)] ${className}`}>
      <div className="mx-auto max-w-md rounded-[28px] border border-[var(--color-border-strong)] bg-white/90 px-8 py-10 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
          Loading
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{message}</p>
      </div>
    </div>
  );
}
