"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock, Eye, Database, Mail, FileText, UserCheck, Clock, AlertCircle, Cookie } from "lucide-react";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: <Database size={20} />,
      title: "1. Information We Collect",
      color: "#3b82f6",
      content: [
        {
          subtitle: "Personal Information",
          text: "Name, email address, phone number, and payment details when you register or make a purchase.",
        },
        {
          subtitle: "Usage Data",
          text: "Pages visited, time spent, clicks, and device/browser information.",
        },
        {
          subtitle: "Payment Data",
          text: "Processed securely via Razorpay. We do not store card or UPI credentials.",
        },
        {
          subtitle: "Cookies",
          text: "Session cookies, analytics cookies, and preference cookies (see Cookie Policy below).",
        },
      ],
    },
    {
      icon: <FileText size={20} />,
      title: "2. How We Use Your Information",
      color: "#10b981",
      content: [
        { text: "To provide and improve our educational services and platform." },
        { text: "To process payments and send transaction confirmations." },
        { text: "To send course updates, announcements, and promotional emails (you can opt out anytime)." },
        { text: "To analyse usage patterns and improve user experience." },
        { text: "To comply with legal obligations." },
      ],
    },
    {
      icon: <Eye size={20} />,
      title: "3. Data Sharing",
      color: "#f59e0b",
      content: [
        { text: "We do not sell your personal data to third parties." },
        { text: "We share data with trusted service providers: Razorpay (payments), SendGrid (emails), MongoDB Atlas (database)." },
        { text: "We may disclose data if required by law or to protect our legal rights." },
      ],
    },
    {
      icon: <Lock size={20} />,
      title: "4. Data Security",
      color: "#8b5cf6",
      content: [
        { text: "All data is transmitted over HTTPS/TLS encryption." },
        { text: "Passwords are hashed using bcrypt - never stored in plain text." },
        { text: "Payment processing is PCI-DSS compliant via Razorpay." },
        { text: "We regularly review and update our security practices." },
      ],
    },
    {
      icon: <UserCheck size={20} />,
      title: "5. Your Rights",
      color: "#ec4899",
      content: [
        { subtitle: "Access", text: "Request a copy of your personal data." },
        { subtitle: "Correction", text: "Update inaccurate or incomplete data." },
        { subtitle: "Deletion", text: "Request deletion of your account and data." },
        { subtitle: "Opt-out", text: "Unsubscribe from marketing emails at any time." },
        { text: "To exercise these rights, email us at support@adyapan.com" },
      ],
    },
    {
      icon: <Cookie size={20} />,
      title: "6. Cookie Policy",
      color: "#f97316",
      content: [
        { subtitle: "Necessary Cookies", text: "Required for authentication and security. Cannot be disabled." },
        { subtitle: "Analytics Cookies", text: "Help us understand how users interact with the platform." },
        { subtitle: "Functional Cookies", text: "Remember your preferences and settings." },
        { subtitle: "Marketing Cookies", text: "Used for targeted advertising (disabled by default)." },
        { text: "You can manage cookie preferences via the cookie banner on our site." },
      ],
    },
    {
      icon: <Clock size={20} />,
      title: "7. Data Retention",
      color: "#06b6d4",
      content: [
        { text: "Account data is retained as long as your account is active." },
        { text: "Payment records are retained for 7 years for legal/tax compliance." },
        { text: "You may request deletion of your account at any time." },
      ],
    },
    {
      icon: <AlertCircle size={20} />,
      title: "8. Children's Privacy",
      color: "#ef4444",
      content: [
        { text: "Our services are not directed to children under 13." },
        { text: "We do not knowingly collect data from children under 13." },
        { text: "If you believe a child has provided us data, contact us immediately." },
      ],
    },
    {
      icon: <FileText size={20} />,
      title: "9. Changes to This Policy",
      color: "#6366f1",
      content: [
        { text: "We may update this Privacy Policy from time to time." },
        { text: "We will notify you of significant changes via email or a notice on our website." },
        { text: "Continued use of our services after changes constitutes acceptance." },
      ],
    },
    {
      icon: <Mail size={20} />,
      title: "10. Contact Us",
      color: "#14b8a6",
      content: [
        { text: "Adyapan Edutech Pvt. Ltd." },
        { text: "Email: support@adyapan.com" },
        { text: "For privacy-related queries, please email privacy@adyapan.com" },
      ],
    },
  ];

  return (
    <div style={{ background: "var(--bg-dark)", minHeight: "100vh" }}>
      <Navbar />

      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute rounded-full blur-[120px]"
            style={{
              top: "5%",
              right: "15%",
              width: 350,
              height: 350,
              background: "rgba(139,92,246,0.08)",
            }}
            animate={{ scale: [1, 1.2, 1], x: [0, 25, 0], y: [0, -15, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full blur-[140px]"
            style={{
              bottom: "10%",
              left: "10%",
              width: 400,
              height: 400,
              background: "rgba(245,158,11,0.06)",
            }}
            animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Hero Section */}
        <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
              >
                <Shield size={32} style={{ color: "#8b5cf6" }} />
              </div>
              <h1
                className="text-4xl sm:text-5xl font-black mb-4"
                style={{ color: "var(--text-primary)", fontFamily: "var(--font-display), sans-serif" }}
              >
                Privacy Policy
              </h1>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                Last updated: May 2026 - Effective: May 1, 2026
              </p>
              <p className="text-base max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                At Adyapan Edutech Pvt. Ltd., we are committed to protecting your privacy. This policy explains how we
                collect, use, and safeguard your personal information when you use our platform.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="relative pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="rounded-2xl border p-6 sm:p-8"
                style={{
                  background: "var(--bg-card)",
                  borderColor: "var(--border-color)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${section.color}15`, color: section.color }}
                  >
                    {section.icon}
                  </div>
                  <h2
                    className="text-xl sm:text-2xl font-black pt-2"
                    style={{ color: "var(--text-primary)", fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4 pl-0 sm:pl-16">
                  {section.content.map((item, idx) => (
                    <div key={idx}>
                      {item.subtitle && (
                        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                          {item.subtitle}
                        </h3>
                      )}
                      <p
                        className={`text-sm leading-relaxed ${item.subtitle ? "" : "flex items-start gap-2"}`}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {!item.subtitle && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                            style={{ background: section.color }}
                          />
                        )}
                        <span>{item.text}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Contact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border p-8 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.05) 100%)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3 className="text-xl font-black mb-3" style={{ color: "var(--text-primary)" }}>
                Questions About Your Privacy?
              </h3>
              <p className="text-sm mb-6 max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                If you have any questions or concerns about how we handle your data, we're here to help.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <a
                  href="/contact"
                  className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                >
                  Contact Us
                </a>
                <a
                  href="mailto:privacy@adyapan.com"
                  className="px-6 py-3 rounded-xl font-bold text-sm border transition-all"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  Email Privacy Team
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
