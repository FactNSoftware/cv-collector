# Portal Capability Inventory

Related docs:

- [Project Overview](../project-overview.md)
- [Platform Product Architecture](../platform-product-architecture.md)
- [Subscriptions And Feature Access](./subscriptions-and-feature-access.md)
- [Feature Security And Authorization](./feature-security-and-authorization.md)
- [Candidate Experience](./candidate-experience.md)
- [Job Management](./job-management.md)
- [Application Lifecycle](./application-lifecycle.md)
- [ATS Evaluation](./ats-evaluation.md)
- [Chat And Messaging](./chat-and-messaging.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This document inventories the implemented capabilities across the three main product-facing portal surfaces:

- candidate portal
- admin portal
- organization owner portal

The goal is to define subscription-ready feature groups and lower-level functionality keys based on the product that already exists, instead of designing packages from abstract ideas alone.

This is an implementation inventory first.

It should be used as the source document when:

- creating subscription bundles
- defining feature catalog records
- defining functionality keys under each feature
- deciding what should be hidden or blocked in UI and backend

## Portal Surfaces

### Candidate Portal

Primary purpose:

- let a candidate manage profile data
- browse jobs
- submit applications
- track application history
- communicate after acceptance

Implemented capability areas:

- dashboard overview
- profile management
- job browsing and direct apply
- application lifecycle visibility
- CV preview and withdrawal
- accepted-application chat

### Admin Portal

Primary purpose:

- run hiring operations
- manage jobs
- review candidates and applications
- use ATS
- manage admin access
- review audit history

Implemented capability areas:

- operations dashboard
- jobs workspace
- candidate directory
- candidate detail and review actions
- job-specific candidate pipeline view
- admin chat inbox and chat workspaces
- admin access management
- audit trail

### Organization Owner Portal

Primary purpose:

- manage tenant organization operations and branding
- administer jobs and candidates within the tenant
- configure tenant identity and administrators

Implemented capability areas:

- tenant dashboard
- tenant jobs
- tenant candidates
- tenant member-facing applications area
- organization profile and slug management
- portal branding and theme
- browser tab branding
- custom domain
- custom email domain
- administrator management and root-owner transfer

## Candidate Portal Inventory

### Candidate Dashboard

Implemented functionality:

- show submitted application count
- show profile completion status
- show profile updated date
- show latest submission summary
- show latest application review status
- show rejection reason when available
- preview latest submitted CV
- quick links to apply, history, and profile pages

Recommended feature group:

- `candidate_dashboard`

Recommended functionality keys:

- `candidate_dashboard_overview`
- `candidate_dashboard_latest_activity`
- `candidate_dashboard_cv_preview`

### Candidate Profile

Implemented functionality:

- open profile management page
- edit first name
- edit last name
- edit phone
- edit NIC/passport or ID value
- save reusable application profile
- enforce profile completeness before application submission

Recommended feature group:

- `candidate_profile`

Recommended functionality keys:

- `candidate_profile_view`
- `candidate_profile_edit`
- `candidate_profile_validation`

### Candidate Job Discovery And Apply

Implemented functionality:

- browse published jobs
- open a direct job detail page
- review job detail before applying
- upload CV PDF
- submit application
- prevent duplicate active application
- prevent apply when retry limit is reached
- prompt for missing profile details before submit
- view already-submitted state for a job
- withdraw pending application from the job page
- open accepted chat from the job page

Recommended feature group:

- `candidate_job_application`

Recommended functionality keys:

- `candidate_job_list`
- `candidate_job_detail`
- `candidate_application_submit`
- `candidate_application_duplicate_guard`
- `candidate_application_retry_limit`
- `candidate_application_withdraw_from_job`
- `candidate_application_chat_entry`

### Candidate Application History

Implemented functionality:

- list all candidate applications
- search by job code, title, opening, or CV name
- filter by review status
- infinite loading / progressive list loading
- show review timestamps
- show rejection reason
- show unread chat indicator
- open accepted-application chat
- preview submitted CV
- withdraw pending application from history

Recommended feature group:

- `candidate_application_history`

Recommended functionality keys:

- `candidate_application_history_list`
- `candidate_application_history_search`
- `candidate_application_history_filter`
- `candidate_application_history_cv_preview`
- `candidate_application_history_withdraw`
- `candidate_application_history_chat_indicator`

### Candidate Chat

Implemented functionality:

- candidate chat inbox
- unread/read filtering
- search conversations
- application-specific chat workspace
- send message
- edit own message
- delete own message
- read receipt display
- typing indicator display
- archived state handling

Recommended feature group:

- `candidate_chat`

Recommended functionality keys:

- `candidate_chat_inbox`
- `candidate_chat_workspace`
- `candidate_chat_send`
- `candidate_chat_edit`
- `candidate_chat_delete`
- `candidate_chat_read_receipts`
- `candidate_chat_typing_indicator`

## Admin Portal Inventory

### Admin Dashboard

Implemented functionality:

- show admin count
- show candidate count
- show job count
- show total application count
- quick links to jobs, candidates, settings, and audit
- recent candidate activity list
- direct navigation to candidate detail

Recommended feature group:

- `admin_dashboard`

Recommended functionality keys:

- `admin_dashboard_overview`
- `admin_dashboard_recent_candidates`
- `admin_dashboard_navigation`

### Admin Jobs Workspace

Implemented functionality:

- list jobs
- search jobs
- filter by draft/published state
- table and card view toggle
- persisted view preference
- server pagination
- infinite card loading
- create job entry
- edit job
- preview published job
- open public view
- copy public link
- open per-job candidate list
- download all CVs as ZIP
- publish or unpublish job
- soft-delete job

Recommended feature group:

- `admin_jobs`

Recommended functionality keys:

- `admin_jobs_list`
- `admin_jobs_search`
- `admin_jobs_status_filter`
- `admin_jobs_table_view`
- `admin_jobs_card_view`
- `admin_jobs_create`
- `admin_jobs_edit`
- `admin_jobs_preview`
- `admin_jobs_public_link`
- `admin_jobs_candidates_open`
- `admin_jobs_cv_zip_download`
- `admin_jobs_publish_toggle`
- `admin_jobs_delete`

### Admin Candidate Directory

Implemented functionality:

- list candidates
- search by name, email, phone, identity value
- filter by latest review status
- table and card view toggle
- server pagination
- infinite card loading
- show submission count
- show latest submission timestamp
- show latest ATS score or ATS queue state
- open candidate detail page

Recommended feature group:

- `admin_candidates`

Recommended functionality keys:

- `admin_candidates_list`
- `admin_candidates_search`
- `admin_candidates_status_filter`
- `admin_candidates_table_view`
- `admin_candidates_card_view`
- `admin_candidates_ats_summary`
- `admin_candidates_detail_open`

### Admin Candidate Detail

Implemented functionality:

- show full candidate profile
- show candidate contact details
- show profile update timestamp
- show whether candidate also has admin access
- list full application history for the candidate
- accept pending application
- reject pending application with optional reason
- open related job candidate list
- open accepted chat
- preview submitted CV
- delete application
- show ATS score and status
- open ATS details modal
- trigger ATS recalculation when allowed
- auto-refresh while ATS is queued or processing

Recommended feature group:

- `admin_candidate_review`

Recommended functionality keys:

- `admin_candidate_profile_view`
- `admin_candidate_submission_history`
- `admin_candidate_accept`
- `admin_candidate_reject`
- `admin_candidate_rejection_reason`
- `admin_candidate_cv_preview`
- `admin_candidate_application_delete`
- `admin_candidate_ats_view`
- `admin_candidate_ats_recalculate`
- `admin_candidate_chat_open`

### Admin Job Candidate Pipeline

Implemented functionality:

- list submissions for a single job
- search by candidate details and ATS-derived metadata
- filter by review status
- filter by ATS score bands
- filter by ATS decision band / fit label
- sort primarily by ATS score, then submission time
- ranking display
- bulk selection
- bulk ATS recalculation
- accept or reject application
- delete application
- preview CV
- open ATS details
- download CV ZIP
- open candidate profile
- auto-refresh while ATS work is in progress

Recommended feature group:

- `admin_job_candidates`

Recommended functionality keys:

- `admin_job_candidates_list`
- `admin_job_candidates_search`
- `admin_job_candidates_review_filter`
- `admin_job_candidates_ats_filter`
- `admin_job_candidates_fit_filter`
- `admin_job_candidates_rank`
- `admin_job_candidates_bulk_select`
- `admin_job_candidates_bulk_ats_recalculate`
- `admin_job_candidates_accept`
- `admin_job_candidates_reject`
- `admin_job_candidates_delete`
- `admin_job_candidates_cv_preview`
- `admin_job_candidates_candidate_open`

### Admin Chat

Implemented functionality:

- admin chat inbox
- people-grouped view
- focused per-person chat list
- unread/read filtering
- search by person, job, and preview text
- open application-specific chat workspace
- delete all chats for a candidate from inbox grouping
- send/edit/delete messages in workspace
- read receipts
- typing indicators
- moderation/deleted-message state refresh

Recommended feature group:

- `admin_chat`

Recommended functionality keys:

- `admin_chat_inbox`
- `admin_chat_people_grouping`
- `admin_chat_filter`
- `admin_chat_search`
- `admin_chat_workspace`
- `admin_chat_send`
- `admin_chat_edit`
- `admin_chat_delete`
- `admin_chat_delete_all_for_participant`
- `admin_chat_read_receipts`
- `admin_chat_typing_indicator`

### Admin Access Management

Implemented functionality:

- add admin by email
- search admin accounts
- table and card view toggle
- server pagination
- edit admin email
- delete admin
- protect current admin from self-delete
- loading overlays for create/update operations

Recommended feature group:

- `admin_access_management`

Recommended functionality keys:

- `admin_access_list`
- `admin_access_search`
- `admin_access_add`
- `admin_access_edit`
- `admin_access_delete`
- `admin_access_self_delete_guard`

### Admin Audit

Implemented functionality:

- list immutable audit records
- filter by admin actor
- search by action, path, target, and JSON
- table and card view toggle
- server pagination
- infinite card loading
- open audit event detail modal
- inspect request metadata, target data, actor, user agent, and JSON details

Recommended feature group:

- `admin_audit`

Recommended functionality keys:

- `admin_audit_list`
- `admin_audit_actor_filter`
- `admin_audit_search`
- `admin_audit_table_view`
- `admin_audit_card_view`
- `admin_audit_detail_modal`

## Organization Owner Portal Inventory

### Tenant Dashboard

Implemented functionality:

- show organization overview banner
- show logo, name, slug, description, website, email, phone, and location
- show subscription name and access source
- show tenant quick actions based on available feature keys
- show setup prompt for owner/root user
- hide unavailable cards based on subscription feature access

Recommended feature group:

- `tenant_dashboard`

Recommended functionality keys:

- `tenant_dashboard_overview`
- `tenant_dashboard_subscription_summary`
- `tenant_dashboard_quick_actions`
- `tenant_dashboard_feature_gated_cards`
- `tenant_dashboard_setup_prompt`

### Tenant Jobs

Implemented functionality:

- list organization jobs
- search by title, code, or department
- create new job
- preview job
- edit job
- publish or unpublish job
- soft-delete job
- empty states for no jobs and filtered results

Recommended feature group:

- `tenant_jobs`

Recommended functionality keys:

- `tenant_jobs_list`
- `tenant_jobs_search`
- `tenant_jobs_create`
- `tenant_jobs_preview`
- `tenant_jobs_edit`
- `tenant_jobs_publish_toggle`
- `tenant_jobs_delete`

### Tenant Candidates

Implemented functionality:

- list submitted candidates for the tenant
- search by name, email, or job
- filter by review status
- preview CV
- open candidate profile through admin-style detail route

Recommended feature group:

- `tenant_candidates`

Recommended functionality keys:

- `tenant_candidates_list`
- `tenant_candidates_search`
- `tenant_candidates_status_filter`
- `tenant_candidates_cv_preview`
- `tenant_candidates_profile_open`

### Tenant Member Applications Area

Implemented functionality:

- list a member’s applications inside tenant portal
- search by job code, title, or CV name
- filter by review status
- preview submitted CV
- withdraw pending application
- empty state with link back to open positions

Recommended feature group:

- `tenant_member_applications`

Recommended functionality keys:

- `tenant_member_applications_list`
- `tenant_member_applications_search`
- `tenant_member_applications_status_filter`
- `tenant_member_applications_cv_preview`
- `tenant_member_applications_withdraw`

### Organization Profile And Slug

Implemented functionality:

- edit organization name
- edit website, contact email, contact phone, location, description
- upload organization logo file
- use logo URL
- preview logo
- inspect company size and hiring volume as read-only reference data
- check slug availability
- validate slug format
- update slug and redirect to new portal URL
- show non-owner read-only organization detail state

Recommended feature group:

- `tenant_organization_profile`

Recommended functionality keys:

- `tenant_organization_profile_view`
- `tenant_organization_profile_edit`
- `tenant_organization_logo_upload`
- `tenant_organization_logo_url`
- `tenant_organization_slug_check`
- `tenant_organization_slug_update`
- `tenant_organization_reference_fields`

### Tenant Browser Branding And Theme

Implemented functionality:

- select theme preset
- customize individual theme colors
- live theme preview
- save theme
- reset theme to preset defaults
- edit browser tab title
- edit browser tab icon URL
- use organization logo as tab icon fallback
- save browser branding separately from theme
- non-owner read-only view

Recommended feature group:

- `tenant_branding`

Recommended functionality keys:

- `tenant_theme_preset_select`
- `tenant_theme_color_customize`
- `tenant_theme_live_preview`
- `tenant_theme_save`
- `tenant_theme_reset`
- `tenant_browser_tab_title`
- `tenant_browser_tab_icon`

### Tenant Custom Domain

Implemented functionality:

- save custom domain
- show required DNS record values
- copy DNS values
- verify domain
- clear custom domain
- reflect pending versus verified activation state
- non-owner read-only state

Recommended feature group:

- `tenant_custom_domain`

Recommended functionality keys:

- `tenant_custom_domain_save`
- `tenant_custom_domain_dns_instructions`
- `tenant_custom_domain_verify`
- `tenant_custom_domain_remove`
- `tenant_custom_domain_readonly_view`

### Tenant Custom Email Domain

Implemented functionality:

- save outgoing email domain
- save sender display name
- show required SPF and DKIM DNS records
- verify email domain
- clear email domain
- show verified sender identity state
- non-owner read-only state

Recommended feature group:

- `tenant_email_domain`

Recommended functionality keys:

- `tenant_email_domain_save`
- `tenant_email_domain_sender_name`
- `tenant_email_domain_dns_instructions`
- `tenant_email_domain_verify`
- `tenant_email_domain_remove`
- `tenant_email_domain_verified_sender_view`

### Tenant Administrator Management

Implemented functionality:

- list administrators
- invite member by email
- update existing member role
- remove member
- show role badges
- show root owner state
- protect root owner from removal
- transfer root ownership to another owner
- warn about ownership constraints

Recommended feature group:

- `tenant_administrators`

Recommended functionality keys:

- `tenant_administrators_list`
- `tenant_administrators_invite`
- `tenant_administrators_role_update`
- `tenant_administrators_remove`
- `tenant_administrators_root_owner_badge`
- `tenant_administrators_root_owner_transfer`
- `tenant_administrators_root_owner_guard`

## Subscription Grouping Recommendation

The current product should not start with one feature key per page.

It should use grouped subscription features, with lower-level functionality keys under each group.

Recommended first grouping:

- `candidate_dashboard`
- `candidate_profile`
- `candidate_job_application`
- `candidate_application_history`
- `candidate_chat`
- `admin_dashboard`
- `admin_jobs`
- `admin_candidates`
- `admin_candidate_review`
- `admin_job_candidates`
- `admin_chat`
- `admin_access_management`
- `admin_audit`
- `tenant_dashboard`
- `tenant_jobs`
- `tenant_candidates`
- `tenant_member_applications`
- `tenant_organization_profile`
- `tenant_branding`
- `tenant_custom_domain`
- `tenant_email_domain`
- `tenant_administrators`

## Packaging Recommendation

For subscriptions, start with top-level features and keep functionality keys for finer enforcement inside those features.

Recommended packaging behavior:

- a subscription selects feature groups
- a feature group may optionally narrow to functionality keys
- if a feature group is absent, its routes, navigation, APIs, and background actions must all be blocked
- if a feature group is present but only some functionality keys are allowed, hide and block the narrower actions too

Example:

- `tenant_jobs` enabled
- `tenant_jobs_delete` disabled

Result:

- jobs page is visible
- create/edit/publish can remain visible if allowed
- delete button is hidden
- delete API is blocked

## Recommended Next Step

Use this document as the source for the next two artifacts:

1. feature catalog records
2. functionality catalog records under each feature

After that:

- update the subscription editor to map against these grouped records
- enforce both feature-group and functionality-level authorization in tenant, admin, and candidate portals
