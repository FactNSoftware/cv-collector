import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAppBaseUrl } from "../lib/app-url";
import {
  getTenantMetadata,
  resolveTenantBrandingFromHost,
  toTenantCssVariables,
} from "../lib/organization-branding";
import "./globals.css";
import { NavigationLoadingProvider } from "./components/NavigationLoadingProvider";
import { ToastProvider } from "./components/ToastProvider";

const appBaseUrl = getAppBaseUrl();

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const tenantBranding = await resolveTenantBrandingFromHost(host);
  const tenantMetadata = getTenantMetadata(tenantBranding.organization, tenantBranding.settings);

  return {
    metadataBase: new URL(appBaseUrl),
    title: tenantMetadata.title,
    description: tenantMetadata.description,
    applicationName: tenantMetadata.applicationName,
    icons: {
      icon: tenantMetadata.iconUrl,
      shortcut: tenantMetadata.iconUrl,
      apple: tenantMetadata.iconUrl,
    },
    openGraph: {
      type: "website",
      url: appBaseUrl,
      siteName: tenantMetadata.applicationName,
      title: tenantMetadata.title,
      description: tenantMetadata.description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: tenantMetadata.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tenantMetadata.title,
      description: tenantMetadata.description,
      images: ["/opengraph-image"],
    },
  };
}

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
