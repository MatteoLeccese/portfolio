import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Navbar } from "./components/Navbar/Navbar";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio - Matteo Leccese",
  description: "Matteo Leccese's portfolio. Full-Stack Web Developer. React, Nextjs, PHP, Laravel, GO, Python.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.className}`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
};
