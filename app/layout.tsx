import type { Metadata } from "next";
import "./globals.css";
import { Background } from "@/components/Background";

export const metadata: Metadata = {
  title: "Dharmik Sarvaiya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#0a0a0c] text-[#E6E4DE]">
        <Background />
        {children}
      </body>
    </html>
  );
}
