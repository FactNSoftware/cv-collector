"use client";

type LoadingOverlayProps = {
  title: string;
  message?: string;
  fixed?: boolean;
  containerClassName?: string;
  panelClassName?: string;
};

export function LoadingOverlay({
  title,
  message = "Please wait a moment.",
  fixed = true,
  containerClassName = "",
  panelClassName = "",
}: LoadingOverlayProps) {
  const containerClasses = fixed
    ? "fixed inset-0 z-50 flex items-center justify-center bg-[rgba(232,239,232,0.14)] backdrop-blur-[3px]"
    : "absolute inset-0 z-10 flex items-center justify-center bg-[rgba(232,239,232,0.14)] backdrop-blur-[3px]";

  return (
    <div className={`${containerClasses} ${containerClassName}`.trim()}>
      <div className={`rounded-[24px] border border-[var(--color-border-strong)] bg-white/88 px-6 py-5 text-center shadow-[var(--shadow-soft)] ${panelClassName}`.trim()}>
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
        <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
          {title}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {message}
        </p>
      </div>
    </div>
  );
}
