import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "katex/dist/katex.min.css";
import LenisProvider from "@/components/providers/LenisProvider";
import ThemeScript from "@/components/providers/ThemeScript";
import "@/lib/monaco";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PremiumUpgradeModal } from "@/components/premium/PremiumUpgradeModal";
import { PremiumRequiredModal } from "@/components/premium/PremiumRequiredModal";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Adyapan AI | AI-Powered Learning & Career Platform",
    template: "%s | Adyapan AI",
  },
  description: "Boost your skills and career with Adyapan AI. Interactive aptitude engines, job discovery, smart learning tools, and career guidance.",
  keywords: ["Adyapan AI", "ai.adyapan.com", "AI learning platform", "Aptitude preparation", "Job discovery", "Career guidance", "EdTech AI"],
  authors: [{ name: "Adyapan AI Team" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Adyapan AI - Smart AI Learning Platform",
    description: "AI-powered learning and career platform for students and professionals.",
    url: SITE_URL,
    siteName: "Adyapan AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adyapan AI",
    description: "AI-powered learning and career platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col font-sans">
        <ThemeScript />
        <LenisProvider />
        <Toaster position="top-right" richColors closeButton />
        <QueryProvider>{children}</QueryProvider>
        <PremiumUpgradeModal />
        <PremiumRequiredModal />
      </body>
    </html>
  );
}
