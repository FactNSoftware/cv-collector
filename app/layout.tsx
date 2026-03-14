import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";

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
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
