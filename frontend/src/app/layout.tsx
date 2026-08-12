import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import "katex/dist/katex.min.css";
import LenisProvider from "@/components/providers/LenisProvider";
import ThemeScript from "@/components/providers/ThemeScript";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PremiumUpgradeModal } from "@/components/premium/PremiumUpgradeModal";

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
      className="h-full antialiased"
      style={{
        ["--font-outfit" as any]: "'Outfit', system-ui, -apple-system, sans-serif",
        ["--font-plus-jakarta" as any]: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col font-sans">
        <ThemeScript />
        <LenisProvider />
        <Toaster position="top-right" richColors closeButton />
        <QueryProvider>{children}</QueryProvider>
        <PremiumUpgradeModal />
      </body>
    </html>
  );
}
