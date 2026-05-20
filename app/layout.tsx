import type { Metadata } from "next";
import Script from "next/script";
import { ThemeManager } from "@/components/theme/theme-manager";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "fotoz.io",
  description: "Studio workflow platform for uploads, client selections, and secure team operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeManager />
        {children}
        <Toaster position="top-right" richColors closeButton />
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
