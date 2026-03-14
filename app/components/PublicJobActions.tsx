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
        className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Public View
      </Link>
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      >
        <Link2 className="mr-2 h-4 w-4" />
        Copy Public Link
      </button>
    </div>
  );
}
