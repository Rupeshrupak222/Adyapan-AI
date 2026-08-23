"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShieldCheck, FileText, CreditCard, Scale, AlertTriangle, Users, BookOpen, Lock, Gavel } from "lucide-react";

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: <ShieldCheck size={20} />,
      title: "1. Acceptance of Terms",
      color: "#3b82f6",
      content: [
        {
          subtitle: "Agreement",
          text: "By creating an account or accessing Adyapan AI (operated by Adyapan Edutech Pvt Ltd), you agree to be bound by these Terms of Service and our Privacy Policy.",
        },
        {
          subtitle: "Eligibility",
          text: "You must be at least 13 years of age to use this platform. Users under 18 must have parental or legal guardian consent.",
        },
      ],
    },
    {
      icon: <Users size={20} />,
      title: "2. Account Registration & Security",
      color: "#10b981",
      content: [
        { text: "Each account is intended for individual use only. Account sharing is strictly prohibited." },
        { text: "You are responsible for maintaining the confidentiality of your login credentials." },
        { text: "Adyapan AI reserves the right to suspend or terminate accounts that violate platform policies or show suspicious multi-user activity." },
      ],
    },
    {
      icon: <BookOpen size={20} />,
      title: "3. Platform Services & AI Features",
      color: "#f59e0b",
      content: [
        { text: "Adyapan AI provides AI-driven learning tools, ATS resume analyzers, mock interview engines, and coding sandboxes." },
        { text: "AI recommendations, ATS scores, and feedback are designed for guidance purposes and do not guarantee placement or job offers." },
        { text: "We continuously update and refine our AI models, which may occasionally modify feature availability." },
      ],
    },
    {
      icon: <CreditCard size={20} />,
      title: "4. Subscriptions, Payments & Refunds",
      color: "#8b5cf6",
      content: [
        { subtitle: "Billing", text: "Subscription fees and credit purchases are processed securely through certified payment gateways (Razorpay)." },
        { subtitle: "Tokens & Credits", text: "AI tokens and credits granted under subscriptions expire according to plan terms unless renewed." },
        { subtitle: "Refund Policy", text: "Subscription fees are non-refundable once digital AI services or credits have been accessed, except as required by law." },
      ],
    },
    {
      icon: <Lock size={20} />,
      title: "5. Intellectual Property",
      color: "#ec4899",
      content: [
        { text: "All logos, branding, platform code, design elements, and curriculum content remain the exclusive property of Adyapan Edutech Pvt Ltd." },
        { text: "Resumes, portfolios, and code written by users remain the property of the respective user." },
        { text: "You grant Adyapan AI a limited license to process your uploaded documents solely to provide requested AI analysis." },
      ],
    },
    {
      icon: <AlertTriangle size={20} />,
      title: "6. Prohibited Activities",
      color: "#ef4444",
      content: [
        { text: "Attempting to reverse engineer, scrape, or extract platform code or proprietary AI models." },
        { text: "Uploading malicious scripts, illegal content, or violating copyright rights of third parties." },
        { text: "Using automated bots or crawlers to flood platform APIs or manipulate learning leaderboards." },
      ],
    },
    {
      icon: <Scale size={20} />,
      title: "7. Limitation of Liability",
      color: "#06b6d4",
      content: [
        { text: "Adyapan AI is provided on an 'as is' and 'as available' basis without warranties of any kind." },
        { text: "In no event shall Adyapan Edutech Pvt Ltd be liable for indirect, incidental, or consequential damages resulting from platform use." },
      ],
    },
    {
      icon: <Gavel size={20} />,
      title: "8. Governing Law & Jurisdiction",
      color: "#14b8a6",
      content: [
        { text: "These Terms shall be governed by and construed in accordance with the laws of India." },
        { text: "Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, Telangana." },
      ],
    },
  ];

  return (
    <div style={{ background: "var(--bg-dark)", minHeight: "100vh" }}>
      <Navbar />

      <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 border text-xs font-semibold"
            style={{ background: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.2)", color: "#3b82f6" }}
          >
            <FileText size={14} />
            <span>Adyapan Edutech Pvt Ltd</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display), sans-serif" }}
          >
            Terms of <span className="text-gradient">Service</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base max-w-2xl mx-auto mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            Please read these terms carefully before using Adyapan AI platform and services.
          </motion.p>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Last Updated: August 2026
          </p>
        </div>
      </div>

      <div className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="p-6 rounded-2xl border"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border-color)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${section.color}15`, color: section.color }}
                >
                  {section.icon}
                </div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {section.title}
                </h2>
              </div>

              <div className="space-y-3 pl-13">
                {section.content.map((item, i) => (
                  <div key={i} className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item.subtitle && (
                      <span className="font-bold text-gradient mr-2">{item.subtitle}:</span>
                    )}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl border text-center"
            style={{
              background: "rgba(59,130,246,0.05)",
              borderColor: "rgba(59,130,246,0.2)",
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Questions regarding our Terms?
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Contact our legal compliance team at support@adyapan.com or visit our office at Sattva Magnus, Toli Chowki, Hyderabad.
            </p>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
