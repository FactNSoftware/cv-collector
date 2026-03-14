"use client";

import { useState } from "react";
import { LoadingOverlay } from "./LoadingOverlay";

type CandidateCvPreviewModalProps = {
  title: string;
  resumeName: string;
  cvUrl: string;
  isOpen: boolean;
  onClose: () => void;
  downloadUrl?: string | null;
  downloadLabel?: string;
};

function CvPreviewFrame({
  cvUrl,
  title,
}: {
  cvUrl: string;
  title: string;
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading && (
        <LoadingOverlay
          title="Opening CV preview"
          message="Loading the PDF viewer. This can take a moment for larger files."
        />
      )}
      <div className="relative min-h-0 flex-1 bg-white">
        <iframe
          src={cvUrl}
          title={title}
          className="min-h-0 h-full w-full bg-white"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </>
  );
}

export function CandidateCvPreviewModal({
  title,
  resumeName,
  cvUrl,
  isOpen,
  onClose,
  downloadUrl,
  downloadLabel = "Download CV",
}: CandidateCvPreviewModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,20,10,0.48)] px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-cv-modal-title"
        className="flex h-[min(92vh,980px)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              CV Preview
            </p>
            <h3 id="candidate-cv-modal-title" className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              {title}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{resumeName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {downloadUrl && (
              <a
                href={downloadUrl}
                className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
              >
                {downloadLabel}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
            >
              Close
            </button>
          </div>
        </div>

        <CvPreviewFrame key={cvUrl} cvUrl={cvUrl} title={title} />
      </div>
      </div>
    </>
  );
}
