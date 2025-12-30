import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "./page-transition";

export const metadata: Metadata = {
  title: "ArgoBucks",
  description: "ArgoBucks personal finance management dashboard",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
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
      <body className="antialiased bg-surface text-ink">
        <PageTransition />
        {children}
      </body>
    </html>
  );
}
