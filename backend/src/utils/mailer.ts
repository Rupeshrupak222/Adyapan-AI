import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// ── Transporter ──────────────────────────────────────────────────────────────

// Validate SMTP configuration
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Check if SMTP is properly configured
const isSmtpConfigured = Boolean(
  SMTP_HOST && 
  SMTP_PORT && 
  SMTP_USER && 
  SMTP_PASS && 
  SMTP_PASS !== "your_gmail_app_password_here"
);

if (!isSmtpConfigured) {
  console.warn("⚠️  [Mailer] SMTP not configured properly. Email sending will fail.");
  console.warn("    Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS");
  console.warn("    Current:", { 
    SMTP_HOST, 
    SMTP_PORT, 
    SMTP_USER: SMTP_USER || "NOT SET",
    SMTP_PASS: SMTP_PASS ? (SMTP_PASS === "your_gmail_app_password_here" ? "PLACEHOLDER" : "SET") : "NOT SET"
  });
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true, // SSL on port 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // Add timeout and connection settings for better error handling
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ── Logo (attached inline via CID so Gmail & other clients render it) ─────────
// Gmail blocks base64 `data:` URIs inside <img>, so we attach the file as an
// inline CID attachment instead and reference it with src="cid:LOGO_CID".

const LOGO_CID = "adyapan-logo";

let cachedLogoPath: string | null = null;
function getLogoPath(): string {
  if (cachedLogoPath !== null) return cachedLogoPath;
  try {
    const cwd = process.cwd();
    const candidatePaths = [
      path.resolve(cwd, "frontend/public/assets/logo.png"),
      path.resolve(cwd, "../frontend/public/assets/logo.png"),
      path.resolve(cwd, "public/assets/logo.png"),
      path.resolve(__dirname, "../../../frontend/public/assets/logo.png"),
      path.resolve(__dirname, "../../frontend/public/assets/logo.png"),
      path.resolve(__dirname, "../../public/assets/logo.png"),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        cachedLogoPath = p;
        return cachedLogoPath;
      }
    }
  } catch (err) {
    console.warn("[Mailer] Could not locate logo image for email header:", err);
  }
  cachedLogoPath = "";
  return cachedLogoPath;
}

/** Returns the nodemailer inline attachment array for the logo (empty if missing). */
function logoAttachments(): Array<{ filename: string; path: string; cid: string }> {
  const p = getLogoPath();
  return p ? [{ filename: "logo.png", path: p, cid: LOGO_CID }] : [];
}

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

const BRAND_COLOR    = "#f59e0b"; // amber (primary accent)
const BRAND_COLOR_2  = "#d97706"; // deep orange (gradient partner)
const BRAND_GRADIENT = `linear-gradient(135deg, #fbbf24 0%, ${BRAND_COLOR} 45%, ${BRAND_COLOR_2} 100%)`;
const BRAND_DARK     = "#b45309"; // deep amber for the header base (fallback bg)
const PAGE_BG        = "#fef7ec"; // soft warm page background

function baseTemplate(bodyHtml: string): string {
  const hasLogo = !!getLogoPath();
  const logoMark = hasLogo
    ? `<img src="cid:${LOGO_CID}" alt="Adyapan AI" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:14px;background:#ffffff;padding:7px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.12);" />`
    : `<span style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;border-radius:14px;background:#ffffff;color:${BRAND_COLOR};font-weight:900;font-size:24px;">A</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adyapan AI</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(217,119,6,0.18);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_DARK};background-image:${BRAND_GRADIENT};padding:32px 36px;text-align:center;">
              <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">${logoMark}</td>
                  <td style="vertical-align:middle;text-align:left;">
                    <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                      Adyapan <span style="color:#fff7e6;">AI</span>
                    </span>
                    <p style="margin:2px 0 0;font-size:11px;color:#fff3d6;letter-spacing:1px;text-transform:uppercase;">
                      adyapan.com
                    </p>
                  </td>
                </tr>
              </table>
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
            <td style="background:#fef7ec;padding:22px 36px;text-align:center;border-top:1px solid #fbe6c2;">
              <p style="margin:0;font-size:11px;color:#8b8aa3;">
                Adyapan Edutech Pvt Ltd &bull; Sattva Magnus, Toli Chowki, Hyderabad 500008
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#8b8aa3;">
                <a href="mailto:support@adyapan.com" style="color:${BRAND_COLOR};text-decoration:none;">support@adyapan.com</a>
                &nbsp;&bull;&nbsp;
                <a href="tel:+918179124566" style="color:${BRAND_COLOR};text-decoration:none;">+91 81791 24566</a>
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
  // Check if SMTP is configured
  if (!isSmtpConfigured) {
    console.error("[Mailer] Cannot send admin alert - SMTP not configured");
    throw new Error("Email service not configured. Please contact system administrator.");
  }

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
    <div style="margin-top:20px;padding:18px 20px;background:#fffbeb;border-left:4px solid ${BRAND_COLOR};border-radius:0 10px 10px 0;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:0.6px;">Message</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${escapeHtml(data.message)}</p>
    </div>

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;">
      <a href="mailto:${data.email}?subject=Re: ${encodeURIComponent(subjectLabel)}"
         style="display:inline-block;padding:13px 30px;background:${BRAND_COLOR};background-image:${BRAND_GRADIENT};color:#ffffff;font-weight:800;font-size:13px;border-radius:10px;text-decoration:none;box-shadow:0 6px 18px rgba(217,119,6,0.35);">
        Reply to ${data.fullName.split(" ")[0]}
      </a>
    </div>
  `;

<<<<<<< HEAD
  try {
    const info = await transporter.sendMail({
      from: `"Adyapan AI" <${SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL || "support@adyapan.com",
      subject: `[Contact] ${subjectLabel} — ${data.fullName}`,
      html: baseTemplate(body),
    });
    
    console.log(`[Mailer] Admin alert sent successfully. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("[Mailer] Failed to send admin alert:", error.message);
    throw error;
  }
=======
  await transporter.sendMail({
    from: `"Adyapan AI" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL || "support@adyapan.com",
    subject: `[Contact] ${subjectLabel} — ${data.fullName}`,
    html: baseTemplate(body),
    attachments: logoAttachments(),
  });
>>>>>>> bc36e4b39f465dd632e79c8f662b30375227d2ec
}

// ── 2. User confirmation ──────────────────────────────────────────────────────

export async function sendUserContactConfirmation(data: ContactFormData): Promise<void> {
  // Check if SMTP is configured
  if (!isSmtpConfigured) {
    console.error("[Mailer] Cannot send user confirmation - SMTP not configured");
    throw new Error("Email service not configured. Please contact system administrator.");
  }

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

<<<<<<< HEAD
  try {
    const info = await transporter.sendMail({
      from: `"Adyapan AI" <${SMTP_USER}>`,
      to: data.email,
      subject: `We received your message, ${firstName}! — Adyapan AI`,
      html: baseTemplate(body),
    });
    
    console.log(`[Mailer] User confirmation sent successfully to ${data.email}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("[Mailer] Failed to send user confirmation:", error.message);
    throw error;
  }
=======
  await transporter.sendMail({
    from: `"Adyapan AI" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: `We received your message, ${firstName}! — Adyapan AI`,
    html: baseTemplate(body),
    attachments: logoAttachments(),
  });
>>>>>>> bc36e4b39f465dd632e79c8f662b30375227d2ec
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
