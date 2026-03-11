import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";

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
  title: "Vehicle Access Control",
  description: "Role-based vehicle access control system for admin and security guard users.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="font-[family:var(--font-body)] text-slate-900">
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
            © COPYRIGHT 2026, ALL RIGHTS RESERVED BY BOLDNESS
          </footer>
        </div>
      </body>
    </html>
  );
}
