import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Coins,
  MapPin,
  Users,
} from "lucide-react";
import { getSalaryDisplay, type JobRecord } from "../../lib/jobs";

type JobDetailContentProps = {
  job: JobRecord;
  showStatus?: boolean;
};

export function JobDetailContent({
  job,
  showStatus = false,
}: JobDetailContentProps) {
  const factItems = [
    job.department
      ? {
          label: "Department",
          value: job.department,
          icon: Building2,
        }
      : null,
    job.location
      ? {
          label: "Location",
          value: job.location,
          icon: MapPin,
        }
      : null,
    getSalaryDisplay(job)
      ? {
          label: "Salary Range",
          value: getSalaryDisplay(job),
          icon: Coins,
        }
      : null,
    job.vacancies
      ? {
          label: "Openings",
          value: `${job.vacancies} position${job.vacancies > 1 ? "s" : ""}`,
          icon: Users,
        }
      : null,
    job.closingDate
      ? {
          label: "Closing Date",
          value: new Date(job.closingDate).toLocaleDateString(),
          icon: CalendarDays,
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
          {job.code}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {job.employmentType}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {job.workplaceType}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {job.experienceLevel}
        </span>
        {showStatus && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            job.isPublished
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}>
            {job.isPublished ? "Published" : "Preview"}
          </span>
        )}
      </div>

      <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-[var(--color-ink)]">
        {job.title}
      </h1>
      {job.summary && (
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[var(--color-muted)]">
          {job.summary}
        </p>
      )}

      {job.descriptionHtml && (
        <div
          className="mt-10 space-y-4 text-base leading-8 text-slate-700 [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-brand)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_img]:my-6 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-3xl [&_img]:object-contain [&_img]:shadow-md [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
        />
      )}

      {(job.requirements || job.benefits) && (
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {job.requirements && (
            <div className="rounded-[24px] bg-white/90 p-6 shadow-[var(--shadow-soft)]">
              <p className="text-lg font-semibold text-[var(--color-ink)]">Requirements</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">
                {job.requirements}
              </p>
            </div>
          )}
          {job.benefits && (
            <div className="rounded-[24px] bg-white/90 p-6 shadow-[var(--shadow-soft)]">
              <p className="text-lg font-semibold text-[var(--color-ink)]">Benefits</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--color-muted)]">
                {job.benefits}
              </p>
            </div>
          )}
        </div>
      )}

      {factItems.length > 0 && (
        <section className="mt-10 rounded-[28px] border border-[var(--color-border)] bg-white/80 p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
            <BriefcaseBusiness className="h-4 w-4 text-[var(--color-brand-strong)]" />
            Role snapshot
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {factItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-panel-strong)] text-[var(--color-brand-strong)]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-ink)]">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
