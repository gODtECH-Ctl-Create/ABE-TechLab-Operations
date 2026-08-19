import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "./prospecting/research.css";
import "./organisations/organisation.css";
import "./approval/approval.css";

export const metadata: Metadata = {
  title: "ABE TechLab Operations",
  description: "Internal operations workspace for ABE TechLab, powered by ARIA.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
