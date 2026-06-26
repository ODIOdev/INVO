import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppInitSync } from "@/components/AppInitSync";
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
  title: "Over Drive OS — Invoice & Quote System",
  description: "Corporate invoice and quote dashboard for Over Drive OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppInitSync />
        {children}
      </body>
    </html>
  );
}
