import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grox AI Agent | Knowledge CMS",
  description: "Knowledge Management Dashboard for Grox AI Agent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${geistSans.variable} ${geistMono.variable} flex h-screen bg-background text-foreground antialiased overflow-hidden`}>
        <ToastProvider>
          {/* Navigation Sidebar */}
          <Sidebar />

          {/* Primary Page Layout */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header Bar */}
            <Header />

            {/* Page Content Viewport */}
            <main className="flex-1 overflow-y-auto bg-zinc-950/20 p-6">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
