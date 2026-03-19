"use client";

export function SystemDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top level metrics - 4 cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`metric-${i}`}
            className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-2 w-16 rounded bg-[var(--color-canvas)]" />
                <div className="mt-4 h-8 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-48 rounded bg-[var(--color-canvas)]" />
                  <div className="flex h-4 w-20 gap-1 rounded bg-[var(--color-canvas)]" />
                </div>
              </div>
              <div className="ml-4 h-12 w-12 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metrics - 4 cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`secondary-${i}`}
            className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-2 w-20 rounded bg-[var(--color-canvas)]" />
                <div className="mt-4 h-8 w-16 rounded bg-[var(--color-canvas)]" />
              </div>
              <div className="ml-4 h-10 w-10 rounded-xl bg-[var(--color-canvas)]" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts and detailed sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status Chart */}
        <div className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="mb-4 h-4 w-32 rounded bg-[var(--color-canvas)]" />
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={`chart-${i}`}>
                <div className="mb-2 h-2 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="h-2 rounded-full bg-[var(--color-canvas)]" />
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
          <div className="mb-4 h-4 w-24 rounded bg-[var(--color-canvas)]" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`health-${i}`}
                className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] p-4"
              >
                <div className="h-3 w-32 rounded bg-[var(--color-panel)]" />
                <div className="h-5 w-12 rounded bg-[var(--color-panel)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom sections - 3 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Jobs */}
        <div className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="h-4 w-32 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`job-${i}`} className="px-6 py-4">
                <div className="mb-2 h-3 w-40 rounded bg-[var(--color-canvas)]" />
                <div className="mt-2 h-2 w-24 rounded bg-[var(--color-canvas)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="h-4 w-40 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`activity-${i}`} className="px-6 py-4">
                <div className="mb-2 h-2 w-20 rounded bg-[var(--color-canvas)]" />
                <div className="mb-2 h-3 w-full rounded bg-[var(--color-canvas)]" />
                <div className="h-2 w-32 rounded bg-[var(--color-canvas)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Organizations */}
        <div className="animate-pulse rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <div className="h-4 w-40 rounded bg-[var(--color-canvas)]" />
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`org-${i}`} className="px-6 py-4">
                <div className="mb-2 h-3 w-32 rounded bg-[var(--color-canvas)]" />
                <div className="mb-2 h-2 w-24 rounded bg-[var(--color-canvas)]" />
                <div className="mb-2 h-2 w-40 rounded bg-[var(--color-canvas)]" />
                <div className="h-3 w-16 rounded bg-[var(--color-canvas)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
