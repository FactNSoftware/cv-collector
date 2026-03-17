import type { EmailTemplate } from "./email-service";

type AdminInviteEmailTemplateInput = {
  recipientEmail: string;
  inviterEmail: string;
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

export const buildAdminInviteEmailTemplate = ({
  recipientEmail,
  inviterEmail,
  loginUrl,
}: AdminInviteEmailTemplateInput): EmailTemplate => {
  const safeRecipientEmail = escapeHtml(recipientEmail);
  const safeInviterEmail = escapeHtml(inviterEmail);
  const normalizedLoginUrl = normalizeLoginUrl(loginUrl);
  const safeLoginUrl = escapeHtml(normalizedLoginUrl);
  const subject = "Your FACTS Recruitment admin account is ready";

  const text = [
    "FACTS Recruitment admin access",
    "",
    `An admin account has been created for ${recipientEmail}.`,
    `Granted by: ${inviterEmail}`,
    "",
    "How to sign in:",
    "1. Open the recruitment portal login page.",
    "2. Enter this email address.",
    "3. Request the OTP code.",
    "4. Use the OTP to sign in and access the admin portal.",
    "",
    `Login URL: ${normalizedLoginUrl}`,
  ].join("\n");

  const html =
    "<!doctype html>" +
    `<html><body style=\"margin:0;padding:0;background:#f3f0ea;font-family:Arial,sans-serif;\">` +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"padding:24px 12px;\"><tr><td align=\"center\">" +
    `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:20px;overflow:hidden;\">` +
    `<tr><td style=\"background:${BRAND.primary};padding:18px 24px;\">` +
    `<p style=\"margin:0;font-size:12px;letter-spacing:0.18em;color:${BRAND.accent};text-transform:uppercase;font-weight:600;\">${BRAND.portalName}</p>` +
    "</td></tr>" +
    "<tr><td style=\"padding:28px 24px;\">" +
    `<h1 style=\"margin:0 0 12px 0;font-size:28px;line-height:1.2;color:${BRAND.heading};\">Admin Access Granted</h1>` +
    `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">Your email address <strong style=\"color:${BRAND.heading};\">${safeRecipientEmail}</strong> has been added as an admin for the FACTS Recruitment portal.</p>` +
    `<div style=\"margin:0 0 18px 0;padding:16px;border:1px solid ${BRAND.border};background:${BRAND.surface};border-radius:14px;\">` +
    `<p style=\"margin:0 0 8px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Added by:</strong> ${safeInviterEmail}</p>` +
    `<p style=\"margin:0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Login email:</strong> ${safeRecipientEmail}</p>` +
    "</div>" +
    `<p style=\"margin:0 0 12px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">Use the button below to open the portal. Sign in with this email address and request a one-time password to access the admin workspace.</p>` +
    `<div style=\"margin:22px 0;text-align:center;\">` +
    `<a href=\"${safeLoginUrl}\" style=\"display:inline-block;padding:14px 24px;border-radius:999px;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;\">Open Recruitment Portal</a>` +
    "</div>" +
    `<div style=\"margin:0 0 18px 0;padding:16px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};\">` +
    `<p style=\"margin:0 0 10px 0;font-size:14px;font-weight:700;color:${BRAND.heading};\">Login steps</p>` +
    `<ol style=\"margin:0;padding-left:18px;color:${BRAND.body};font-size:14px;line-height:1.8;\">` +
    "<li>Open the recruitment portal.</li>" +
    "<li>Enter your admin email address.</li>" +
    "<li>Request the OTP code.</li>" +
    "<li>Use the OTP to sign in.</li>" +
    "</ol>" +
    "</div>" +
    `<p style=\"margin:0;font-size:12px;line-height:1.6;color:${BRAND.body};\">If you were not expecting this access, contact your system administrator before signing in.</p>` +
    "</td></tr></table>" +
    "</td></tr></table>" +
    "</body></html>";

  return {
    subject,
    text,
    html,
  };
};
