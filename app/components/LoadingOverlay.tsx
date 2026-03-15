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
      <div className={`w-[min(92vw,22rem)] rounded-[22px] border border-[var(--color-border-strong)] bg-white/88 px-4 py-4 text-center shadow-[var(--shadow-soft)] sm:rounded-[24px] sm:px-6 sm:py-5 ${panelClassName}`.trim()}>
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)] sm:h-10 sm:w-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent sm:h-5 sm:w-5" />
        </div>
        <p className="mt-2.5 text-sm font-semibold text-[var(--color-ink)] sm:mt-3">
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)] sm:text-xs">
          {message}
        </p>
      </div>
    </div>
  );
}
