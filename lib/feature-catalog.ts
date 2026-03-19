export const FEATURE_STATUSES = [
  "implemented",
  "beta",
  "planned",
  "upcoming",
  "deprecated",
  "internal_only",
] as const;

export const FEATURE_VISIBILITIES = ["public", "private", "internal"] as const;
export const FEATURE_DEFAULT_ACCESS = ["none", "included_by_default", "system_required"] as const;
export const FEATURE_SECURITY_LEVELS = ["low", "standard", "sensitive", "critical"] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
export type FeatureVisibility = (typeof FEATURE_VISIBILITIES)[number];
export type FeatureDefaultAccess = (typeof FEATURE_DEFAULT_ACCESS)[number];
export type FeatureSecurityLevel = (typeof FEATURE_SECURITY_LEVELS)[number];

export type FeatureFunctionalityRecord = {
  key: string;
  name: string;
  description: string;
  status: FeatureStatus;
  securityLevel: FeatureSecurityLevel;
};

export type FeatureCatalogRecord = {
  key: string;
  name: string;
  module: "hire" | "engage" | "manage" | "retain" | "platform_core";
  category: string;
  description: string;
  status: FeatureStatus;
  visibility: FeatureVisibility;
  defaultAccess: FeatureDefaultAccess;
  securityLevel: FeatureSecurityLevel;
  dependencies: string[];
  functionalities: FeatureFunctionalityRecord[];
};

