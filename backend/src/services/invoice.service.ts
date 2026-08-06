import { prisma } from "../config/prisma";
import { getUserPrisma } from "../config/dynamicPrisma";
import { generateInvoiceNumber } from "./subscription.service";

// ─── Types ────────────────────────────────────────────────────────

export interface InvoiceRecord {
  id: string;
  userId: string;
  invoiceNumber: string;
  paymentId: string | null;
  subscriptionId: string | null;
  plan: string | null;
  description: string;
  amount: number; // paise
  taxAmount: number;
  currency: string;
  status: string;
  issuedAt: Date;
  paidAt: Date | null;
  downloadUrl: string | null;
}

export interface CreateInvoiceParams {
  userId: string;
  plan: string;
  description: string;
  amount: number; // paise
  taxAmount?: number;
  paymentId?: string | null;
  subscriptionId?: string | null;
}

// ─── CRUD ─────────────────────────────────────────────────────────

export async function createInvoiceRecord(params: CreateInvoiceParams): Promise<InvoiceRecord> {
  const invoiceNumber = await generateInvoiceNumber();
  const row = await (prisma as any).invoice.create({
    data: {
      userId: params.userId,
      invoiceNumber,
      paymentId: params.paymentId ?? null,
      subscriptionId: params.subscriptionId ?? null,
      plan: params.plan,
      description: params.description,
      amount: params.amount,
      taxAmount: params.taxAmount ?? 0,
      currency: "INR",
      status: "paid",
      issuedAt: new Date(),
      paidAt: new Date(),
    },
  });
  return row;
}

export async function listInvoices(userId: string): Promise<InvoiceRecord[]> {
  return (prisma as any).invoice.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
  });
}

export async function getInvoice(userId: string, invoiceNumber: string): Promise<InvoiceRecord | null> {
  return (prisma as any).invoice.findFirst({
    where: { userId, invoiceNumber },
  });
}

// ─── PDF generation ───────────────────────────────────────────────

/**
 * Renders a printable invoice PDF (pdfkit) for a user. Includes billing
 * address, plan line-item, GST breakdown and payment summary.
 */
export async function generateInvoicePdf(invoice: InvoiceRecord): Promise<Buffer> {
  const PDFDocument = require("pdfkit");

  const user = await prisma.user.findUnique({ where: { id: invoice.userId }, select: { name: true, email: true } });
  const address = await (prisma as any).billingAddress.findUnique({ where: { userId: invoice.userId } }).catch(() => null);

  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const rupee = (n: number) => `₹${(n / 100).toFixed(2)}`;
  const dateStr = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  // Header
  doc.fillColor("#111827").fontSize(20).font("Helvetica-Bold").text("Adyapan AI", { continued: false });
  doc.fillColor("#F59E0B").fontSize(9).font("Helvetica").text("Premium Subscription Invoice", 48, doc.y + 2);
  doc.fontSize(14).fillColor("#111827").font("Helvetica-Bold").text(`INVOICE ${invoice.invoiceNumber}`, { align: "right" });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#6B7280").font("Helvetica").text(`Issued: ${dateStr(invoice.issuedAt)}`, { align: "right" });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: "right" });

  // Divider
  doc.moveDown(1).strokeColor("#E5E7EB").lineWidth(1).moveTo(48, doc.y).lineTo(552, doc.y).stroke().moveDown(1);

  // Bill to / address
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text("Bill To");
  doc.moveDown(0.4);
  doc.fillColor("#374151").font("Helvetica").fontSize(9.5);
  doc.text(address?.name || user?.name || "—");
  if (address?.line1) doc.text(`${address.line1}${address.line2 ? `, ${address.line2}` : ""}`);
  if (address?.city || address?.state) doc.text([address?.city, address?.state].filter(Boolean).join(", "));
  if (address?.postalCode) doc.text(address.postalCode);
  doc.text(address?.email || user?.email || "—");
  if (address?.phone) doc.text(address.phone);
  if (address?.gstin) doc.text(`GSTIN: ${address.gstin}`);

  doc.moveDown(1.5);

  // Line items
  const tableTop = doc.y;
  doc.rect(48, tableTop, 504, 20).fill("#F9FAFB");
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9);
  doc.text("DESCRIPTION", 52, tableTop + 6);
  doc.text("PLAN", 320, tableTop + 6);
  doc.text("AMOUNT", 470, tableTop + 6);

  const lineTop = tableTop + 26;
  doc.fillColor("#374151").font("Helvetica").fontSize(9.5);
  doc.text(invoice.description, 52, lineTop + 4);
  doc.text(String(invoice.plan || "—"), 320, lineTop + 4);
  doc.text(rupee(invoice.amount), 470, lineTop + 4);

  const gstTop = lineTop + 26;
  doc.fillColor("#111827").font("Helvetica").fontSize(9.5);
  doc.text("Subtotal", 52, gstTop);
  doc.text(rupee(invoice.amount), 470, gstTop);
  doc.text("GST", 52, gstTop + 16);
  doc.text(rupee(invoice.taxAmount), 470, gstTop + 16);

  const totalTop = gstTop + 34;
  doc.strokeColor("#E5E7EB").lineWidth(1).moveTo(48, totalTop - 8).lineTo(552, totalTop - 8).stroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text("Total", 52, totalTop);
  doc.fillColor("#F59E0B").text(rupee(invoice.amount + invoice.taxAmount), 470, totalTop);

  // Footer
  doc.moveDown(2);
  doc.fontSize(8.5).fillColor("#9CA3AF").font("Helvetica").text(
    "Thank you for supporting Adyapan AI. For support, email support@adyapan.ai.",
    48,
    780,
    { width: 504, align: "center" }
  );

  doc.end();
  return done;
}
