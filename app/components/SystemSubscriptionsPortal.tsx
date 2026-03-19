"use client";

import { Layers3, PackagePlus, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { FeatureCatalogRecord } from "../../lib/feature-catalog";
import type {
  OrganizationSubscriptionAssignmentDetail,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionVisibility,
} from "../../lib/subscriptions";
import { PortalShell } from "./PortalShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useToast } from "./ToastProvider";

type DraftSubscription = {
  name: string;
  description: string;
  visibility: SubscriptionVisibility;
  status: SubscriptionStatus;
  isDefaultPublic: boolean;
  featureKeys: string[];
  functionalityKeys: string[];
};

type Props = {
  sessionEmail: string;
  initialSubscriptions: SubscriptionRecord[];
  initialAssignments: OrganizationSubscriptionAssignmentDetail[];
  assignableFeatures: FeatureCatalogRecord[];
  upcomingFeatures: FeatureCatalogRecord[];
};

const toDraft = (subscription: SubscriptionRecord): DraftSubscription => ({
  name: subscription.name,
  description: subscription.description ?? "",
  visibility: subscription.visibility,
  status: subscription.status,
  isDefaultPublic: subscription.isDefaultPublic,
  featureKeys: subscription.featureKeys,
  functionalityKeys: subscription.functionalityKeys,
});

const EMPTY_CREATE_DRAFT: DraftSubscription = {
  name: "",
  description: "",
  visibility: "private",
  status: "active",
  isDefaultPublic: false,
  featureKeys: [],
  functionalityKeys: [],
};

const getFeatureBadgeClassName = (status: string) => {
  if (status === "implemented") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "beta") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-[var(--color-panel-strong)] text-[var(--color-muted)]";
};

const CREATE_STEPS = [
  { key: "details", label: "Details" },
  { key: "access", label: "Access" },
  { key: "review", label: "Review" },
] as const;

