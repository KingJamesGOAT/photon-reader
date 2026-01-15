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

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://photon-reader.vercel.app'),
  title: {
    default: "PhotonReader | Speed Read Faster",
    template: "%s | PhotonReader"
  },
  description: "Read documents at lightning speed",
  keywords: ["speed reading", "RSVP", "reader", "productivity", "fast reading", "PDF reader"],
  authors: [{ name: "PhotonReader Team" }],
  openGraph: {
      title: "PhotonReader | Speed Read Faster",
      description: "Read documents at lightning speed",
      type: "website",
      locale: "en_US",
      siteName: "PhotonReader",
      images: [
        { 
          url: "/opengraph-image.jpg", 
          width: 1200, 
          height: 1200, 
          alt: "PhotonReader Preview",
          type: "image/jpeg"
        }
      ]
  },
  twitter: {
      card: "summary_large_image",
      title: "PhotonReader",
      description: "Read documents at lightning speed",
      images: ["/opengraph-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", type: "image/x-icon" }
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
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
