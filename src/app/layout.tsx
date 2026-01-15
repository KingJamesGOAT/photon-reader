import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PhotonReader | Speed Read Faster",
    template: "%s | PhotonReader"
  },
  description: "A fast, privacy-focused RSVP speed reading application. Read PDFs and texts at up to 1000 WPM directly in your browser.",
  keywords: ["speed reading", "RSVP", "reader", "productivity", "fast reading", "PDF reader"],
  authors: [{ name: "PhotonReader Team" }],
  openGraph: {
      title: "PhotonReader | Speed Read Faster",
      description: "Read documents at lightning speed with our privacy-first RSVP reader.",
      type: "website",
      locale: "en_US",
      siteName: "PhotonReader",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PhotonReader Preview" }]
  },
  twitter: {
      card: "summary_large_image",
      title: "PhotonReader",
      description: "Speed read your documents securely in the browser.",
      images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-300`}
      >
        {children}
      </body>
    </html>
  );
}
