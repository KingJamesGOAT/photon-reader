import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
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
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
