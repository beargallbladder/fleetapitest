import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Ford Parts | Reference Implementation",
  description: "Search and commerce API demonstration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">
        <Header />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
