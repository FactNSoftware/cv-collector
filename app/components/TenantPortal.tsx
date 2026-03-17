"use client";

import Link from "next/link";
import { Building2, Settings, Users, Briefcase, LayoutGrid, Globe } from "lucide-react";
import { PortalShell } from "./PortalShell";
import type { OrganizationRecord, OrganizationMembership } from "../../lib/organizations";

type Props = {
  sessionEmail: string;
  organization: OrganizationRecord;
  membership: OrganizationMembership | null;
  isSuperAdmin: boolean;
};

export function TenantPortal({ sessionEmail, organization, membership, isSuperAdmin }: Props) {
  const role = membership?.role ?? null;
  const isOwnerOrAdmin = isSuperAdmin || role === "owner" || role === "admin";

  const cards = isOwnerOrAdmin
    ? [
        {
          href: `/o/${organization.slug}/jobs`,
          icon: Briefcase,
          title: "Jobs",
          description: "Manage your open positions and job postings.",
        },
        {
          href: `/o/${organization.slug}/candidates`,
          icon: Users,
          title: "Candidates",
          description: "Review applicants and manage your pipeline.",
        },
        {
          href: `/o/${organization.slug}/settings`,
          icon: Settings,
          title: "Settings",
          description: "Branding, theme, custom domain, and members.",
        },
      ]
    : [
        {
          href: `/o/${organization.slug}/apply`,
          icon: Briefcase,
          title: "Open positions",
          description: "Browse and apply for open roles at this organization.",
        },
        {
          href: `/o/${organization.slug}/applications`,
          icon: LayoutGrid,
          title: "My applications",
          description: "Track the status of your submitted applications.",
        },
      ];

  return (
    <PortalShell
      portal="tenant"
      sessionEmail={sessionEmail}
      organizationSlug={organization.slug}
      title={organization.name}
      eyebrow="Organization portal"
      subtitle={`${organization.slug} · ${role ?? (isSuperAdmin ? "super admin" : "")}`}
    >
      <div className="space-y-8">
        {/* Welcome banner */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-6 py-5">
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logoUrl}
                alt={`${organization.name} logo`}
                className="h-10 w-10 shrink-0 rounded-lg border border-[var(--color-border)] bg-white object-contain p-1"
              />
            ) : (
              <Building2 className="h-6 w-6 shrink-0 text-[var(--color-brand-strong)]" />
            )}
            <div>
              <p className="text-base font-semibold text-[var(--color-ink)]">
                {organization.name}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                Portal slug: <span className="font-medium text-[var(--color-ink)]">{organization.slug}</span>
              </p>
            </div>
          </div>
          {organization.description && (
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {organization.description}
            </p>
          )}
          {(organization.websiteUrl || organization.contactEmail || organization.contactPhone || organization.location) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {organization.websiteUrl && (
                <a
                  href={organization.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs text-[var(--color-link)] underline underline-offset-2"
                >
                  Website
                </a>
              )}
              {organization.contactEmail && (
                <span className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
                  {organization.contactEmail}
                </span>
              )}
              {organization.contactPhone && (
                <span className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
                  {organization.contactPhone}
                </span>
              )}
              {organization.location && (
                <span className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-xs text-[var(--color-muted)]">
                  {organization.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick-action cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 transition hover:border-[var(--color-brand-strong)] hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-panel-strong)]">
                <Icon className="h-5 w-5 text-[var(--color-brand-strong)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-strong)]">
                  {title}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-muted)]">{description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Setup nudge for owner if org is fresh */}
        {(role === "owner" || isSuperAdmin) && (
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-panel-strong)]">
                <Globe className="h-5 w-5 text-[var(--color-brand-strong)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--color-ink)]">Complete your setup</p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-muted)]">
                  Add your branding, invite team members, and configure your custom domain in Settings.
                </p>
                <Link
                  href={`/o/${organization.slug}/settings`}
                  className="mt-3 inline-block text-sm font-medium text-[var(--color-brand-strong)] underline underline-offset-2"
                >
                  Go to settings →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
