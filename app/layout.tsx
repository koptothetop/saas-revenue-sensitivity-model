import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaaS Revenue Plan Sensitivity Model",
  description:
    "Pressure-test whether a SaaS revenue target is achievable based on pipeline, expansion potential, and program-spend-supported demand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
