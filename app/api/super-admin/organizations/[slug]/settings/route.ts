import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../../../lib/auth-guards";
import {
  getOrganizationBrandingSettingsBySlug,
  upsertOrganizationBrandingSettings,
  type TenantTheme,
} from "../../../../../../lib/organization-branding";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type UpdateOrganizationSettingsPayload = {
  customDomain?: string | null;
  theme?: Partial<Record<keyof TenantTheme, string>>;
};

const decodeSlugParam = (value: string) => decodeURIComponent(value).trim().toLowerCase();

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const { slug: rawSlug } = await context.params;
  const slug = decodeSlugParam(rawSlug);
  const result = await getOrganizationBrandingSettingsBySlug(slug);

  if (!result.organization) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  return NextResponse.json({
    organization: result.organization,
    settings: result.settings,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { slug: rawSlug } = await context.params;
    const slug = decodeSlugParam(rawSlug);
    const body = (await request.json()) as UpdateOrganizationSettingsPayload;

    const customDomain = Object.prototype.hasOwnProperty.call(body, "customDomain")
      ? body.customDomain
      : undefined;

    const theme = body.theme && typeof body.theme === "object"
      ? body.theme
      : undefined;

    const result = await upsertOrganizationBrandingSettings({
      slug,
      customDomain,
      theme,
      updatedBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.settings.update",
      targetType: "organization_settings",
      targetId: result.organization.id,
      summary: `Updated settings for ${result.organization.slug}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug,
        customDomain: result.settings.customDomain,
        domainChanged: result.domainChanged,
        changedThemeKeys: result.changedThemeKeys,
      },
    });

    return NextResponse.json({
      message: "Organization settings updated successfully.",
      organization: result.organization,
      settings: result.settings,
    });
  } catch (error) {
    console.error("Failed to update organization settings", error);

    if (error instanceof Error) {
      if (error.message === "Organization not found.") {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }

      if (error.message === "Custom domain is already assigned to another organization.") {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }

      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Failed to update organization settings." },
      { status: 500 },
    );
  }
}