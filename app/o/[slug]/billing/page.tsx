import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { PortalShell } from "../../../components/PortalShell";
import { requireOrganizationOwnerPageSession } from "../../../../lib/auth-guards";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantBillingPage({ params }: Props) {
  const { slug } = await params;
  const access = await requireOrganizationOwnerPageSession(slug);

  return (
    <PortalShell
      portal="tenant"
      sessionEmail={access.session.email}
      organizationSlug={slug}
      tenantFeatureKeys={access.featureKeys}
      eyebrow="Billing"
      title="Billing and plan"
      subtitle="Review the current plan and manage organization billing details."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3">
                <CreditCard className="h-5 w-5 text-[var(--color-brand-strong)]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Current plan</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  {access.effectiveSubscription?.name ?? "Legacy default access"}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Billing controls are ready for the owner portal. Payment collection and invoice sync can be connected next.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3">
                <ReceiptText className="h-5 w-5 text-[var(--color-brand-strong)]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Plan source</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  {access.featureAccessSource === "subscription" ? "Subscription" : "Legacy default"}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  You can change assigned plans from the system subscriptions workspace.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-sm leading-6 text-[var(--color-muted)]">
            This billing page is now available in the owner portal menu. The next implementation step is to connect payment provider checkout, invoices, and billing history.
          </p>
          <Link
            href={`/o/${slug}/settings`}
            className="mt-4 inline-flex rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
          >
            Back to settings
          </Link>
        </section>
      </div>
    </PortalShell>
  );
}
