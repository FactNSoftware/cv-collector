import { NextResponse } from "next/server";
import {
  requireOrganizationAccessApiSession,
  requireOrganizationOwnerApiSession,
} from "../../../../../lib/auth-guards";
import {
  getOrganizationBrandingSettingsBySlug,
  upsertOrganizationBrandingSettings,
  type TenantTheme,
} from "../../../../../lib/organization-branding";

export const runtime = "nodejs";

type UpdateSettingsPayload = {
  customDomain?: string | null;
  theme?: Partial<Record<keyof TenantTheme, string>>;
  emailDomain?: string | null;
  emailSenderName?: string;
};


export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationAccessApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  const { settings } = await getOrganizationBrandingSettingsBySlug(slug);
  return NextResponse.json({ settings });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationOwnerApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as UpdateSettingsPayload;

    const customDomain = Object.prototype.hasOwnProperty.call(body, "customDomain")
      ? body.customDomain
      : undefined;

    const theme =
      body.theme && typeof body.theme === "object" ? body.theme : undefined;

    const emailDomain = Object.prototype.hasOwnProperty.call(body, "emailDomain")
      ? body.emailDomain
      : undefined;

    const emailSenderName = typeof body.emailSenderName === "string"
      ? body.emailSenderName
      : undefined;

    const result = await upsertOrganizationBrandingSettings({
      slug,
      customDomain,
      theme,
      emailDomain,
      emailSenderName,
      updatedBy: auth.session.email,
    });

    return NextResponse.json({
      message: "Settings saved.",
      settings: result.settings,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Failed to save settings." },
      { status: 500 },
    );
  }
}