const FEATURE_CATALOG: readonly FeatureCatalogRecord[] = [
  {
    key: "tenant_dashboard",
    name: "Tenant Dashboard",
    module: "platform_core",
    category: "core",
    description: "Organization landing experience and core tenant portal shell.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "low",
    dependencies: [],
    functionalities: [
      {
        key: "tenant_dashboard.home",
        name: "Dashboard Home",
        description: "Tenant portal landing page and summary entry point.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "tenant_dashboard.navigation",
        name: "Portal Navigation",
        description: "Sidebar navigation and portal shell for tenant admin users.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "tenant_dashboard.subscription_summary",
        name: "Subscription Summary",
        description: "Plan summary and access visibility on the tenant landing page.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "tenant_jobs",
    name: "Job Management",
    module: "hire",
    category: "operations",
    description: "Manage job postings, editing workflows, and publishing controls.",
    status: "implemented",
    visibility: "public",
    defaultAccess: "included_by_default",
    securityLevel: "standard",
    dependencies: ["tenant_dashboard"],
    functionalities: [
      {
        key: "tenant_jobs.list",
        name: "List Jobs",
        description: "View the tenant job list and job summaries.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.create",
        name: "Create Jobs",
        description: "Create new job postings from the tenant workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.edit",
        name: "Edit Jobs",
        description: "Update existing job details and content.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.publish",
        name: "Publish Controls",
        description: "Publish and unpublish job postings.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.delete",
        name: "Delete Jobs",
        description: "Soft-delete jobs from the tenant workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.ats_configuration",
        name: "ATS Configuration",
        description: "Configure ATS settings and evaluation rules on jobs.",
        status: "upcoming",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.knockout_questions",
        name: "Knockout Questions",
        description: "Configure knockout questions for job applications.",
        status: "upcoming",
        securityLevel: "standard",
      },
      {
        key: "tenant_jobs.requisitions",
        name: "Job Requisitions",
        description: "Manage requisition workflows before publishing roles.",
        status: "upcoming",
        securityLevel: "sensitive",
      },
    ],
  },
  {
    key: "tenant_candidates",
    name: "Candidate Pipeline",
    module: "hire",
    category: "operations",
    description: "Review applications, candidate records, and pipeline actions.",
    status: "implemented",
    visibility: "public",
    defaultAccess: "included_by_default",
    securityLevel: "standard",
    dependencies: ["tenant_dashboard"],
    functionalities: [
      {
        key: "tenant_candidates.directory",
        name: "Candidate Directory",
        description: "View the tenant-wide candidate list.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.application_review",
        name: "Application Review",
        description: "Review candidate applications and statuses.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.detail",
        name: "Candidate Detail",
        description: "Access candidate profiles and CV detail views.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.cv_preview",
        name: "CV Preview",
        description: "Preview and inspect submitted CV files.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.chat",
        name: "Candidate Chat",
        description: "Chat with candidates from the pipeline workspace.",
        status: "upcoming",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.bulk_actions",
        name: "Bulk Actions",
        description: "Run bulk shortlist, reject, and pipeline updates.",
        status: "upcoming",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.tagging",
        name: "Talent Tagging",
        description: "Tag and segment candidates inside the pipeline.",
        status: "upcoming",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "tenant_settings",
    name: "Tenant Settings",
    module: "platform_core",
    category: "governance",
    description: "Organization profile, branding, membership, and ownership controls.",
    status: "implemented",
    visibility: "public",
    defaultAccess: "included_by_default",
    securityLevel: "sensitive",
    dependencies: ["tenant_dashboard"],
    functionalities: [
      {
        key: "tenant_settings.organization_profile",
        name: "Organization Profile",
        description: "Manage organization name, slug, logo, and profile data.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.branding",
        name: "Branding",
        description: "Manage tenant theme, tab title, and tab icon settings.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.members",
        name: "Member Management",
        description: "Invite, update, and remove organization members.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.root_owner_transfer",
        name: "Root Owner Transfer",
        description: "Transfer organization root ownership.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "tenant_settings.domain_verification",
        name: "Domain Verification",
        description: "Verify tenant custom domains and sender domains.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_domain",
        name: "Custom Domain",
        description: "Configure dedicated hostnames for the tenant portal.",
        status: "upcoming",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_email_domain",
        name: "Custom Email Domain",
        description: "Configure branded sender domains for outbound email.",
        status: "upcoming",
        securityLevel: "sensitive",
      },
    ],
  },
  {
    key: "employee_directory",
    name: "Employee Directory",
    module: "manage",
    category: "workforce_operations",
    description: "Post-hire employee directory and profile management.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "sensitive",
    dependencies: ["tenant_dashboard"],
    functionalities: [
      {
        key: "employee_directory.list",
        name: "Employee Directory",
        description: "View and search employee records.",
        status: "planned",
        securityLevel: "sensitive",
      },
      {
        key: "employee_directory.profile",
        name: "Employee Profiles",
        description: "Manage employee profile details and metadata.",
        status: "planned",
        securityLevel: "sensitive",
      },
      {
        key: "employee_directory.teams",
        name: "Team Assignment",
        description: "Assign employees to departments and teams.",
        status: "planned",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "shift_scheduling",
    name: "Shift Scheduling",
    module: "manage",
    category: "workforce_operations",
    description: "Roster and scheduling capabilities for operations teams.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "standard",
    dependencies: ["employee_directory"],
    functionalities: [
      {
        key: "shift_scheduling.rosters",
        name: "Roster Planning",
        description: "Create and manage roster plans.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "shift_scheduling.publish",
        name: "Shift Publishing",
        description: "Publish shifts to employees and teams.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "shift_scheduling.adjustments",
        name: "Schedule Adjustments",
        description: "Handle shift swaps and schedule changes.",
        status: "planned",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "time_tracking",
    name: "Time Tracking",
    module: "manage",
    category: "workforce_operations",
    description: "Attendance and clock-in or clock-out capabilities.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "standard",
    dependencies: ["employee_directory"],
    functionalities: [
      {
        key: "time_tracking.attendance",
        name: "Attendance Capture",
        description: "Capture attendance and time events.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "time_tracking.timesheets",
        name: "Timesheet Visibility",
        description: "View and review timesheet records.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "time_tracking.manager_review",
        name: "Manager Review",
        description: "Manager review and approval of time records.",
        status: "planned",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "leave_management",
    name: "Leave Management",
    module: "manage",
    category: "workforce_operations",
    description: "Leave requests, balances, and approval workflows.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "standard",
    dependencies: ["employee_directory"],
    functionalities: [
      {
        key: "leave_management.requests",
        name: "Leave Requests",
        description: "Submit and track leave requests.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "leave_management.approvals",
        name: "Leave Approvals",
        description: "Approve or reject employee leave requests.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "leave_management.history",
        name: "Leave History",
        description: "View leave balances and historical leave records.",
        status: "planned",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "employee_reviews",
    name: "Employee Reviews",
    module: "retain",
    category: "performance",
    description: "Structured review cycles and review records.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "sensitive",
    dependencies: ["employee_directory"],
    functionalities: [
      {
        key: "employee_reviews.cycles",
        name: "Review Cycles",
        description: "Create and manage review cycles.",
        status: "planned",
        securityLevel: "sensitive",
      },
      {
        key: "employee_reviews.forms",
        name: "Review Forms",
        description: "Define review forms and answer structures.",
        status: "planned",
        securityLevel: "sensitive",
      },
      {
        key: "employee_reviews.summaries",
        name: "Review Summaries",
        description: "Review summary visibility and history.",
        status: "planned",
        securityLevel: "sensitive",
      },
    ],
  },
  {
    key: "goal_tracking",
    name: "Goal Tracking",
    module: "retain",
    category: "performance",
    description: "Goal setting and progress tracking for employees and managers.",
    status: "planned",
    visibility: "private",
    defaultAccess: "none",
    securityLevel: "standard",
    dependencies: ["employee_directory"],
    functionalities: [
      {
        key: "goal_tracking.definition",
        name: "Goal Definition",
        description: "Define and assign employee goals.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "goal_tracking.progress",
        name: "Goal Progress",
        description: "Track and update progress against goals.",
        status: "planned",
        securityLevel: "standard",
      },
      {
        key: "goal_tracking.manager_review",
        name: "Manager Goal Review",
        description: "Manager review of employee goals and progress.",
        status: "planned",
        securityLevel: "standard",
      },
    ],
  },
] as const;

export const listFeatureCatalog = (): FeatureCatalogRecord[] => {
  return [...FEATURE_CATALOG].sort((left, right) => left.name.localeCompare(right.name));
};

export const getFeatureCatalogRecord = (featureKey: string): FeatureCatalogRecord | null => {
  return FEATURE_CATALOG.find((feature) => feature.key === featureKey) ?? null;
};

export const getFeatureByFunctionalityKey = (functionalityKey: string): FeatureCatalogRecord | null => {
  return FEATURE_CATALOG.find((feature) =>
    feature.functionalities.some((functionality) => functionality.key === functionalityKey),
  ) ?? null;
};

export const getFunctionalityRecord = (
  functionalityKey: string,
): FeatureFunctionalityRecord | null => {
  for (const feature of FEATURE_CATALOG) {
    const functionality = feature.functionalities.find((item) => item.key === functionalityKey);

    if (functionality) {
      return functionality;
    }
  }

  return null;
};

export const isFeatureStatusAssignable = (status: FeatureStatus) => {
  return status === "implemented" || status === "beta";
};

export const isFunctionalityStatusAssignable = (status: FeatureStatus) => {
  return status === "implemented" || status === "beta";
};

export const listAssignableFeatures = (): FeatureCatalogRecord[] => {
  return listFeatureCatalog().filter((feature) => isFeatureStatusAssignable(feature.status));
};

export const listAssignableFunctionalities = (featureKey: string): FeatureFunctionalityRecord[] => {
  const feature = getFeatureCatalogRecord(featureKey);

  if (!feature) {
    return [];
  }

  return feature.functionalities.filter((functionality) => isFunctionalityStatusAssignable(functionality.status));
};

export const getLegacyDefaultFeatureKeys = (): string[] => {
  return FEATURE_CATALOG
    .filter((feature) => feature.defaultAccess === "included_by_default" || feature.defaultAccess === "system_required")
    .map((feature) => feature.key)
    .sort();
};

export const getLegacyDefaultFunctionalityKeys = (): string[] => {
  return FEATURE_CATALOG
    .filter((feature) => feature.defaultAccess === "included_by_default" || feature.defaultAccess === "system_required")
    .flatMap((feature) =>
      feature.functionalities
        .filter((functionality) => isFunctionalityStatusAssignable(functionality.status))
        .map((functionality) => functionality.key),
    )
    .sort();
};

export const isFeatureEnabled = (featureKeys: Iterable<string>, featureKey: string) => {
  const normalizedFeatureKey = featureKey.trim();

  if (!normalizedFeatureKey) {
    return false;
  }

  for (const key of featureKeys) {
    if (key === normalizedFeatureKey) {
      return true;
    }
  }

  return false;
};
