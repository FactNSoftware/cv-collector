type OtpEmailTemplateInput = {
  otpCode: string;
  recipientEmail: string;
  expiresInMinutes: number;
};

type OtpEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const BRAND = {
  portalName: "Candidate Portal",
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

const getOtpBlocksMarkup = (otpCode: string) => {
  return otpCode
    .split("")
    .map((digit) => {
      return `<td style=\"padding:0 4px;\">` +
        `<div style=\"min-width:44px;height:54px;line-height:54px;text-align:center;border:1px solid ${BRAND.border};background:${BRAND.surface};border-radius:12px;font-size:24px;font-weight:700;color:${BRAND.heading};\">${escapeHtml(digit)}</div>` +
      "</td>";
    })
    .join("");
};

export const buildOtpEmailTemplate = ({
  otpCode,
  recipientEmail,
  expiresInMinutes,
}: OtpEmailTemplateInput): OtpEmailTemplate => {
  const safeEmail = escapeHtml(recipientEmail);
  const safeOtp = escapeHtml(otpCode);
  const subject = `Your ${BRAND.portalName} verification code`;

  const text = [
    `${BRAND.portalName} login verification`,
    "",
    `Use this OTP to sign in: ${otpCode}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    `If you did not request this, ignore this email.`,
  ].join("\n");

  const html =
    "<!doctype html>" +
    `<html><body style=\"margin:0;padding:0;background:#f3f0ea;font-family:Arial,sans-serif;\">` +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"padding:24px 12px;\"><tr><td align=\"center\">" +
    `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width:560px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;\">` +
    `<tr><td style=\"background:${BRAND.primary};padding:18px 24px;\">` +
    `<p style=\"margin:0;font-size:12px;letter-spacing:0.18em;color:${BRAND.accent};text-transform:uppercase;font-weight:600;\">${BRAND.portalName}</p>` +
    "</td></tr>" +
    "<tr><td style=\"padding:24px;\">" +
    `<h1 style=\"margin:0 0 12px 0;font-size:28px;line-height:1.2;color:${BRAND.heading};\">Verify Your Login</h1>` +
    `<p style=\"margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.body};\">We received a sign-in request for <strong style=\"color:${BRAND.heading};\">${safeEmail}</strong>. Enter the code below in the app to continue.</p>` +
    `<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 auto 14px auto;\"><tr>${getOtpBlocksMarkup(safeOtp)}</tr></table>` +
    `<p style=\"margin:0 0 16px 0;font-size:14px;line-height:1.5;color:${BRAND.body};text-align:center;\">This code expires in <strong style=\"color:${BRAND.heading};\">${expiresInMinutes} minutes</strong>.</p>` +
    `<div style=\"border-top:1px solid ${BRAND.border};padding-top:14px;\"><p style=\"margin:0;font-size:12px;line-height:1.5;color:${BRAND.body};\">If you did not request this code, you can safely ignore this email.</p></div>` +
    "</td></tr></table>" +
    "</td></tr></table>" +
    "</body></html>";

  return {
    subject,
    text,
    html,
  };
};
