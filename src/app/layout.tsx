import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkHub - Your Links, Your Way",
  description: "A self-hosted link management platform. Create your personalized link-in-bio page with full control and privacy.",
  keywords: ["linktree", "link in bio", "allmylinks", "self-hosted", "on-premise", "link management"],
  authors: [{ name: "LinkHub" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "LinkHub - Your Links, Your Way",
    description: "A self-hosted link management platform. Create your personalized link-in-bio page with full control and privacy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
