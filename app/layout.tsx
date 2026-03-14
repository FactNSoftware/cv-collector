import type { Metadata } from "next";
import "./globals.css";
import { NavigationLoadingProvider } from "./components/NavigationLoadingProvider";
import { ToastProvider } from "./components/ToastProvider";

export const metadata: Metadata = {
  title: "CV Collector",
  description: "OTP login and CV upload portal for candidate intake.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
