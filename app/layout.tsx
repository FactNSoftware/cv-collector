import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Collector",
  description: "Dummy OTP login and CV upload portal for candidate intake.",
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
