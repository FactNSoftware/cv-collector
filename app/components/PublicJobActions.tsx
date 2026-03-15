"use client";

import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { useToast } from "./ToastProvider";

type PublicJobActionsProps = {
  jobId: string;
  className?: string;
};

export function PublicJobActions({
  jobId,
  className,
}: PublicJobActionsProps) {
  const { showToast } = useToast();
  const publicPath = `/jobs/${jobId}`;

  const handleCopyLink = async () => {
    try {
      const publicUrl = `${window.location.origin}${publicPath}`;
      await navigator.clipboard.writeText(publicUrl);
      showToast("Public job link copied.");
    } catch {
      showToast("Failed to copy public job link.", "error");
    }
  };

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      <Link
        href={publicPath}
        target="_blank"
        rel="noreferrer"
        className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-xl px-4 py-2"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Public View
      </Link>
      <button
        type="button"
        onClick={handleCopyLink}
        className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-xl px-4 py-2"
      >
        <Link2 className="mr-2 h-4 w-4" />
        Copy Public Link
      </button>
    </div>
  );
}
