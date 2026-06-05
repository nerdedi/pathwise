import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Pathwise — Your calm guide to new places",
  description:
    "Personalised venue guides for neurodiverse and anxious visitors. Know what to expect before you go.",
  manifest: "/manifest.json",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "Pathwise",
    description:
      "Personalised venue guides for neurodiverse and anxious visitors.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#3f8a43",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
