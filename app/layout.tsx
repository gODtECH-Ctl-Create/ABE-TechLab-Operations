import type { Metadata } from "next";
import "./globals.css";
import "./prospecting/research.css";

export const metadata: Metadata = {
  title: "ABE TechLab Operations",
  description: "Internal operations workspace for ABE TechLab, powered by ARIA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
