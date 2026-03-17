import {
  DEFAULT_TENANT_THEME,
  getOrganizationBrandingSettingsBySlug,
  toTenantCssVariables,
} from "../../../lib/organization-branding";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  // params must be typed as Promise<unknown> to satisfy Next.js's internal
  // LayoutConfig constraint (LayoutProps<Route> uses Promise<unknown> for the
  // generic params type). We assert the shape after awaiting.
  params: Promise<unknown>;
};

/**
 * Applies the organization's saved theme as CSS custom properties over the
 * root-layout defaults so every page under /o/[slug] reflects the org palette.
 *
 * display:contents makes the div transparent to layout while still allowing
 * CSS custom property inheritance to cascade into all descendants.
 */
export default async function TenantSlugLayout({ children, params }: Props) {
  const { slug } = (await params) as { slug: string };

  let cssVars: Record<string, string>;
  try {
    const { settings } = await getOrganizationBrandingSettingsBySlug(slug);
    cssVars = toTenantCssVariables(settings?.theme ?? DEFAULT_TENANT_THEME);
  } catch {
    cssVars = toTenantCssVariables(DEFAULT_TENANT_THEME);
  }

  return (
    <div data-tenant-theme style={cssVars} className="contents">
      {children}
    </div>
  );
}
