import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayGo Business",
  description: "Business payments and financial management by PayGo.",
  metadataBase: new URL("https://app.paygo.co.mz"),
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-MZ">
      <body>{children}</body>
    </html>
  );
}
