import type { Metadata, Viewport } from "next";
import { Inter, Caveat } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./globals.css";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const markFont = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-mark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sam-Zone — Public Chat",
  description:
    "Ketuk pintu, tunggu approval, lalu ngobrol langsung. Tanpa perlu tukar kontak.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sam-Zone",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07080B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${bodyFont.variable} ${markFont.variable}`}>
      <body className="min-h-dvh bg-void font-sans text-ink antialiased">
        <ServiceWorkerRegister />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
