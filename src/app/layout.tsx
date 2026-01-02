import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import PageTransition from "./page-transition";
import { MorphingBackground } from "@/components/background/morphing-background";

export const metadata: Metadata = {
  title: "ArgoBucks",
  description: "ArgoBucks personal finance management dashboard",
  icons: {
    icon: [
      { url: "/argo-logo.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-aurora text-ink">
        <MorphingBackground />
        <Suspense fallback={null}>
          <PageTransition />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
