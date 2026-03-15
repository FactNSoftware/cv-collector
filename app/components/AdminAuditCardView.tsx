"use client";

import type { AdminAuditLogRecord } from "../../lib/audit-log";

type AdminAuditCardViewProps = {
  items: AdminAuditLogRecord[];
};

const formatAction = (value: string) => {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatJson = (value: Record<string, unknown> | null) => {
  if (!value) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

export function AdminAuditCardView({ items }: AdminAuditCardViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 text-sm text-[var(--color-muted)]">
        No audit events found for the selected filter.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((log) => (
        <article key={log.id} className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">
                  {formatAction(log.action)}
                </span>
                {log.targetType && (
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
                    {log.targetType}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-base font-semibold text-[var(--color-ink)]">{log.summary}</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{log.actorEmail}</p>
            </div>
            <div className="text-right text-xs text-[var(--color-muted)]">
              <div>{new Date(log.createdAt).toLocaleString()}</div>
              {(log.requestMethod || log.requestPath) && (
                <div className="mt-1">
                  {[log.requestMethod, log.requestPath].filter(Boolean).join(" ")}
                </div>
              )}
            </div>
          </div>
          {(log.targetId || log.userAgent || log.details) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {log.targetId && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Target</div>
                  <div className="mt-1 break-all">{log.targetId}</div>
                </div>
              )}
              {log.userAgent && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">User Agent</div>
                  <div className="mt-1 break-all">{log.userAgent}</div>
                </div>
              )}
              {log.details && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)] sm:col-span-2">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Request Details JSON</div>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-white p-3 text-xs leading-6 text-[var(--color-ink)]">
                    {formatJson(log.details)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
