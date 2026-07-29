import type { UserRole } from "@/types/user";

export const landingFeatures = [
  {
    title: "AI Study Assistant",
    description: "Get instant answers to complex academic queries, auto-generate summaries, flashcards, and conceptual study plans tailored to your syllabus.",
    image: "/assets/study-assistant.png",
  },
  {
    title: "AI Career Guide",
    description: "Chart your roadmap. Input your interests, skills, and values to find optimal roles and targeted project suggestions to match current tech demands.",
    image: "/assets/career-guide.png",
  },
  {
    title: "AI Resume Builder",
    description: "Generate highly-optimized ATS resumes. Receive instant grading, skills gap analysis, and tailored bullet point enhancements for your dream jobs.",
    image: "/assets/resume-builder.png",
  },
  {
    title: "AI Interview Coach",
    description: "Practice live mock interviews tailored to companies and roles. Receive structured evaluations on body language, coding speed, and communication quality.",
    image: "/assets/interview-coach.png",
  },
  {
    title: "AI Internship Assistant",
    description: "Match with the best micro-internship opportunities and remote gigs based on your live academic profile and project portfolio.",
    image: "/assets/internship-assistant.png",
  },
  {
    title: "AI Placement Hub",
    description: "Unlock structured referral channels and direct hiring partnerships with leading startups and global MNCs. Apply with your verified Adyapan profile.",
    image: "/assets/placement-hub.png",
  },
];

export const landingSteps = [
  {
    step: "01",
    title: "Create Profile",
    description: "Sign up, enter your basic academics details, and build a unified dashboard representation of your educational accomplishments.",
  },
  {
    step: "02",
    title: "Choose Career Goal",
    description: "Define your primary targets (e.g. Software Development, Data Analytics, Product Management) to customize your dashboard feeds.",
  },
  {
    step: "03",
    title: "Learn with AI",
    description: "Access notes, generate summaries, and study using our customized study tools that sync with your university syllabus.",
  },
  {
    step: "04",
    title: "Prepare for Interviews",
    description: "Solve mock coding challenges, build targeted resumes, and run behavioral drills with the Interview Coach.",
  },
  {
    step: "05",
    title: "Find Opportunities",
    description: "Apply to exclusive internships, college events, and hackathons curated specifically based on your verified credentials.",
  },
  {
    step: "06",
    title: "Get Hired",
    description: "Get fast-tracked into recruiter screens with hiring partners using verified profile metrics. Accelerate your career launch.",
  },
];

export const landingFAQs = [
  {
    question: "Is Adyapan AI free for college users?",
    answer: "Yes, our core tools—including the Study Assistant, ATS Resume check, and basic Interview coaching credits—are completely free for users. Premium options are available for extended mockup durations.",
  },
  {
    question: "How does the Resume Builder score work?",
    answer: "Our system runs your resume against standard Applicant Tracking System (ATS) rules, measuring keyword density, section headers layout, and action verb strength to calculate a live score.",
  },
  {
    question: "Can I share my verified metrics directly with recruiters?",
    answer: "Absolutely! Once your profile and credentials are verified, you can export a public dashboard link to share with recruiters or link it directly on your LinkedIn.",
  },
  {
    question: "What AI models does Adyapan support?",
    answer: "Adyapan integrates with multiple cutting-edge AI models including GPT-4o, Claude, Gemini, DeepSeek, Llama 3.3, and Mistral Large. Premium users get access to all models with higher rate limits.",
  },
  {
    question: "How does the Pro subscription billing work?",
    answer: "Pro Monthly is billed at ₹199/month. Pro Yearly is billed at ₹1,999/year (effectively ₹166/month — saving you over 15% compared to monthly). You can cancel anytime and retain access until the end of your billing period.",
  },
  {
    question: "Can I switch between monthly and yearly plans?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. When switching, the remaining balance from your current plan is adjusted toward the new plan. Contact support for assistance with plan changes.",
  },
  {
    question: "Is my data secure on Adyapan?",
    answer: "Absolutely. Your resumes, cover letters, and study materials are encrypted at rest and in transit. We never share your personal data with third parties without explicit consent. Role-based access ensures only you can view your private dashboard.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit/debit cards, UPI, net banking, and popular wallets through our secure Razorpay payment gateway. All transactions are PCI-DSS compliant and encrypted.",
  },
];

export const foundationModules = [
  "Role-based user access",
  "Profile and resume fields",
  "Admin operations surface",
  "Backend API contract",
];

export const roleLabels: Record<UserRole, string> = {
  USER: "User",
  ADMIN: "Admin",
};