function SubscriptionStepperModal({
  isOpen,
  draft,
  assignableFeatures,
  upcomingFeatures,
  mode,
  assignedOrganizationsCount,
  isCreating,
  onDraftChange,
  onToggleFeature,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  draft: DraftSubscription;
  assignableFeatures: FeatureCatalogRecord[];
  upcomingFeatures: FeatureCatalogRecord[];
  mode: "create" | "edit";
  assignedOrganizationsCount?: number;
  isCreating: boolean;
  onDraftChange: (draft: DraftSubscription) => void;
  onToggleFeature: (featureKey: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  const selectedFeatures = useMemo(
    () => assignableFeatures.filter((feature) => draft.featureKeys.includes(feature.key)),
    [assignableFeatures, draft.featureKeys],
  );

  const canProceedFromDetails = draft.name.trim().length > 0;
  const canProceedFromAccess = draft.featureKeys.length > 0 && draft.functionalityKeys.length > 0;
  const canSubmit = canProceedFromDetails && canProceedFromAccess;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[var(--color-dialog-overlay)]">
      <div className="flex h-dvh w-screen items-start justify-center overflow-y-auto px-4 py-4 sm:py-6">
        <div
          role="dialog"
          aria-modal="true"
          className="flex w-full max-w-5xl flex-col rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] sm:p-6 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                {mode === "create" ? "Create Subscription" : "Edit Subscription"}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">Subscription setup</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Move through the steps to define plan details, enabled features, and selectable functionality access.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {mode === "edit" ? (
                <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-muted)]">
                  Assigned organizations: <span className="font-semibold text-[var(--color-ink)]">{assignedOrganizationsCount ?? 0}</span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="theme-action-button theme-action-button-secondary rounded-2xl px-5 py-2.5 text-sm"
              >
                Close
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {CREATE_STEPS.map((step, index) => {
              const isActive = index === stepIndex;
              const isComplete = index < stepIndex;

              return (
                <div
                  key={step.key}
                  className={`rounded-2xl border px-4 py-3 ${
                    isActive
                      ? "border-[var(--color-brand-strong)] bg-[var(--color-panel)]"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-[var(--color-border)] bg-white"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{step.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
            {stepIndex === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">Name</span>
                  <input
                    value={draft.name}
                    onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                    className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)]"
                    placeholder="Starter Hire"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">Visibility</span>
                  <select
                    value={draft.visibility}
                    onChange={(event) => onDraftChange({
                      ...draft,
                      visibility: event.target.value as SubscriptionVisibility,
                      isDefaultPublic: event.target.value === "public" ? draft.isDefaultPublic : false,
                    })}
                    className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)]"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="internal">Internal</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) => onDraftChange({ ...draft, status: event.target.value as SubscriptionStatus })}
                    className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)]"
                  >
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                    rows={4}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)]"
                    placeholder="Low-cost hiring plan for smaller teams."
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-[var(--color-ink)] md:col-span-2">
                  <input
                    type="checkbox"
                    checked={draft.isDefaultPublic}
                    disabled={draft.visibility !== "public"}
                    className="h-4 w-4 rounded border border-[var(--color-border)] accent-[var(--color-brand)]"
                    onChange={(event) => onDraftChange({ ...draft, isDefaultPublic: event.target.checked })}
                  />
                  Mark as default public plan for new organization registrations
                </label>
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
                <section className="min-h-0 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">Features</h4>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Select implemented features on the left. Upcoming features stay visible below for planning.
                  </p>
                  <div className="mt-4 max-h-[52dvh] space-y-3 overflow-y-auto pr-1">
                    {assignableFeatures.map((feature) => (
                      <div
                        key={feature.key}
                        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4"
                      >
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={draft.featureKeys.includes(feature.key)}
                            className="mt-1 h-4 w-4 rounded border border-[var(--color-border)] accent-[var(--color-brand)]"
                            onChange={() => onToggleFeature(feature.key)}
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="block text-sm font-medium text-[var(--color-ink)]">{feature.name}</span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getFeatureBadgeClassName(feature.status)}`}>
                                {feature.status}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs text-[var(--color-muted)]">{feature.description}</span>
                          </span>
                        </label>
                      </div>
                    ))}
                    {upcomingFeatures.length > 0 ? (
                      <div className="pt-2">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Upcoming features
                        </p>
                        <div className="space-y-3">
                          {upcomingFeatures.map((feature) => (
                            <div
                              key={feature.key}
                              className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-4 opacity-80"
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  disabled
                                  className="mt-1 h-4 w-4 rounded border border-[var(--color-border)]"
                                />
                                <span className="min-w-0">
                                  <span className="flex flex-wrap items-center gap-2">
                                    <span className="block text-sm font-medium text-[var(--color-ink)]">{feature.name}</span>
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getFeatureBadgeClassName(feature.status)}`}>
                                      {feature.status}
                                    </span>
                                  </span>
                                  <span className="mt-1 block text-xs text-[var(--color-muted)]">{feature.description}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="min-h-0 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">Functionalities</h4>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    The right column updates from the selected features. Upcoming functionality stays visible but locked.
                  </p>
                  <div className="mt-4 max-h-[52dvh] overflow-y-auto rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)]">
                    {selectedFeatures.length === 0 ? (
                      <div className="flex min-h-[260px] items-center justify-center px-6 py-10 text-center text-sm text-[var(--color-muted)]">
                        Select one or more features on the left to manage functionality access here.
                      </div>
                    ) : selectedFeatures.map((feature, index) => (
                      <div key={feature.key} className="px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[var(--color-ink)]">{feature.name}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${getFeatureBadgeClassName(feature.status)}`}>
                            {feature.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{feature.description}</p>

                        <div className="mt-4 space-y-2">
                          {feature.functionalities.map((functionality) => {
                            const isSelected = draft.functionalityKeys.includes(functionality.key);
                            const isUpcoming = functionality.status !== "implemented" && functionality.status !== "beta";

                            return (
                              <div
                                key={functionality.key}
                                className={`rounded-2xl border px-4 py-3 ${
                                  isUpcoming
                                    ? "border-dashed border-[var(--color-border)] bg-[var(--color-canvas)]"
                                    : isSelected
                                      ? "border-[var(--color-brand-strong)] bg-[var(--color-panel)]"
                                      : "border-[var(--color-border)] bg-[var(--color-panel)]"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isUpcoming}
                                    className="mt-1 h-4 w-4 shrink-0 rounded border border-[var(--color-border)] accent-[var(--color-brand)]"
                                    onChange={() => onDraftChange({
                                      ...draft,
                                      functionalityKeys: draft.functionalityKeys.includes(functionality.key)
                                        ? draft.functionalityKeys.filter((item) => item !== functionality.key)
                                        : [...draft.functionalityKeys, functionality.key].sort(),
                                    })}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-sm font-medium text-[var(--color-ink)]">{functionality.name}</p>
                                      <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${getFeatureBadgeClassName(functionality.status)}`}>
                                        {isUpcoming ? "upcoming" : isSelected ? "selected" : functionality.status}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--color-muted)]">{functionality.description}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {index < selectedFeatures.length - 1 ? (
                          <hr className="mt-4 border-[var(--color-border)]" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">Plan summary</h4>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="text-[var(--color-muted)]">Name</dt>
                      <dd className="font-medium text-[var(--color-ink)]">{draft.name || "Untitled subscription"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Visibility</dt>
                      <dd className="font-medium capitalize text-[var(--color-ink)]">{draft.visibility}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Status</dt>
                      <dd className="font-medium capitalize text-[var(--color-ink)]">{draft.status}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Default public</dt>
                      <dd className="font-medium text-[var(--color-ink)]">{draft.isDefaultPublic ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-muted)]">Description</dt>
                      <dd className="text-[var(--color-ink)]">{draft.description || "No description provided."}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <h4 className="text-base font-semibold text-[var(--color-ink)]">Access coverage</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Features</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{draft.featureKeys.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Functionalities</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{draft.functionalityKeys.length}</p>
                    </div>
                  </div>

                  <div className="mt-4 max-h-[260px] space-y-3 overflow-y-auto pr-1">
                    {selectedFeatures.map((feature) => (
                      <div key={feature.key} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
                        <p className="text-sm font-medium text-[var(--color-ink)]">{feature.name}</p>
                        <p className="mt-2 text-xs text-[var(--color-muted)]">
                          {
                            feature.functionalities.filter((item) => draft.functionalityKeys.includes(item.key)).length
                          }{" "}
                          selected functionalities
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--color-muted)]">
              {stepIndex === 0 ? "Start with plan details." : null}
              {stepIndex === 1 ? "Choose features on the left and refine their functionalities on the right." : null}
              {stepIndex === 2 ? "Review the plan before creating it." : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                className="theme-action-button theme-action-button-secondary rounded-2xl px-5 py-2.5 text-sm disabled:opacity-60"
              >
                Back
              </button>
              {stepIndex < CREATE_STEPS.length - 1 ? (
                <button
                  type="button"
                  disabled={
                    (stepIndex === 0 && !canProceedFromDetails) ||
                    (stepIndex === 1 && !canProceedFromAccess)
                  }
                  onClick={() => setStepIndex((current) => Math.min(CREATE_STEPS.length - 1, current + 1))}
                  className="theme-btn-primary inline-flex h-11 items-center rounded-2xl px-5 text-sm font-medium disabled:opacity-60"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isCreating || !canSubmit}
                  onClick={() => void onSubmit()}
                  className="theme-btn-primary inline-flex h-11 items-center rounded-2xl px-5 text-sm font-medium disabled:opacity-60"
                >
                  {isCreating ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create subscription" : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SystemSubscriptionsPortal({
  sessionEmail,
  initialSubscriptions,
  initialAssignments,
  assignableFeatures,
  upcomingFeatures,
}: Props) {
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [createDraft, setCreateDraft] = useState<DraftSubscription>(EMPTY_CREATE_DRAFT);
  const [drafts, setDrafts] = useState<Record<string, DraftSubscription>>(() =>
    Object.fromEntries(initialSubscriptions.map((subscription) => [subscription.id, toDraft(subscription)])),
  );
  const [isCreating, setIsCreating] = useState(false);
  const [savingSubscriptionId, setSavingSubscriptionId] = useState<string | null>(null);
  const [savingOrganizationSlug, setSavingOrganizationSlug] = useState<string | null>(null);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [editingModalKey, setEditingModalKey] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalKey, setCreateModalKey] = useState(0);
  const [assignmentSelections, setAssignmentSelections] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialAssignments.map((detail) => [
        detail.organization.slug,
        detail.subscription?.id ?? "",
      ]),
    ),
  );

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === "active"),
    [subscriptions],
  );
  const editingSubscription = useMemo(
    () => subscriptions.find((subscription) => subscription.id === editingSubscriptionId) ?? null,
    [editingSubscriptionId, subscriptions],
  );
  const editingDraft = editingSubscriptionId ? drafts[editingSubscriptionId] ?? null : null;
  const editingAssignedOrganizationsCount = editingSubscription
    ? assignments.filter((detail) => detail.subscription?.id === editingSubscription.id).length
    : 0;

  const totals = useMemo(() => {
    const assignedCount = assignments.filter((assignment) => assignment.subscription).length;
    const publicCount = subscriptions.filter((subscription) => subscription.visibility === "public").length;
    const defaultCount = subscriptions.filter((subscription) => subscription.isDefaultPublic).length;

    return {
      totalSubscriptions: subscriptions.length,
      publicCount,
      assignedCount,
      defaultCount,
    };
  }, [assignments, subscriptions]);

  const syncSubscription = (subscription: SubscriptionRecord) => {
    setSubscriptions((current) => {
      const existing = current.find((item) => item.id === subscription.id);

      if (!existing) {
        return [...current, subscription].sort((left, right) => left.name.localeCompare(right.name));
      }

      return current
        .map((item) => (item.id === subscription.id ? subscription : item))
        .sort((left, right) => left.name.localeCompare(right.name));
    });

    setDrafts((current) => ({
      ...current,
      [subscription.id]: toDraft(subscription),
    }));
  };

  const updateDraft = (subscriptionId: string, updater: (draft: DraftSubscription) => DraftSubscription) => {
    setDrafts((current) => {
      const existing = current[subscriptionId];

      if (!existing) {
        return current;
      }

      return {
        ...current,
        [subscriptionId]: updater(existing),
      };
    });
  };

  const toggleFeatureSelection = (
    draft: DraftSubscription,
    feature: FeatureCatalogRecord,
  ): DraftSubscription => {
    const isSelected = draft.featureKeys.includes(feature.key);
    const assignableFunctionalityKeys = feature.functionalities
      .filter((functionality) => functionality.status === "implemented" || functionality.status === "beta")
      .map((functionality) => functionality.key);

    if (isSelected) {
      return {
        ...draft,
        featureKeys: draft.featureKeys.filter((item) => item !== feature.key),
        functionalityKeys: draft.functionalityKeys.filter((item) => !assignableFunctionalityKeys.includes(item)),
      };
    }

    return {
      ...draft,
      featureKeys: [...draft.featureKeys, feature.key].sort(),
      functionalityKeys: [...new Set([...draft.functionalityKeys, ...assignableFunctionalityKeys])].sort(),
    };
  };

  const handleCreateSubscription = async () => {
    setIsCreating(true);

    try {
      const response = await fetch("/api/super-admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to create subscription." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create subscription.", "error");
        return;
      }

      const subscription = payload.item as SubscriptionRecord;
      syncSubscription(subscription);
      setCreateDraft(EMPTY_CREATE_DRAFT);
      setIsCreateModalOpen(false);
      showToast(payload.message || "Subscription created successfully.");
    } catch {
      showToast("Something went wrong while creating the subscription.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveSubscription = async (subscriptionId: string) => {
    const draft = drafts[subscriptionId];

    if (!draft) {
      return;
    }

    setSavingSubscriptionId(subscriptionId);

    try {
      const response = await fetch(`/api/super-admin/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to update subscription." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update subscription.", "error");
        return;
      }

      const subscription = payload.item as SubscriptionRecord;
      syncSubscription(subscription);
      setAssignments((current) => current.map((detail) => {
        if (detail.subscription?.id !== subscription.id) {
          return detail;
        }

        return {
          ...detail,
          subscription,
          featureKeys: subscription.featureKeys,
          functionalityKeys: subscription.functionalityKeys,
          source: "subscription",
        };
      }));
      setEditingSubscriptionId(null);
      showToast(payload.message || "Subscription updated successfully.");
    } catch {
      showToast("Something went wrong while updating the subscription.", "error");
    } finally {
      setSavingSubscriptionId(null);
    }
  };

  const handleAssignmentSave = async (organizationSlug: string) => {
    setSavingOrganizationSlug(organizationSlug);

    try {
      const response = await fetch(
        `/api/super-admin/organizations/${encodeURIComponent(organizationSlug)}/subscription`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionId: assignmentSelections[organizationSlug] || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({ message: "Failed to update organization subscription." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update organization subscription.", "error");
        return;
      }

      setAssignments((current) => current.map((detail) => {
        if (detail.organization.slug !== organizationSlug) {
          return detail;
        }

        return {
          ...detail,
          assignment: payload.assignment ?? null,
          subscription: payload.subscription ?? null,
          featureKeys: payload.effective?.featureKeys ?? detail.featureKeys,
          functionalityKeys: payload.effective?.functionalityKeys ?? detail.functionalityKeys,
          source: payload.effective?.source ?? detail.source,
        };
      }));
      showToast(payload.message || "Organization subscription updated.");
    } catch {
      showToast("Something went wrong while updating the organization subscription.", "error");
    } finally {
      setSavingOrganizationSlug(null);
    }
  };

  return (
    <PortalShell
      portal="system"
      sessionEmail={sessionEmail}
      eyebrow="System"
      title="Subscriptions"
      subtitle="Bundle tenant features, choose public availability, and assign organizations to plans."
    >
      <SubscriptionStepperModal
        key={`edit-${editingModalKey}-${editingSubscriptionId ?? "closed"}`}
        isOpen={!!editingSubscription}
        draft={editingDraft ?? EMPTY_CREATE_DRAFT}
        assignableFeatures={assignableFeatures}
        upcomingFeatures={upcomingFeatures}
        mode="edit"
        assignedOrganizationsCount={editingAssignedOrganizationsCount}
        isCreating={savingSubscriptionId === editingSubscriptionId}
        onDraftChange={(nextDraft) => {
          if (!editingSubscriptionId) {
            return;
          }

          setDrafts((current) => ({
            ...current,
            [editingSubscriptionId]: nextDraft,
          }));
        }}
        onToggleFeature={(featureKey) => {
          if (!editingSubscriptionId) {
            return;
          }

          const feature = assignableFeatures.find((item) => item.key === featureKey);

          if (!feature) {
            return;
          }

          updateDraft(editingSubscriptionId, (draft) => ({
            ...toggleFeatureSelection(draft, feature),
          }));
        }}
        onClose={() => setEditingSubscriptionId(null)}
        onSubmit={() => editingSubscriptionId ? handleSaveSubscription(editingSubscriptionId) : undefined}
      />
      <SubscriptionStepperModal
        key={createModalKey}
        isOpen={isCreateModalOpen}
        draft={createDraft}
        assignableFeatures={assignableFeatures}
        upcomingFeatures={upcomingFeatures}
        mode="create"
        isCreating={isCreating}
        onDraftChange={setCreateDraft}
        onToggleFeature={(featureKey) => {
          const feature = assignableFeatures.find((item) => item.key === featureKey);

          if (!feature) {
            return;
          }

          setCreateDraft((current) => toggleFeatureSelection(current, feature));
        }}
        onClose={() => {
          if (isCreating) {
            return;
          }

          setIsCreateModalOpen(false);
        }}
        onSubmit={handleCreateSubscription}
      />

      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Subscriptions", value: totals.totalSubscriptions, icon: Layers3 },
            { label: "Public plans", value: totals.publicCount, icon: Sparkles },
            { label: "Assigned orgs", value: totals.assignedCount, icon: ShieldCheck },
            { label: "Default public", value: totals.defaultCount, icon: PackagePlus },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{value}</p>
                </div>
                <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3">
                  <Icon className="h-5 w-5 text-[var(--color-brand-strong)]" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">Create subscription</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
                The creation flow now uses a stepper wizard so plan details, access selection, and review are handled in sequence instead of inside the main page layout.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCreateModalKey((current) => current + 1);
                setIsCreateModalOpen(true);
              }}
              className="theme-btn-primary inline-flex h-11 items-center rounded-2xl px-5 text-sm font-medium"
            >
              Create subscription
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Step 1</p>
              <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">Plan details</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Name, visibility, description, and default-public behavior.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Step 2</p>
              <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">Features</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Pick implemented features and review upcoming ones separately.</p>
            </div>
            <div className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Step 3</p>
              <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">Review</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Confirm the selected features and functionalities before saving the subscription.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Manage subscriptions</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Update features, archive plans, and control which plan is public by default.
            </p>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[var(--color-border-strong)] bg-white shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--color-panel)]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Subscription</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Functionalities</TableHead>
                    <TableHead>Organizations</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-24 text-center text-[var(--color-muted)]">
                        No subscriptions yet.
                      </TableCell>
                    </TableRow>
                  ) : subscriptions.map((subscription) => {
                    const assignedOrganizations = assignments.filter((detail) => detail.subscription?.id === subscription.id).length;

                    return (
                      <TableRow key={subscription.id}>
                        <TableCell className="align-top">
                          <div>
                            <p className="font-semibold text-[var(--color-ink)]">{subscription.name}</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {subscription.description || "No description provided."}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {subscription.visibility}
                          </span>
                        </TableCell>
                        <TableCell className="align-top">
                          <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {subscription.status}
                          </span>
                        </TableCell>
                        <TableCell className="align-top text-sm text-[var(--color-ink)]">
                          {subscription.featureKeys.length}
                        </TableCell>
                        <TableCell className="align-top text-sm text-[var(--color-ink)]">
                          {subscription.functionalityKeys.length}
                        </TableCell>
                        <TableCell className="align-top text-sm text-[var(--color-ink)]">
                          {assignedOrganizations}
                        </TableCell>
                        <TableCell className="align-top">
                          {subscription.isDefaultPublic ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Default
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-muted)]">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingModalKey((current) => current + 1);
                                setEditingSubscriptionId(subscription.id);
                              }}
                              className="theme-action-button theme-action-button-secondary inline-flex h-9 items-center rounded-xl px-3 text-sm"
                            >
                              Edit
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Organization assignments</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              One subscription can be assigned to many organizations. Clearing an assignment reverts the org to legacy default access.
            </p>
          </div>

          <div className="space-y-3">
            {assignments.map((detail) => (
              <div
                key={detail.organization.id}
                className="grid gap-3 rounded-[22px] border border-[var(--color-border)] bg-white p-4 xl:grid-cols-[minmax(0,1fr)_220px_140px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{detail.organization.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {detail.organization.slug} · current plan {detail.subscription?.name ?? "Legacy default"}
                  </p>
                </div>
                <select
                  value={assignmentSelections[detail.organization.slug] ?? ""}
                  onChange={(event) => setAssignmentSelections((current) => ({
                    ...current,
                    [detail.organization.slug]: event.target.value,
                  }))}
                  className="h-11 rounded-2xl border border-[var(--color-border)] px-4 text-sm outline-none focus:border-[var(--color-brand-strong)]"
                >
                  <option value="">Legacy default</option>
                  {activeSubscriptions.map((subscription) => (
                    <option key={subscription.id} value={subscription.id}>
                      {subscription.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={savingOrganizationSlug === detail.organization.slug}
                  onClick={() => void handleAssignmentSave(detail.organization.slug)}
                  className="theme-btn-primary inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium disabled:opacity-60"
                >
                  {savingOrganizationSlug === detail.organization.slug ? "Saving..." : "Save assignment"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
