import type { EmailTemplate } from "./email-service";

type CandidateChatEmailTemplateInput = {
  recipientEmail: string;
  jobCode: string;
  jobTitle: string;
  loginUrl: string;
  chatUrl: string;
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

const normalizeUrl = (value: string) => value.replace(/\/+$/, "");

export const buildCandidateChatEmailTemplate = ({
  recipientEmail,
  jobCode,
  jobTitle,
  loginUrl,
  chatUrl,
}: CandidateChatEmailTemplateInput): EmailTemplate => {
  const safeRecipientEmail = escapeHtml(recipientEmail);
  const safeJobCode = escapeHtml(jobCode);
  const safeJobTitle = escapeHtml(jobTitle);
  const safeLoginUrl = escapeHtml(normalizeUrl(loginUrl));
  const safeChatUrl = escapeHtml(chatUrl);
  const subject = `Your application was accepted for ${jobCode || jobTitle}`;

  const text = [
    "FACTS Recruitment application update",
    "",
    `Your application for ${jobCode} ${jobTitle ? `- ${jobTitle}` : ""}`.trim(),
    "has been accepted.",
    "",
    "A chat with the hiring team is now available.",
    `Login URL: ${normalizeUrl(loginUrl)}`,
    `Direct chat URL: ${chatUrl}`,
    "",
    `Sign in with: ${recipientEmail}`,
    "Use your email OTP to open the conversation and continue with the next steps.",
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
    `<h1 style=\"margin:0 0 12px 0;font-size:28px;line-height:1.2;color:${BRAND.heading};\">Application Accepted</h1>` +
    `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">Your application for <strong style=\"color:${BRAND.heading};\">${safeJobCode}${safeJobTitle ? ` - ${safeJobTitle}` : ""}</strong> has been accepted.</p>` +
    `<p style=\"margin:0 0 18px 0;font-size:15px;line-height:1.7;color:${BRAND.body};\">A secure chat with the hiring team is now available. Sign in with <strong style=\"color:${BRAND.heading};\">${safeRecipientEmail}</strong> and continue through the portal.</p>` +
    `<div style=\"margin:0 0 18px 0;padding:16px;border:1px solid ${BRAND.border};background:${BRAND.surface};border-radius:14px;\">` +
    `<p style=\"margin:0 0 8px 0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Login email:</strong> ${safeRecipientEmail}</p>` +
    `<p style=\"margin:0;font-size:14px;color:${BRAND.body};\"><strong style=\"color:${BRAND.heading};\">Portal URL:</strong> ${safeLoginUrl}</p>` +
    "</div>" +
    "<div style=\"margin:22px 0;text-align:center;\">" +
    `<a href=\"${safeChatUrl}\" style=\"display:inline-block;padding:14px 24px;border-radius:999px;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;\">Open Candidate Chat</a>` +
    "</div>" +
    `<div style=\"margin:0 0 18px 0;padding:16px;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};\">` +
    `<p style=\"margin:0 0 10px 0;font-size:14px;font-weight:700;color:${BRAND.heading};\">Next steps</p>` +
    `<ol style=\"margin:0;padding-left:18px;color:${BRAND.body};font-size:14px;line-height:1.8;\">` +
    "<li>Open the recruitment portal or use the direct chat link.</li>" +
    "<li>Sign in with your email address.</li>" +
    "<li>Request the OTP code.</li>" +
    "<li>Open the conversation and reply to the hiring team.</li>" +
    "</ol>" +
    "</div>" +
    `<p style=\"margin:0;font-size:12px;line-height:1.6;color:${BRAND.body};\">If you were not expecting this update, contact the recruitment team before proceeding.</p>` +
    "</td></tr></table>" +
    "</td></tr></table>" +
    "</body></html>";

  return {
    subject,
    text,
    html,
  };
};
