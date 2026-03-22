"use client";

import type React from "react";

type DashboardMetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  helper?: string;
};

export function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: DashboardMetricCardProps) {
  return (
    <article className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-2 text-4xl font-bold text-[var(--color-ink)]">{value}</p>
          {helper ? (
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{helper}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-[var(--color-canvas)] p-3">
          <Icon className="h-6 w-6 text-[var(--color-brand-strong)]" />
        </div>
      </div>
    </article>
  );
}

type DashboardPanelProps = {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardPanel({
  eyebrow,
  title,
  action,
  children,
}: DashboardPanelProps) {
  return (
    <section className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm leading-6 text-[var(--color-muted)]">
      {message}
    </div>
  );
}

export function PortalDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`metric-${index}`}
            className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-2 w-20 rounded bg-[var(--color-canvas)]" />
                <div className="mt-4 h-8 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="mt-3 h-3 w-40 rounded bg-[var(--color-canvas)]" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`panel-${index}`}
            className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]"
          >
            <div className="border-b border-[var(--color-border)] px-6 py-4">
              <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="mt-3 h-5 w-40 rounded bg-[var(--color-canvas)]" />
            </div>
            <div className="space-y-3 px-6 py-5">
              {Array.from({ length: 4 }).map((_, itemIndex) => (
                <div
                  key={`panel-item-${index}-${itemIndex}`}
                  className="rounded-[16px] bg-[var(--color-canvas)] p-4"
                >
                  <div className="h-3 w-32 rounded bg-[var(--color-panel)]" />
                  <div className="mt-3 h-2 w-full rounded bg-[var(--color-panel)]" />
                  <div className="mt-2 h-2 w-2/3 rounded bg-[var(--color-panel)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PortalFormPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-5">
          <div className="h-6 w-40 rounded bg-[var(--color-canvas)]" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`form-field-${index}`} className="space-y-2">
              <div className="h-3 w-28 rounded bg-[var(--color-canvas)]" />
              <div className="h-12 rounded-2xl bg-[var(--color-canvas)]" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-28 rounded-2xl bg-[var(--color-canvas)]" />
            <div className="h-11 w-36 rounded-2xl bg-[var(--color-canvas)]" />
          </div>
        </div>
      </section>

      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`info-card-${index}`} className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <div className="h-3 w-20 rounded bg-[var(--color-canvas)]" />
              <div className="mt-4 h-6 w-40 rounded bg-[var(--color-canvas)]" />
              <div className="mt-3 h-3 w-full rounded bg-[var(--color-canvas)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PortalWorkspaceTableSkeleton() {
  return (
    <div className="space-y-6">
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
            <div className="h-8 w-64 rounded bg-[var(--color-canvas)]" />
            <div className="h-3 w-80 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-48 rounded-2xl bg-[var(--color-canvas)]" />
            <div className="h-11 w-32 rounded-2xl bg-[var(--color-canvas)]" />
          </div>
        </div>
      </section>

      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div className="h-5 w-36 rounded bg-[var(--color-canvas)]" />
          <div className="h-10 w-32 rounded-2xl bg-[var(--color-canvas)]" />
        </div>
        <div className="space-y-4 px-6 py-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`table-row-${index}`} className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-white p-4 lg:grid-cols-[1.6fr_1fr_1fr_0.8fr]">
              <div className="h-4 w-40 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-28 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-32 rounded bg-[var(--color-canvas)]" />
              <div className="h-9 w-24 rounded-2xl bg-[var(--color-canvas)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PortalSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <section
          key={`settings-section-${index}`}
          className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
        >
          <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
          <div className="mt-3 h-7 w-48 rounded bg-[var(--color-canvas)]" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((__, fieldIndex) => (
              <div key={`settings-field-${index}-${fieldIndex}`} className="space-y-2">
                <div className="h-3 w-28 rounded bg-[var(--color-canvas)]" />
                <div className="h-12 rounded-2xl bg-[var(--color-canvas)]" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PortalBillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={`billing-card-${index}`}
            className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--color-canvas)]" />
              <div className="flex-1 space-y-3">
                <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="h-8 w-44 rounded bg-[var(--color-canvas)]" />
                <div className="h-3 w-full rounded bg-[var(--color-canvas)]" />
                <div className="h-3 w-3/4 rounded bg-[var(--color-canvas)]" />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-[var(--color-canvas)]" />
          <div className="h-3 w-5/6 rounded bg-[var(--color-canvas)]" />
          <div className="h-10 w-36 rounded-2xl bg-[var(--color-canvas)]" />
        </div>
      </section>
    </div>
  );
}

export function TenantDashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`tenant-metric-${index}`}
            className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-3 w-20 rounded bg-[var(--color-canvas)]" />
                <div className="mt-4 h-10 w-16 rounded bg-[var(--color-canvas)]" />
                <div className="mt-4 h-3 w-24 rounded bg-[var(--color-canvas)]" />
              </div>
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <section className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
            <div className="mt-3 h-7 w-56 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-canvas)]" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-[var(--color-canvas)]" />
                  <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
                </div>
              </div>
              <div className="mt-4 h-3 w-full rounded bg-[var(--color-canvas)]" />
              <div className="mt-2 h-3 w-4/5 rounded bg-[var(--color-canvas)]" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((__, chipIndex) => (
                  <div key={`tenant-chip-${chipIndex}`} className="h-8 w-28 rounded-full bg-[var(--color-canvas)]" />
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={`tenant-quick-link-${cardIndex}`} className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
                  <div className="h-10 w-10 rounded-2xl bg-[var(--color-canvas)]" />
                  <div className="mt-4 h-5 w-28 rounded bg-[var(--color-canvas)]" />
                  <div className="mt-3 h-3 w-full rounded bg-[var(--color-canvas)]" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-[var(--color-canvas)]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="h-3 w-32 rounded bg-[var(--color-canvas)]" />
            <div className="mt-3 h-7 w-44 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="space-y-3 px-6 py-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`tenant-activity-${index}`} className="rounded-[16px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-36 rounded bg-[var(--color-canvas)]" />
                    <div className="h-3 w-28 rounded bg-[var(--color-canvas)]" />
                    <div className="h-3 w-32 rounded bg-[var(--color-canvas)]" />
                  </div>
                  <div className="h-7 w-20 rounded-full bg-[var(--color-canvas)]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <div className="h-3 w-20 rounded bg-[var(--color-canvas)]" />
          <div className="mt-3 h-7 w-44 rounded bg-[var(--color-canvas)]" />
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start gap-4 rounded-[16px] border border-[var(--color-border)] bg-white p-5">
            <div className="h-10 w-10 rounded-2xl bg-[var(--color-canvas)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 rounded bg-[var(--color-canvas)]" />
              <div className="h-3 w-full rounded bg-[var(--color-canvas)]" />
              <div className="h-3 w-4/5 rounded bg-[var(--color-canvas)]" />
              <div className="h-3 w-28 rounded bg-[var(--color-canvas)]" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function TenantJobsPageSkeleton() {
  return (
    <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="h-11 flex-1 rounded-2xl bg-[var(--color-canvas)]" />
        <div className="h-11 w-32 rounded-2xl bg-[var(--color-canvas)]" />
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`tenant-job-row-${index}`} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-3 w-16 rounded bg-[var(--color-canvas)]" />
                <div className="h-6 w-20 rounded-full bg-[var(--color-canvas)]" />
              </div>
              <div className="mt-2 h-4 w-40 rounded bg-[var(--color-canvas)]" />
              <div className="mt-2 h-3 w-44 rounded bg-[var(--color-canvas)]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 rounded-xl bg-[var(--color-canvas)]" />
              <div className="h-8 w-20 rounded-xl bg-[var(--color-canvas)]" />
              <div className="h-8 w-16 rounded-xl bg-[var(--color-canvas)]" />
              <div className="h-8 w-8 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TenantCandidatesPageSkeleton() {
  return (
    <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px]">
        <div className="h-11 rounded-2xl bg-[var(--color-canvas)]" />
        <div className="h-11 rounded-2xl bg-[var(--color-canvas)]" />
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`tenant-candidate-row-${index}`} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-4 w-36 rounded bg-[var(--color-canvas)]" />
                <div className="h-6 w-20 rounded-full bg-[var(--color-canvas)]" />
              </div>
              <div className="mt-2 h-3 w-40 rounded bg-[var(--color-canvas)]" />
              <div className="mt-2 h-3 w-32 rounded bg-[var(--color-canvas)]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-20 rounded bg-[var(--color-canvas)]" />
              <div className="h-8 w-16 rounded-xl bg-[var(--color-canvas)]" />
              <div className="h-8 w-16 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SystemUsersPageSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        <article className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-4">
              <div className="h-8 w-32 rounded-full bg-[var(--color-canvas)]" />
              <div className="h-8 w-72 rounded bg-[var(--color-canvas)]" />
              <div className="h-3 w-full rounded bg-[var(--color-canvas)]" />
              <div className="h-3 w-5/6 rounded bg-[var(--color-canvas)]" />
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-white px-4 py-3">
              <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="mt-3 h-8 w-16 rounded bg-[var(--color-canvas)]" />
            </div>
          </div>
        </article>
        <article className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="space-y-4">
            <div className="h-6 w-48 rounded bg-[var(--color-canvas)]" />
            <div className="h-11 rounded-2xl bg-[var(--color-canvas)]" />
            <div className="h-11 w-28 rounded-2xl bg-[var(--color-canvas)]" />
          </div>
        </article>
      </section>
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="h-11 flex-1 rounded-2xl bg-[var(--color-canvas)]" />
          <div className="h-11 w-36 rounded-2xl bg-[var(--color-canvas)]" />
          <div className="h-11 w-32 rounded-2xl bg-[var(--color-canvas)]" />
          <div className="h-11 w-28 rounded-2xl bg-[var(--color-canvas)]" />
        </div>
        <div className="space-y-4 px-5 py-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`system-user-row-${index}`} className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-white p-4 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
              <div className="h-4 w-40 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-32 rounded bg-[var(--color-canvas)]" />
              <div className="h-9 w-16 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function SystemSubscriptionsPageSkeleton() {
  return (
    <div className="space-y-6">
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
            <div className="h-8 w-64 rounded bg-[var(--color-canvas)]" />
            <div className="h-3 w-80 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="h-11 w-44 rounded-2xl bg-[var(--color-canvas)]" />
        </div>
      </section>
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]">
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <div className="h-6 w-44 rounded bg-[var(--color-canvas)]" />
          <div className="mt-3 h-3 w-72 rounded bg-[var(--color-canvas)]" />
        </div>
        <div className="space-y-4 px-6 py-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`subscription-row-${index}`} className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-white p-4 lg:grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr_0.6fr]">
              <div className="h-4 w-36 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-20 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="h-9 w-14 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`subscription-panel-${index}`} className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="h-6 w-48 rounded bg-[var(--color-canvas)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div key={`subscription-panel-row-${index}-${rowIndex}`} className="rounded-[16px] border border-[var(--color-border)] bg-white p-4">
                  <div className="h-4 w-40 rounded bg-[var(--color-canvas)]" />
                  <div className="mt-3 h-3 w-5/6 rounded bg-[var(--color-canvas)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export function OrganizationsListPageSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <article className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="space-y-4">
            <div className="h-8 w-28 rounded-full bg-[var(--color-canvas)]" />
            <div className="h-8 w-72 rounded bg-[var(--color-canvas)]" />
            <div className="h-3 w-full rounded bg-[var(--color-canvas)]" />
            <div className="h-3 w-4/5 rounded bg-[var(--color-canvas)]" />
          </div>
        </article>
        <article className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="space-y-4">
            <div className="h-6 w-48 rounded bg-[var(--color-canvas)]" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`org-create-field-${index}`} className="space-y-2">
                <div className="h-3 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="h-11 rounded-2xl bg-[var(--color-canvas)]" />
              </div>
            ))}
            <div className="h-11 w-40 rounded-2xl bg-[var(--color-canvas)]" />
          </div>
        </article>
      </section>
      <section className="animate-pulse rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="h-11 flex-1 rounded-2xl bg-[var(--color-canvas)]" />
          <div className="h-11 w-28 rounded-2xl bg-[var(--color-canvas)]" />
          <div className="h-11 w-32 rounded-2xl bg-[var(--color-canvas)]" />
        </div>
        <div className="space-y-4 px-5 py-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`org-row-${index}`} className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-white p-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr]">
              <div className="h-4 w-44 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-24 rounded bg-[var(--color-canvas)]" />
              <div className="h-4 w-32 rounded bg-[var(--color-canvas)]" />
              <div className="h-9 w-20 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
