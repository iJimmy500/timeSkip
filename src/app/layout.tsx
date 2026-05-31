import type { Metadata } from "next";
import { Newsreader, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Timeskip — a photobook of moments",
  description:
    "A quiet archive of moments pulled from along the timeline. Flip the stack, drift through the spatial book, or lay it out as a grid.",
  metadataBase: new URL("https://timeskip.local"),
  openGraph: {
    title: "Timeskip",
    description: "A photobook of moments, pulled from along the timeline.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${hanken.variable} ${geistMono.variable} antialiased`}
    >
      <body className="relative min-h-full">{children}</body>
    </html>
  );
}
