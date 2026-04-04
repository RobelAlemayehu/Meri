import nodemailer from "nodemailer";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends superadmin invite email when SMTP is configured.
 * Otherwise logs the link and token to the server console (dev / fallback).
 */
export async function sendSuperadminInviteEmail({
  to,
  fullName,
  organizationName,
  registrationLink,
  inviteToken,
}) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || `"መሪ (Meri)" <noreply@localhost>`;

  const safeName = escapeHtml(fullName);
  const safeOrg = escapeHtml(organizationName);

  const text = `Hi ${fullName},

Your superadmin request for "${organizationName}" was approved.

Open this link to choose your password and activate your account:
${registrationLink}

If the link does not work, open the registration page on the site and paste this token:
${inviteToken}

— Meri`;

  const html = `
    <p>Hi ${safeName},</p>
    <p>Your superadmin request for <strong>${safeOrg}</strong> was approved.</p>
    <p><a href="${escapeHtml(registrationLink)}">Complete registration</a></p>
    <p style="color:#64748b;font-size:14px">If the button does not work, copy the token from the plain-text version of this email and paste it on the registration page.</p>
  `;

  if (!host || !user || !pass) {
    console.warn(
      "\n[email] SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Invite details:\n",
      "To:",
      to,
      "\nLink:",
      registrationLink,
      "\nToken:",
      inviteToken,
      "\n"
    );
    return { sent: false, logged: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: `Superadmin access approved — ${organizationName}`,
    text,
    html,
  });

  return { sent: true };
}
