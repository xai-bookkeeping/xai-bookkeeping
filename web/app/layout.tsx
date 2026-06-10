import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "XAI Books — UAE SME Finance",
    template: "%s | XAI Books",
  },
  description:
    "Invoices, payments, VAT and cashflow — in one simple, UAE-first system. Built for owners, trusted by accountants.",
  keywords: ["UAE", "accounting", "VAT", "SME", "finance", "bookkeeping"],
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
