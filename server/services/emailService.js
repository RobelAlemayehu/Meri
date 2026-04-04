import nodemailer from "nodemailer";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

/**
 * Sends superadmin invite email immediately after application submission.
 * Falls back to console log if SMTP is not configured.
 */
export async function sendSuperadminInviteEmail({
  to,
  fullName,
  organizationName,
  registrationLink,
  inviteToken,
}) {
  const from = process.env.MAIL_FROM || `"መሪ (Meri)" <noreply@localhost>`;
  const safeName = escapeHtml(fullName);
  const safeOrg = escapeHtml(organizationName);
  const safeLink = escapeHtml(registrationLink);

  const text = `Hi ${fullName},

Thank you for registering "${organizationName}" on Meri.

Your account has been approved. Click the link below to set your password and activate your SuperAdmin account:
${registrationLink}

If the link does not work, paste this token on the registration page:
${inviteToken}

This link expires in ${Number(process.env.SUPERADMIN_INVITE_EXPIRY_DAYS) || 14} days.

— The Meri Team`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0c1524">Welcome to Meri, ${safeName}!</h2>
      <p>Your SuperAdmin account for <strong>${safeOrg}</strong> has been approved.</p>
      <p style="margin:24px 0">
        <a href="${safeLink}"
           style="background:#0c1524;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Complete Registration
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">Or paste this token on the registration page:</p>
      <code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;display:inline-block;font-size:13px;word-break:break-all">${inviteToken}</code>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in ${Number(process.env.SUPERADMIN_INVITE_EXPIRY_DAYS) || 14} days.</p>
    </div>`;

  const transporter = createTransporter();

  if (!transporter) {
    console.warn(
      "\n[email] SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS missing). Invite details:",
      "\nTo:", to,
      "\nLink:", registrationLink,
      "\nToken:", inviteToken, "\n"
    );
    return { sent: false, logged: true };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Complete your Meri SuperAdmin registration — ${organizationName}`,
      text,
      html,
    });
    console.log(`[email] Invite sent to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[email] sendMail error:", err.message || err);
    throw err;
  }
}

/**
 * Sends branch admin credentials email from superadmin.
 */
export async function sendAdminCredentialsEmail({
  to,
  adminName,
  compoundName,
  invitedBy,
  password,
  loginUrl,
}) {
  const from = process.env.MAIL_FROM || `"Meri" <noreply@localhost>`;
  const safeName = escapeHtml(adminName);
  const safeCompound = escapeHtml(compoundName || "your assigned branch");
  const safeInvitedBy = escapeHtml(invitedBy || "A superadmin");
  const safeUrl = escapeHtml(loginUrl);

  const text = `Hi ${adminName},

${invitedBy} has added you as a Branch Admin for "${compoundName}" on Meri.

Your login credentials:
  Email:    ${to}
  Password: ${password}

Login here: ${loginUrl}

Please change your password after your first login.

— The Meri Team`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0c1524">Welcome to Meri, ${safeName}!</h2>
      <p><strong>${safeInvitedBy}</strong> has added you as a Branch Admin for <strong>${safeCompound}</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">Your login credentials:</p>
        <p style="margin:0 0 6px"><strong>Email:</strong> ${escapeHtml(to)}</p>
        <p style="margin:0"><strong>Password:</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px">${escapeHtml(password)}</code></p>
      </div>
      <p style="margin:24px 0">
        <a href="${safeUrl}"
           style="background:#0c1524;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Go to Login
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px">Please change your password after your first login.</p>
    </div>`;

  const transporter = createTransporter();

  if (!transporter) {
    console.warn("\n[email] SMTP not configured. Admin credentials:",
      "\nTo:", to, "\nPassword:", password, "\n");
    return { sent: false, logged: true };
  }

  try {
    await transporter.sendMail({ from, to, subject: `Your Meri admin account for ${compoundName}`, text, html });
    console.log(`[email] Admin credentials sent to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[email] sendMail error:", err.message || err);
    throw err;
  }
}

/**
 * Sends a rejection email to the applicant.
 */
export async function sendSuperadminRejectionEmail({
  to,
  fullName,
  organizationName,
  reason,
}) {
  const from = process.env.MAIL_FROM || `"መሪ (Meri)" <noreply@localhost>`;
  const safeName = escapeHtml(fullName);
  const safeOrg = escapeHtml(organizationName);
  const safeReason = reason?.trim() ? escapeHtml(reason.trim()) : null;

  const text = `Hi ${fullName},

Thank you for your interest in registering "${organizationName}" on Meri.

Unfortunately, we were unable to approve your application at this time.${
    reason?.trim() ? `\n\nReason: ${reason.trim()}` : ""
  }

If you believe this is a mistake or have questions, please resubmit with the correct documentation.

— The Meri Team`;

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0c1524">Application Update, ${safeName}</h2>
      <p>We reviewed your SuperAdmin application for <strong>${safeOrg}</strong>.</p>
      <p style="color:#dc2626">Unfortunately, we could not approve your application at this time.</p>
      ${safeReason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin:16px 0"><strong>Reason:</strong> ${safeReason}</div>` : ""}
      <p style="color:#64748b;font-size:13px">You may resubmit with updated documentation if you believe this was an error.</p>
    </div>`;

  const transporter = createTransporter();

  if (!transporter) {
    console.warn(
      "\n[email] SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS missing). Rejection details:",
      "\nTo:", to,
      "\nReason:", reason || "(none)", "\n"
    );
    return { sent: false, logged: true };
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Your Meri SuperAdmin application for ${organizationName}`,
      text,
      html,
    });
    console.log(`[email] Rejection sent to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[email] sendMail error:", err.message || err);
    throw err;
  }
}