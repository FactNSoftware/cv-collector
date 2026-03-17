import type { EmailTemplate } from "./email-service";
import type { OrganizationRole } from "./organizations";

type RoleAssignedTemplateInput = {
  recipientEmail: string;
  organizationName: string;
  role: OrganizationRole;
  actorEmail: string;
  loginUrl: string;
};

type MembershipRemovedTemplateInput = {
  recipientEmail: string;
  organizationName: string;
  actorEmail: string;
  loginUrl: string;
};

type RootOwnershipTransferredTemplateInput = {
  recipientEmail: string;
  organizationName: string;
  previousRootOwnerEmail: string;
  newRootOwnerEmail: string;
  actorEmail: string;
  loginUrl: string;
};

const BRAND = {
  portalName: "FACTS Recruitment",
  primary: "#01371B",
  accent: "#A3E42F",
  surface: "#FCFAF7",
  border: "#E7DFD4",
  heading: "#171717",
  body: "#6B6B6B",
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const normalizeLoginUrl = (value: string) => value.replace(/\/+$/, "");

const toHtmlShell = ({ title, bodyHtml }: { title: string; bodyHtml: string }) => {
  return "<!doctype html>" +
    `<html><body style=\"margin:0;padding:0;background:#f3f0ea;font-family:Arial,sans-serif;\">` +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"padding:24px 12px;\"><tr><td align=\"center\">" +
    `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;\">` +
    `<tr><td style=\"background:${BRAND.primary};padding:18px 24px;\">` +
    `<p style=\"margin:0;font-size:12px;letter-spacing:0.18em;color:${BRAND.accent};text-transform:uppercase;font-weight:600;\">${BRAND.portalName}</p>` +
    "</td></tr>" +
    "<tr><td style=\"padding:28px 24px;\">" +
    `<h1 style=\"margin:0 0 12px 0;font-size:28px;line-height:1.2;color:${BRAND.heading};\">${escapeHtml(title)}</h1>` +
    bodyHtml +
    "</td></tr></table>" +
    "</td></tr></table>" +
    "</body></html>";
};

export const buildOrganizationRoleAssignedEmailTemplate = ({
  recipientEmail,
  organizationName,
  role,
  actorEmail,
  loginUrl,
}: RoleAssignedTemplateInput): EmailTemplate => {
  const normalizedLoginUrl = normalizeLoginUrl(loginUrl);
  const roleLabel = role === "owner" ? "Owner" : "Admin";

  const text = [
    `${organizationName} access updated`,
    "",
    `You were granted ${roleLabel} access in ${organizationName}.`,
    `Updated by: ${actorEmail}`,
    "",
    `Sign in: ${normalizedLoginUrl}`,
  ].join("\n");

  const html = toHtmlShell({
    title: "Access Granted",
    bodyHtml:
      `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">` +
      `Your account <strong style=\"color:${BRAND.heading};\">${escapeHtml(recipientEmail)}</strong> now has <strong style=\"color:${BRAND.heading};\">${escapeHtml(roleLabel)}</strong> access to <strong style=\"color:${BRAND.heading};\">${escapeHtml(organizationName)}</strong>.` +
      "</p>" +
      `<div style=\"margin:0 0 18px 0;padding:16px;border:1px solid ${BRAND.border};background:${BRAND.surface};border-radius:14px;\">` +
      `<p style=\"margin:0 0 8px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Updated by:</strong> ${escapeHtml(actorEmail)}</p>` +
      `<p style=\"margin:0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Role:</strong> ${escapeHtml(roleLabel)}</p>` +
      "</div>" +
      `<div style=\"margin:22px 0;text-align:center;\">` +
      `<a href=\"${escapeHtml(normalizedLoginUrl)}\" style=\"display:inline-block;padding:14px 24px;border-radius:999px;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;\">Open Portal</a>` +
      "</div>",
  });

  return {
    subject: `${organizationName}: ${roleLabel} access granted`,
    text,
    html,
  };
};

export const buildOrganizationMembershipRemovedEmailTemplate = ({
  recipientEmail,
  organizationName,
  actorEmail,
  loginUrl,
}: MembershipRemovedTemplateInput): EmailTemplate => {
  const normalizedLoginUrl = normalizeLoginUrl(loginUrl);

  const text = [
    `${organizationName} access removed`,
    "",
    `Your access to ${organizationName} has been removed.`,
    `Updated by: ${actorEmail}`,
    "",
    `Portal: ${normalizedLoginUrl}`,
  ].join("\n");

  const html = toHtmlShell({
    title: "Access Removed",
    bodyHtml:
      `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">` +
      `Your account <strong style=\"color:${BRAND.heading};\">${escapeHtml(recipientEmail)}</strong> no longer has access to <strong style=\"color:${BRAND.heading};\">${escapeHtml(organizationName)}</strong>.` +
      "</p>" +
      `<p style=\"margin:0 0 16px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Updated by:</strong> ${escapeHtml(actorEmail)}</p>` +
      `<p style=\"margin:0;font-size:14px;line-height:1.7;color:${BRAND.body};\">If you think this is a mistake, contact your organization administrator.</p>`,
  });

  return {
    subject: `${organizationName}: access removed`,
    text,
    html,
  };
};

export const buildOrganizationRootOwnershipTransferredEmailTemplate = ({
  recipientEmail,
  organizationName,
  previousRootOwnerEmail,
  newRootOwnerEmail,
  actorEmail,
  loginUrl,
}: RootOwnershipTransferredTemplateInput): EmailTemplate => {
  const normalizedLoginUrl = normalizeLoginUrl(loginUrl);
  const isNewRootRecipient = recipientEmail.trim().toLowerCase() === newRootOwnerEmail.trim().toLowerCase();

  const text = [
    `${organizationName} root ownership transferred`,
    "",
    isNewRootRecipient
      ? `You are now the root owner of ${organizationName}.`
      : `Root ownership of ${organizationName} was transferred to ${newRootOwnerEmail}.`,
    `Previous root owner: ${previousRootOwnerEmail}`,
    `New root owner: ${newRootOwnerEmail}`,
    `Transferred by: ${actorEmail}`,
    "",
    `Portal: ${normalizedLoginUrl}`,
  ].join("\n");

  const html = toHtmlShell({
    title: "Root Ownership Updated",
    bodyHtml:
      `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">` +
      (isNewRootRecipient
        ? `You are now the <strong style=\"color:${BRAND.heading};\">root owner</strong> for <strong style=\"color:${BRAND.heading};\">${escapeHtml(organizationName)}</strong>.`
        : `Root ownership for <strong style=\"color:${BRAND.heading};\">${escapeHtml(organizationName)}</strong> has been transferred to <strong style=\"color:${BRAND.heading};\">${escapeHtml(newRootOwnerEmail)}</strong>.`) +
      "</p>" +
      `<div style=\"margin:0 0 18px 0;padding:16px;border:1px solid ${BRAND.border};background:${BRAND.surface};border-radius:14px;\">` +
      `<p style=\"margin:0 0 8px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Previous root owner:</strong> ${escapeHtml(previousRootOwnerEmail)}</p>` +
      `<p style=\"margin:0 0 8px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">New root owner:</strong> ${escapeHtml(newRootOwnerEmail)}</p>` +
      `<p style=\"margin:0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Transferred by:</strong> ${escapeHtml(actorEmail)}</p>` +
      "</div>" +
      `<div style=\"margin:22px 0;text-align:center;\">` +
      `<a href=\"${escapeHtml(normalizedLoginUrl)}\" style=\"display:inline-block;padding:14px 24px;border-radius:999px;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;\">Open Portal</a>` +
      "</div>",
  });

  return {
    subject: `${organizationName}: root ownership updated`,
    text,
    html,
  };
};
