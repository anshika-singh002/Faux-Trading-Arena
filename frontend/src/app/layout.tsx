import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Faux Trading",
    default: "Faux Trading — Virtual Trading Simulator",
  },
  description:
    "Learn to trade and invest with zero risk. AI-powered insights, real market data, strategy backtesting — all with virtual money.",
  keywords: ["trading simulator", "virtual trading", "AI trading", "stock market", "investing"],
  openGraph: {
    title: "Faux Trading",
    description: "Master the markets before risking real money.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning prevents browser extensions that inject
    // attributes (e.g. data-be-installed, data-liner-extension-version)
    // from causing false hydration mismatch errors in development.
    <html
      lang="en"
      className={inter.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
