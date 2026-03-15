import type { Metadata } from "next";
import "./globals.css";
import { NavigationLoadingProvider } from "./components/NavigationLoadingProvider";
import { ToastProvider } from "./components/ToastProvider";

export const metadata: Metadata = {
  title: "FactN Job Portal",
  description: "Candidate and admin hiring portal for OTP login, job applications, and CV review.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
