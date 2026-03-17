import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAppBaseUrl } from "../lib/app-url";
import {
  resolveTenantBrandingFromHost,
  toTenantCssVariables,
} from "../lib/organization-branding";
import "./globals.css";
import { NavigationLoadingProvider } from "./components/NavigationLoadingProvider";
import { ToastProvider } from "./components/ToastProvider";

const appBaseUrl = getAppBaseUrl();

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl),
  title: "FactN Recruitment Portal",
  description: "Apply for open roles at FactN, manage your candidate profile, and track your applications in one place.",
  applicationName: "FactN Recruitment Portal",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: appBaseUrl,
    siteName: "FactN Recruitment Portal",
    title: "FactN Recruitment Portal",
    description: "Apply for open roles at FactN, manage your candidate profile, and track your applications in one place.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FactN Recruitment Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FactN Recruitment Portal",
    description: "Apply for open roles at FactN, manage your candidate profile, and track your applications in one place.",
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const tenantBranding = await resolveTenantBrandingFromHost(host);

  return (
    <html lang="en">
      <body
        style={toTenantCssVariables(tenantBranding.theme)}
        data-tenant-host={tenantBranding.host ?? ""}
        data-tenant-slug={tenantBranding.organization?.slug ?? ""}
      >
        <ToastProvider>
          <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
