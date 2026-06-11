import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "XAI Books <noreply@xaibooks.ae>";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

async function sendWithResend(payload: EmailPayload): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}`);
  }

  return true;
}

async function sendWithSendGrid(payload: EmailPayload): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) return false;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: process.env.EMAIL_FROM_ADDRESS ?? "noreply@xaibooks.ae", name: "XAI Books" },
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html", value: payload.html },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid email failed with status ${response.status}`);
  }

  return true;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (await sendWithResend(payload)) return;
  if (await sendWithSendGrid(payload)) return;

  const transport = createSmtpTransport();
  await transport.sendMail({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XAI Books</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#0f172a;padding:28px 40px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                <span style="color:#0ea5e9;">X</span>AI Books
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                This email was sent by XAI Books, UAE SME Finance Platform.<br />
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;margin:24px 0 8px;">${escapeHtml(text)}</a>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">${escapeHtml(text)}</p>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${escapeHtml(text)}</h1>`;
}

function smallLinkNote(text: string, url: string): string {
  return `<p style="margin:16px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">${escapeHtml(text)}<br /><a href="${url}" style="color:#0ea5e9;word-break:break-all;">${url}</a></p>`;
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const content = `
    ${heading("Verify your email address")}
    ${paragraph(`Hi ${name}, welcome to XAI Books. Please verify your email address to activate your account and start managing your business finances.`)}
    ${button("Verify email address", url)}
    ${smallLinkNote("This link expires in 24 hours. If the button does not work, copy this URL:", url)}
  `;

  await sendEmail({
    to,
    subject: "Verify your XAI Books email address",
    html: baseTemplate(content),
    text: `Hi ${name}, verify your XAI Books email address: ${url}`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const content = `
    ${heading("Reset your password")}
    ${paragraph(`Hi ${name}, we received a request to reset the password for your XAI Books account. Click the button below to choose a new password.`)}
    ${button("Reset password", url)}
    ${smallLinkNote("This link expires in 1 hour. If you did not request this, ignore this email. URL:", url)}
  `;

  await sendEmail({
    to,
    subject: "Reset your XAI Books password",
    html: baseTemplate(content),
    text: `Hi ${name}, reset your XAI Books password using this 1-hour link: ${url}`,
  });
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const url = `${APP_URL}/login`;
  const content = `
    ${heading("Welcome to XAI Books")}
    ${paragraph(`Hi ${name}, your account is verified and ready to go.`)}
    ${paragraph("XAI Books helps UAE SMEs manage invoices, payments, VAT, suppliers, and cashflow with a simple owner-first workspace.")}
    ${button("Sign in to XAI Books", url)}
  `;

  await sendEmail({
    to,
    subject: "Welcome to XAI Books",
    html: baseTemplate(content),
    text: `Hi ${name}, welcome to XAI Books. Sign in here: ${url}`,
  });
}

export async function sendUserInvitationEmail(
  to: string,
  name: string,
  invitedByName: string,
  role: string,
  token: string,
): Promise<void> {
  const url = `${APP_URL}/accept-invite?token=${encodeURIComponent(token)}`;
  const content = `
    ${heading("You have been invited to XAI Books")}
    ${paragraph(`Hi ${name}, ${invitedByName} invited you to join XAI Books as ${role.toLowerCase()}.`)}
    ${paragraph("Accept the invitation to verify your email address, set your password, and access the workspace.")}
    ${button("Accept invitation", url)}
    ${smallLinkNote("This invitation expires in 7 days. If the button does not work, copy this URL:", url)}
  `;

  await sendEmail({
    to,
    subject: "You have been invited to XAI Books",
    html: baseTemplate(content),
    text: `Hi ${name}, ${invitedByName} invited you to XAI Books as ${role}. Accept within 7 days: ${url}`,
  });
}
