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
  subscriptionSelectable: boolean;
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
    subscriptionSelectable: true,
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
        key: "tenant_dashboard.overview",
        name: "Organization Overview",
        description: "Display organization summary details, logo, and profile context on the dashboard.",
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
      {
        key: "tenant_dashboard.quick_actions",
        name: "Quick Actions",
        description: "Show dashboard cards for jobs, candidates, settings, and other available workspaces.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "tenant_dashboard.feature_gated_cards",
        name: "Feature-Gated Cards",
        description: "Hide or show dashboard navigation cards based on enabled tenant features.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "tenant_dashboard.setup_prompt",
        name: "Setup Prompt",
        description: "Prompt owners to complete branding, members, and domain configuration.",
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
    subscriptionSelectable: true,
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
        key: "tenant_jobs.search",
        name: "Search Jobs",
        description: "Search tenant jobs by title, code, or department.",
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
        key: "tenant_jobs.preview",
        name: "Preview Jobs",
        description: "Preview job content before or after publication.",
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
        status: "implemented",
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
    subscriptionSelectable: true,
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
        key: "tenant_candidates.search",
        name: "Search Candidates",
        description: "Search candidates by person details or related job information.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_candidates.status_filter",
        name: "Status Filter",
        description: "Filter candidates by review or application status.",
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
        key: "tenant_candidates.profile_open",
        name: "Open Candidate Profile",
        description: "Open a candidate detail view from the tenant candidate directory.",
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
        status: "implemented",
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
    subscriptionSelectable: true,
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
        key: "tenant_settings.organization_profile_view",
        name: "Organization Profile View",
        description: "View organization profile, registration reference details, and read-only metadata.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.logo_upload",
        name: "Logo Upload",
        description: "Upload and save organization logo files.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.logo_url",
        name: "Logo URL",
        description: "Configure organization logo via an external image URL.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.slug_check",
        name: "Slug Availability Check",
        description: "Validate and check organization portal slug availability.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.slug_update",
        name: "Slug Update",
        description: "Update the organization portal slug and redirect to the new URL.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "tenant_settings.reference_fields",
        name: "Registration Reference Fields",
        description: "View registration-time company size and hiring volume reference details.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "tenant_settings.branding",
        name: "Branding",
        description: "Manage tenant theme, tab title, and tab icon settings.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.theme_presets",
        name: "Theme Presets",
        description: "Apply predefined tenant theme presets.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.theme_customization",
        name: "Theme Customization",
        description: "Customize portal theme colors and preview them live.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.theme_reset",
        name: "Theme Reset",
        description: "Reset unsaved theme changes back to preset defaults.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.tab_title",
        name: "Browser Tab Title",
        description: "Configure a tenant-specific browser tab title.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.tab_icon",
        name: "Browser Tab Icon",
        description: "Configure a tenant-specific browser tab icon.",
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
        key: "tenant_settings.members_list",
        name: "Members List",
        description: "View tenant administrators and ownership roles.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.members_invite",
        name: "Invite Members",
        description: "Invite new organization administrators by email.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.members_role_update",
        name: "Update Member Role",
        description: "Update existing organization administrator roles.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.members_remove",
        name: "Remove Member",
        description: "Remove organization members from the tenant workspace.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.root_owner_guard",
        name: "Root Owner Guard",
        description: "Protect the tenant root owner from removal and unsafe ownership changes.",
        status: "implemented",
        securityLevel: "critical",
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
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_domain_dns",
        name: "Custom Domain DNS Instructions",
        description: "Display DNS records required for custom domain activation.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_domain_remove",
        name: "Remove Custom Domain",
        description: "Remove a configured custom domain from the tenant.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_email_domain",
        name: "Custom Email Domain",
        description: "Configure branded sender domains for outbound email.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_email_domain_dns",
        name: "Custom Email DNS Instructions",
        description: "Display SPF and DKIM records required for outbound email verification.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_email_sender_name",
        name: "Sender Display Name",
        description: "Configure branded sender display names for tenant email.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "tenant_settings.custom_email_domain_remove",
        name: "Remove Custom Email Domain",
        description: "Remove the configured tenant email sending domain.",
        status: "implemented",
        securityLevel: "sensitive",
      },
    ],
  },
  {
    key: "tenant_member_applications",
    name: "Tenant Member Applications",
    module: "hire",
    category: "self_service",
    subscriptionSelectable: true,
    description: "Member-facing application history and withdrawal inside the tenant portal.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["tenant_dashboard"],
    functionalities: [
      {
        key: "tenant_member_applications.list",
        name: "Applications List",
        description: "View a member's submitted applications inside the tenant portal.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_member_applications.search",
        name: "Applications Search",
        description: "Search member applications by code, title, or CV name.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_member_applications.status_filter",
        name: "Applications Status Filter",
        description: "Filter member applications by review status.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_member_applications.cv_preview",
        name: "Applications CV Preview",
        description: "Preview the submitted CV linked to a member application.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "tenant_member_applications.withdraw",
        name: "Withdraw Application",
        description: "Withdraw a pending member application from the tenant portal.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "candidate_dashboard",
    name: "Candidate Dashboard",
    module: "hire",
    category: "candidate_experience",
    subscriptionSelectable: true,
    description: "Candidate landing dashboard with application summary and recent activity.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "low",
    dependencies: [],
    functionalities: [
      {
        key: "candidate_dashboard.overview",
        name: "Dashboard Overview",
        description: "Show submission count, profile status, and profile update state.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "candidate_dashboard.latest_activity",
        name: "Latest Activity",
        description: "Show latest submission details, review state, and rejection reason.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "candidate_dashboard.cv_preview",
        name: "Latest CV Preview",
        description: "Preview the latest submitted CV from the candidate dashboard.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "candidate_profile",
    name: "Candidate Profile",
    module: "hire",
    category: "candidate_experience",
    subscriptionSelectable: true,
    description: "Candidate profile management and validation for reusable application data.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: [],
    functionalities: [
      {
        key: "candidate_profile.view",
        name: "Profile View",
        description: "Open and view the candidate profile management page.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_profile.edit",
        name: "Profile Edit",
        description: "Edit candidate personal details used across applications.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_profile.validation",
        name: "Profile Validation",
        description: "Validate profile completeness before job applications.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "candidate_job_application",
    name: "Candidate Job Application",
    module: "hire",
    category: "candidate_experience",
    subscriptionSelectable: true,
    description: "Candidate job browsing, job detail review, and application submission flow.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["candidate_profile"],
    functionalities: [
      {
        key: "candidate_job_application.list",
        name: "Job List",
        description: "Browse published jobs available to candidates.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.detail",
        name: "Job Detail",
        description: "Open detailed job pages before applying.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.submit",
        name: "Application Submit",
        description: "Upload CV and submit a job application.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.duplicate_guard",
        name: "Duplicate Guard",
        description: "Prevent duplicate active applications for the same job.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.retry_limit",
        name: "Retry Limit",
        description: "Enforce per-job retry limits after rejection.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.withdraw",
        name: "Withdraw From Job",
        description: "Withdraw a pending application directly from the job page.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_job_application.chat_entry",
        name: "Chat Entry",
        description: "Enter candidate chat from an accepted application state.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "candidate_application_history",
    name: "Candidate Application History",
    module: "hire",
    category: "candidate_experience",
    subscriptionSelectable: true,
    description: "Candidate application history, filters, CV previews, and withdrawals.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["candidate_job_application"],
    functionalities: [
      {
        key: "candidate_application_history.list",
        name: "History List",
        description: "List candidate applications and statuses.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_application_history.search",
        name: "History Search",
        description: "Search candidate application history.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_application_history.filter",
        name: "History Filter",
        description: "Filter candidate application history by status.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_application_history.cv_preview",
        name: "History CV Preview",
        description: "Preview previously submitted CVs from application history.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_application_history.withdraw",
        name: "History Withdraw",
        description: "Withdraw pending applications from the history view.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_application_history.chat_indicator",
        name: "Chat Indicator",
        description: "Display unread chat indicators in application history.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "candidate_chat",
    name: "Candidate Chat",
    module: "hire",
    category: "candidate_experience",
    subscriptionSelectable: true,
    description: "Candidate chat inbox and accepted-application messaging workspace.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["candidate_application_history"],
    functionalities: [
      {
        key: "candidate_chat.inbox",
        name: "Chat Inbox",
        description: "View candidate chat inbox and conversation summaries.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_chat.workspace",
        name: "Chat Workspace",
        description: "Open and use the candidate chat workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_chat.send",
        name: "Send Message",
        description: "Send messages from the candidate chat workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_chat.edit",
        name: "Edit Message",
        description: "Edit candidate-authored messages.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_chat.delete",
        name: "Delete Message",
        description: "Delete candidate-authored chat messages.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "candidate_chat.read_receipts",
        name: "Read Receipts",
        description: "Display read receipt state for candidate messages.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "candidate_chat.typing_indicator",
        name: "Typing Indicator",
        description: "Display typing activity in candidate chat.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "admin_dashboard",
    name: "Admin Dashboard",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Admin dashboard summarizing jobs, candidates, applications, and shortcuts.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: [],
    functionalities: [
      {
        key: "admin_dashboard.overview",
        name: "Dashboard Overview",
        description: "Show admin, candidate, job, and application summary metrics.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_dashboard.recent_candidates",
        name: "Recent Candidates",
        description: "Show recent candidate activity on the dashboard.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_dashboard.navigation",
        name: "Dashboard Navigation",
        description: "Show quick links into jobs, candidates, settings, and audit.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "admin_jobs",
    name: "Admin Jobs",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Admin job workspace for search, publishing, editing, and CV exports.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["admin_dashboard"],
    functionalities: [
      {
        key: "admin_jobs.list",
        name: "Jobs List",
        description: "List jobs in the admin jobs workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.search",
        name: "Jobs Search",
        description: "Search jobs by code, title, department, or location.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.status_filter",
        name: "Jobs Status Filter",
        description: "Filter jobs by draft or published state.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.table_view",
        name: "Jobs Table View",
        description: "Use the admin jobs table view with server pagination.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.card_view",
        name: "Jobs Card View",
        description: "Use the admin jobs card view with infinite loading.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.create",
        name: "Create Job",
        description: "Create jobs from the admin workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.edit",
        name: "Edit Job",
        description: "Edit job content and settings.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.preview",
        name: "Preview Job",
        description: "Preview a job from the admin workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.public_link",
        name: "Public Link",
        description: "Open or copy the public job link.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.candidates_open",
        name: "Open Job Candidates",
        description: "Open the per-job candidate pipeline page.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.cv_zip_download",
        name: "CV ZIP Download",
        description: "Download all CVs for a job as a ZIP archive.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_jobs.publish_toggle",
        name: "Publish Toggle",
        description: "Publish or unpublish jobs.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_jobs.delete",
        name: "Delete Job",
        description: "Soft-delete a job from the admin workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "admin_candidates",
    name: "Admin Candidates",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Admin candidate directory with search, status summaries, and ATS visibility.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["admin_dashboard"],
    functionalities: [
      {
        key: "admin_candidates.list",
        name: "Candidates List",
        description: "List candidates in the admin directory.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.search",
        name: "Candidates Search",
        description: "Search candidates by personal and identity details.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.status_filter",
        name: "Candidates Status Filter",
        description: "Filter candidates by latest review status.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.table_view",
        name: "Candidates Table View",
        description: "Use the candidate directory in table mode.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.card_view",
        name: "Candidates Card View",
        description: "Use the candidate directory in card mode.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.ats_summary",
        name: "ATS Summary",
        description: "View ATS summary states and scores in the directory.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_candidates.detail_open",
        name: "Open Candidate Detail",
        description: "Open the candidate detail workspace from the directory.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "admin_candidate_review",
    name: "Admin Candidate Review",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Detailed candidate review workflow, ATS inspection, and application decisions.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "sensitive",
    dependencies: ["admin_candidates"],
    functionalities: [
      {
        key: "admin_candidate_review.profile_view",
        name: "Candidate Profile View",
        description: "Inspect full candidate profile details.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.submission_history",
        name: "Submission History",
        description: "Review all submissions made by a candidate.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.accept",
        name: "Accept Application",
        description: "Accept a candidate application.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.reject",
        name: "Reject Application",
        description: "Reject a candidate application.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.rejection_reason",
        name: "Rejection Reason",
        description: "Provide and display rejection reasons.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.cv_preview",
        name: "CV Preview",
        description: "Preview submitted CVs from candidate detail.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.application_delete",
        name: "Delete Application",
        description: "Delete an application from candidate detail.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.ats_view",
        name: "View ATS",
        description: "Inspect ATS score, status, and details.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.ats_recalculate",
        name: "Recalculate ATS",
        description: "Queue ATS recalculation from candidate detail.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_candidate_review.chat_open",
        name: "Open Chat",
        description: "Open accepted-application chat from candidate detail.",
        status: "implemented",
        securityLevel: "standard",
      },
    ],
  },
  {
    key: "admin_job_candidates",
    name: "Admin Job Candidates",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Per-job candidate pipeline view with ATS filters, ranking, and bulk operations.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "sensitive",
    dependencies: ["admin_jobs"],
    functionalities: [
      {
        key: "admin_job_candidates.list",
        name: "Job Candidates List",
        description: "List applications for a specific job.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.search",
        name: "Job Candidates Search",
        description: "Search job candidates by candidate details or ATS metadata.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.review_filter",
        name: "Review Filter",
        description: "Filter job candidates by review status.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.ats_filter",
        name: "ATS Filter",
        description: "Filter job candidates by ATS score bands.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.fit_filter",
        name: "Fit Filter",
        description: "Filter job candidates by ATS decision band.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.rank",
        name: "Ranking",
        description: "Display ranked candidate ordering in the job pipeline.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.bulk_select",
        name: "Bulk Select",
        description: "Select multiple job candidates for actions.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.bulk_ats_recalculate",
        name: "Bulk ATS Recalculation",
        description: "Run ATS recalculation for multiple selected candidates.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.accept",
        name: "Accept From Job Pipeline",
        description: "Accept a job candidate from the job pipeline view.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.reject",
        name: "Reject From Job Pipeline",
        description: "Reject a job candidate from the job pipeline view.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.delete",
        name: "Delete From Job Pipeline",
        description: "Delete an application from the job candidate pipeline.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.cv_preview",
        name: "Job Pipeline CV Preview",
        description: "Preview a CV from the job pipeline view.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_job_candidates.candidate_open",
        name: "Open Candidate Profile",
        description: "Open candidate profile from the job pipeline view.",
        status: "implemented",
        securityLevel: "sensitive",
      },
    ],
  },
  {
    key: "admin_chat",
    name: "Admin Chat",
    module: "hire",
    category: "admin_operations",
    subscriptionSelectable: true,
    description: "Admin chat inbox, grouped conversation views, and chat workspaces.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "standard",
    dependencies: ["admin_candidate_review"],
    functionalities: [
      {
        key: "admin_chat.inbox",
        name: "Chat Inbox",
        description: "View the admin chat inbox.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.people_grouping",
        name: "People Grouping",
        description: "Group admin chats by participant.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.filter",
        name: "Chat Filter",
        description: "Filter admin chats by unread or read state.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.search",
        name: "Chat Search",
        description: "Search admin chats by person, job, or preview text.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.workspace",
        name: "Chat Workspace",
        description: "Open the admin application chat workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.send",
        name: "Send Message",
        description: "Send messages from the admin chat workspace.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.edit",
        name: "Edit Message",
        description: "Edit admin-authored chat messages.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.delete",
        name: "Delete Message",
        description: "Delete admin-authored chat messages.",
        status: "implemented",
        securityLevel: "standard",
      },
      {
        key: "admin_chat.delete_all_for_participant",
        name: "Delete Participant Chats",
        description: "Delete all chats for a participant from the admin inbox.",
        status: "implemented",
        securityLevel: "sensitive",
      },
      {
        key: "admin_chat.read_receipts",
        name: "Read Receipts",
        description: "Display read receipts for admin chat messages.",
        status: "implemented",
        securityLevel: "low",
      },
      {
        key: "admin_chat.typing_indicator",
        name: "Typing Indicator",
        description: "Display typing activity in admin chat.",
        status: "implemented",
        securityLevel: "low",
      },
    ],
  },
  {
    key: "admin_access_management",
    name: "Admin Access Management",
    module: "platform_core",
    category: "governance",
    subscriptionSelectable: true,
    description: "Admin account provisioning, editing, and deletion controls.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "critical",
    dependencies: ["admin_dashboard"],
    functionalities: [
      {
        key: "admin_access_management.list",
        name: "Admin List",
        description: "View admin accounts.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_access_management.search",
        name: "Admin Search",
        description: "Search admin accounts by email.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_access_management.add",
        name: "Add Admin",
        description: "Create a new admin account.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_access_management.edit",
        name: "Edit Admin",
        description: "Edit an existing admin account email.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_access_management.delete",
        name: "Delete Admin",
        description: "Delete an admin account.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_access_management.self_delete_guard",
        name: "Self Delete Guard",
        description: "Prevent the current admin from deleting their own account.",
        status: "implemented",
        securityLevel: "critical",
      },
    ],
  },
  {
    key: "admin_audit",
    name: "Admin Audit",
    module: "platform_core",
    category: "governance",
    subscriptionSelectable: true,
    description: "Audit records for admin actions and sensitive system activity.",
    status: "implemented",
    visibility: "internal",
    defaultAccess: "system_required",
    securityLevel: "critical",
    dependencies: ["admin_dashboard"],
    functionalities: [
      {
        key: "admin_audit.list",
        name: "Audit List",
        description: "List audit events.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_audit.actor_filter",
        name: "Actor Filter",
        description: "Filter audit events by actor.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_audit.search",
        name: "Audit Search",
        description: "Search audit records.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_audit.table_view",
        name: "Audit Table View",
        description: "View audit records in table mode.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_audit.card_view",
        name: "Audit Card View",
        description: "View audit records in card mode.",
        status: "implemented",
        securityLevel: "critical",
      },
      {
        key: "admin_audit.detail_modal",
        name: "Audit Detail Modal",
        description: "Inspect detailed metadata for an audit event.",
        status: "implemented",
        securityLevel: "critical",
      },
    ],
  },
  {
    key: "employee_directory",
    name: "Employee Directory",
    module: "manage",
    category: "workforce_operations",
    subscriptionSelectable: true,
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
    subscriptionSelectable: true,
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
    subscriptionSelectable: true,
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
    subscriptionSelectable: true,
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
    subscriptionSelectable: true,
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
    subscriptionSelectable: true,
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
  return listFeatureCatalog().filter(
    (feature) => feature.subscriptionSelectable && isFeatureStatusAssignable(feature.status),
  );
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

export const isFunctionalityEnabled = (
  functionalityKeys: Iterable<string>,
  functionalityKey: string,
) => {
  const normalizedFunctionalityKey = functionalityKey.trim();

  if (!normalizedFunctionalityKey) {
    return false;
  }

  for (const key of functionalityKeys) {
    if (key === normalizedFunctionalityKey) {
      return true;
    }
  }

  return false;
};
