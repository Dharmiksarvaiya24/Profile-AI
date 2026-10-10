import type { Metadata } from "next";
import { Pixelify_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { Background } from "@/components/Background";

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-pixelify",
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "Dharmik Sarvaiya",
  icons: {
    icon: "/profile.jpg",
    shortcut: "/profile.jpg",
    apple: "/profile.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/profile.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/profile.jpg" />
        <link rel="preload" href="/card-front.webp" as="image" type="image/webp" fetchPriority="high" />
        <link rel="preload" href="/card-back.webp" as="image" type="image/webp" fetchPriority="high" />
      </head>
      <body className={`antialiased min-h-screen bg-[#0a0a0c] text-[#E6E4DE] ${pixelifySans.variable} ${pressStart2P.variable}`}>
        <Background />
        {children}
      </body>
    </html>
  );
}
