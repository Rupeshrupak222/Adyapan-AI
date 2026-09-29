import "dotenv/config";
import nodemailer, { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";

// ── Transporter ──────────────────────────────────────────────────────────────

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER || "support@adyapan.com";
  const pass = process.env.SMTP_PASS || "";
  const isConfigured = Boolean(user && pass && pass !== "your_gmail_app_password_here");
  return { host, port, user, pass, isConfigured };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    console.warn("⚠️  [Mailer] SMTP credentials not set. Email delivery unavailable.");
    return null;
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return cachedTransporter;
}

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
  const transporter = getTransporter();
  const config = getSmtpConfig();
  if (!transporter) {
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

  try {
    const info = await transporter.sendMail({
      from: `"Adyapan AI" <${config.user}>`,
      to: process.env.ADMIN_EMAIL || config.user,
      subject: `[Contact] ${subjectLabel} — ${data.fullName}`,
      html: baseTemplate(body),
      attachments: logoAttachments(),
    });
    
    console.log(`[Mailer] Admin alert sent successfully. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("[Mailer] Failed to send admin alert:", error.message);
    throw error;
  }
}

// ── 2. User confirmation ──────────────────────────────────────────────────────

export async function sendUserContactConfirmation(data: ContactFormData): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
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

  const config = getSmtpConfig();

  try {
    const info = await transporter.sendMail({
      from: `"Adyapan AI" <${config.user}>`,
      to: data.email,
      subject: `We received your message, ${firstName}! — Adyapan AI`,
      html: baseTemplate(body),
      attachments: logoAttachments(),
    });
    
    console.log(`[Mailer] User confirmation sent successfully to ${data.email}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("[Mailer] Failed to send user confirmation:", error.message);
    throw error;
  }
}

// ── 3. Password Reset OTP ─────────────────────────────────────────────────────

export async function sendPasswordResetOtpEmail(email: string, otp: string): Promise<void> {
  const transporter = getTransporter();
  const config = getSmtpConfig();
  if (!transporter) {
    console.warn("[Mailer] Cannot send OTP email - SMTP not configured.");
    return;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a;font-weight:800;">
      Reset Your Password 🔐
    </h2>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      We received a request to reset the password for your <strong>Adyapan AI</strong> account (<span style="color:#0f172a;font-weight:600;">${escapeHtml(email)}</span>).
    </p>

    <!-- OTP Code Card -->
    <div style="margin:24px 0;padding:24px;background:#fffbeb;border:2px dashed ${BRAND_COLOR};border-radius:14px;text-align:center;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px;">
        Your One-Time Verification Code
      </p>
      <div style="font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#b45309;padding:8px 0;">
        ${escapeHtml(otp)}
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:#a16207;">
        ⏱️ This code will expire in <strong>15 minutes</strong>.
      </p>
    </div>

    <!-- Security Instructions -->
    <div style="margin-bottom:24px;padding:14px 18px;background:#f8fafc;border-left:4px solid #94a3b8;border-radius:0 8px 8px 0;font-size:13px;color:#475569;line-height:1.6;">
      <strong style="color:#0f172a;">Security Notice:</strong> If you did not request this password reset, please ignore this email or reach out to our security team immediately. Never share this code with anyone.
    </div>

    <p style="margin:0;font-size:13px;color:#64748b;">
      Warm regards,<br/>
      <strong style="color:#0f172a;">Team Adyapan AI</strong>
    </p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Adyapan AI" <${config.user}>`,
      replyTo: config.user,
      to: email,
      subject: `[Adyapan AI] Your Password Reset OTP: ${otp}`,
      text: `Your Adyapan AI password reset OTP is: ${otp}\n\nThis verification code expires in 15 minutes.\n\nIf you did not request this password reset, please ignore this email.\n\nTeam Adyapan AI`,
      html: baseTemplate(body),
      attachments: logoAttachments(),
    });
    console.log(`[Mailer] Password reset OTP sent to ${email}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("[Mailer] Failed to send password reset OTP email:", error.message);
    throw error;
  }
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
