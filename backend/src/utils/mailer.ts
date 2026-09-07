import nodemailer from "nodemailer";

// ── Transporter ──────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // SSL on port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  submittedAt: Date;
}

// ── Shared brand styles ───────────────────────────────────────────────────────

const BRAND_COLOR = "#f59e0b";
const BRAND_DARK  = "#12121e";

function baseTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adyapan AI</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_DARK};padding:28px 36px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Adyapan <span style="color:${BRAND_COLOR};">AI</span>
              </span>
              <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">
                adyapan.com
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 36px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                Adyapan Edutech Pvt Ltd &bull; Sattva Magnus, Toli Chowki, Hyderabad 500008
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">
                support@adyapan.com &bull; +91 81791 24566
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

// ── 1. Admin notification ─────────────────────────────────────────────────────

export async function sendAdminContactAlert(data: ContactFormData): Promise<void> {
  const subjectLabel = data.subject
    ? data.subject.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "General Inquiry";

  const body = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#0f172a;font-weight:800;">
      📬 New Contact Form Submission
    </h2>
    <p style="margin:0 0 24px;font-size:13px;color:#64748b;">
      Received on ${data.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
    </p>

    <!-- Details table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:13px;">
      ${row("👤 Full Name",  data.fullName)}
      ${row("✉️ Email",      `<a href="mailto:${data.email}" style="color:${BRAND_COLOR};text-decoration:none;">${data.email}</a>`)}
      ${row("📞 Phone",      data.phone)}
      ${row("📌 Subject",    subjectLabel)}
    </table>

    <!-- Message box -->
    <div style="margin-top:20px;padding:18px 20px;background:#f8fafc;border-left:4px solid ${BRAND_COLOR};border-radius:0 10px 10px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;">Message</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    </div>

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;">
      <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(subjectLabel)}"
         style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#000000;font-weight:800;font-size:13px;border-radius:10px;text-decoration:none;">
        Reply to ${data.fullName.split(" ")[0]}
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"Adyapan AI" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL || "support@adyapan.com",
    subject: `[Contact] ${subjectLabel} — ${data.fullName}`,
    html: baseTemplate(body),
  });
}

// ── 2. User confirmation ──────────────────────────────────────────────────────

export async function sendUserContactConfirmation(data: ContactFormData): Promise<void> {
  const firstName = data.fullName.split(" ")[0];

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;font-weight:800;">
      Hi ${escapeHtml(firstName)}, we got your message! 👋
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Thanks for reaching out to <strong>Adyapan AI</strong>. Our team has received your message
      and will get back to you within <strong>24 hours</strong> on working days.
    </p>

    <!-- Summary card -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;">
        Your submission summary
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
        ${summaryRow("Subject",  data.subject ? data.subject.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "General Inquiry")}
        ${summaryRow("Sent at",  data.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST")}
      </table>
    </div>

    <!-- Message preview -->
    <div style="padding:16px 18px;background:#fffbeb;border-left:4px solid ${BRAND_COLOR};border-radius:0 10px 10px 0;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.6px;">Your message</p>
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.65;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#475569;">
      In the meantime, feel free to explore the platform or reach us directly:
    </p>
    <p style="margin:0 0 28px;font-size:13px;color:#475569;">
      📧 <a href="mailto:support@adyapan.com" style="color:${BRAND_COLOR};text-decoration:none;">support@adyapan.com</a>
      &nbsp;&bull;&nbsp;
      📞 <a href="tel:+918179124566" style="color:${BRAND_COLOR};text-decoration:none;">+91 81791 24566</a>
    </p>

    <p style="margin:0;font-size:13px;color:#64748b;">
      Warm regards,<br/>
      <strong style="color:#0f172a;">Team Adyapan AI</strong>
    </p>
  `;

  await transporter.sendMail({
    from: `"Adyapan AI" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: `We received your message, ${firstName}! — Adyapan AI`,
    html: baseTemplate(body),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 16px;font-weight:700;color:#64748b;background:#f8fafc;width:130px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">
        ${label}
      </td>
      <td style="padding:10px 16px;color:#0f172a;border-bottom:1px solid #e2e8f0;">
        ${value}
      </td>
    </tr>`;
}

function summaryRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:4px 0;font-weight:600;color:#64748b;width:80px;">${label}</td>
      <td style="padding:4px 0;color:#1e293b;">${escapeHtml(value)}</td>
    </tr>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
