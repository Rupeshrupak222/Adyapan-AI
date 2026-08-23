"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, Clock, MapPin, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/contact/submit", formData);
      setSubmitted(true);
      toast.success("Message sent successfully! We'll get back to you within 24 hours.");
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again or email us directly.");
      console.error("Contact form error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactInfo = [
    {
      icon: <Phone size={20} />,
      label: "Phone",
      value: "+91 81791 24566",
      color: "#10b981",
    },
    {
      icon: <Mail size={20} />,
      label: "Email",
      value: "support@adyapan.com",
      color: "#3b82f6",
    },
    {
      icon: <Clock size={20} />,
      label: "Hours",
      value: "All Working Days, 9 AM - 8 PM",
      color: "#f59e0b",
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
              top: "10%",
              right: "10%",
              width: 400,
              height: 400,
              background: "rgba(245,158,11,0.08)",
            }}
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full blur-[140px]"
            style={{
              bottom: "20%",
              left: "10%",
              width: 350,
              height: 350,
              background: "rgba(139,92,246,0.06)",
            }}
            animate={{ scale: [1, 1.15, 1], x: [0, -25, 0], y: [0, 25, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Hero Section */}
        <div className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl md:text-6xl font-black mb-6"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display), sans-serif" }}
            >
              Get in <span className="text-gradient">Touch</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg max-w-2xl mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Have questions about our programs or need career guidance? Our team is here to help you every step of the way.
            </motion.p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Info Cards */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1 space-y-6"
              >
                {contactInfo.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-6 rounded-2xl border"
                    style={{
                      background: "var(--bg-card)",
                      borderColor: "var(--border-color)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${item.color}15`, color: item.color }}
                    >
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      {item.label}
                    </h3>
                    <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.value}
                    </p>
                  </motion.div>
                ))}

                {/* Location Card */}
                <motion.a
                  href="https://share.google/DlARhlckahMiXPXHx"
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="block p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:border-amber-500/40 cursor-pointer"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                    >
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                          Location
                        </h3>
                        <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                          View Map ↗
                        </span>
                      </div>
                      <p className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                        Adyapan Edutech Pvt Ltd
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        Sattva Magnus, Sabza Colony, Toli Chowki, Hyderabad, Telangana 500008
                      </p>
                    </div>
                  </div>
                </motion.a>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2"
              >
                <div
                  className="p-8 rounded-2xl border"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <h2 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
                    Send Us a Message
                  </h2>
                  <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </p>

                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: "rgba(16,185,129,0.1)" }}
                      >
                        <CheckCircle size={40} style={{ color: "#10b981" }} />
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                        Message Sent Successfully!
                      </h3>
                      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                        Thank you for reaching out. We'll respond within 24 hours.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                      >
                        Send Another Message
                      </button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                            Full Name <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm"
                            style={{
                              background: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                            placeholder="Enter your name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                            Email Address <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm"
                            style={{
                              background: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                            placeholder="Enter your email"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                            Phone Number <span style={{ color: "#ef4444" }}>*</span>
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            required
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm"
                            style={{
                              background: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                            Subject
                          </label>
                          <select
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm cursor-pointer"
                            style={{
                              background: "var(--bg-input)",
                              borderColor: "var(--border-color)",
                              color: "var(--text-primary)",
                            }}
                          >
                            <option value="" disabled style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Select a topic</option>
                            <option value="platform-subscription" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Platform & Subscription Inquiry</option>
                            <option value="resume-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Resume Hub Support (ATS / Builder)</option>
                            <option value="learning-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Learning Hub & Study Planner</option>
                            <option value="coding-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Coding Hub & DSA Practice</option>
                            <option value="interview-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>AI Mock Interview Support</option>
                            <option value="placement-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Placement & Job Hub Inquiry</option>
                            <option value="research-hub" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Research Hub & Paper Workspace</option>
                            <option value="campus-collaboration" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>Institutional & Campus Collaboration</option>
                            <option value="general-inquiry" style={{ backgroundColor: "#12121e", color: "#ffffff" }}>General Inquiry / Feedback</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                          Message <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <textarea
                          name="message"
                          required
                          value={formData.message}
                          onChange={handleChange}
                          rows={6}
                          className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm resize-none"
                          style={{
                            background: "var(--bg-input)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-primary)",
                          }}
                          placeholder="Tell us how we can help you..."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                      >
                        {loading ? (
                          "Sending..."
                        ) : (
                          <>
                            <Send size={16} />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
