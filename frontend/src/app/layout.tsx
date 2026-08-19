import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "katex/dist/katex.min.css";
import LenisProvider from "@/components/providers/LenisProvider";
import ThemeScript from "@/components/providers/ThemeScript";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PremiumUpgradeModal } from "@/components/premium/PremiumUpgradeModal";
import { PremiumRequiredModal } from "@/components/premium/PremiumRequiredModal";

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
  title: "Adyapan AI",
  description: "AI-powered learning and career platform.",
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
