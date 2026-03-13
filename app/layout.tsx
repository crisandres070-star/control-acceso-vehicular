import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import { PwaEnhancer } from "@/components/pwa/pwa-enhancer";
import {
  PWA_APP_NAME,
  PWA_DESCRIPTION,
  PWA_THEME_COLOR,
} from "@/lib/pwa-config";

import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  applicationName: PWA_APP_NAME,
  title: PWA_APP_NAME,
  description: PWA_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PWA_APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/pwa-icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/pwa-icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/pwa-icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="font-[family:var(--font-body)] text-slate-900">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <PwaEnhancer />
          <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
            © COPYRIGHT 2026, ALL RIGHTS RESERVED BY BOLDNESS
          </footer>
        </div>
      </body>
    </html>
  );
}
