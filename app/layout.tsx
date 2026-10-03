import type { Metadata } from "next";
import "./globals.css";
import { Background } from "@/components/Background";

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
        <link rel="preload" as="model" href="/mac.glb" type="model/gltf-binary" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="/goldengate.jpg" type="image/jpeg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;600;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-[#0a0a0c] text-[#E6E4DE]">
        <Background />
        {children}
      </body>
    </html>
  );
}
