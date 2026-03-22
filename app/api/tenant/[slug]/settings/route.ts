import { NextResponse } from "next/server";
import {
  requireOrganizationFeatureApiSession,
} from "../../../../../lib/auth-guards";
import { isFunctionalityEnabled } from "../../../../../lib/feature-catalog";
import {
  getOrganizationBrandingSettingsBySlug,
  upsertOrganizationBrandingSettings,
  type TenantTheme,
} from "../../../../../lib/organization-branding";

export const runtime = "nodejs";

type UpdateSettingsPayload = {
  customDomain?: string | null;
  theme?: Partial<Record<keyof TenantTheme, string>>;
  tabTitle?: string;
  tabIconUrl?: string | null;
  emailDomain?: string | null;
  emailSenderName?: string;
};


export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationFeatureApiSession(request, slug, "tenant_settings");

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
  const auth = await requireOrganizationFeatureApiSession(request, slug, "tenant_settings", {
    ownerOnly: true,
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as UpdateSettingsPayload;
    const functionalityKeys = auth.functionalityKeys;

    const customDomain = Object.prototype.hasOwnProperty.call(body, "customDomain")
      ? body.customDomain
      : undefined;

    const theme =
      body.theme && typeof body.theme === "object" ? body.theme : undefined;

    const emailDomain = Object.prototype.hasOwnProperty.call(body, "emailDomain")
      ? body.emailDomain
      : undefined;

    const tabTitle = typeof body.tabTitle === "string"
      ? body.tabTitle
      : undefined;

    const tabIconUrl = Object.prototype.hasOwnProperty.call(body, "tabIconUrl")
      ? body.tabIconUrl
      : undefined;

    const emailSenderName = typeof body.emailSenderName === "string"
      ? body.emailSenderName
      : undefined;

    if (theme && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.theme_customization")) {
      return NextResponse.json({ message: "Theme customization is not available." }, { status: 403 });
    }

    if (tabTitle !== undefined && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.tab_title")) {
      return NextResponse.json({ message: "Browser tab title updates are not available." }, { status: 403 });
    }

    if (tabIconUrl !== undefined && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.tab_icon")) {
      return NextResponse.json({ message: "Browser tab icon updates are not available." }, { status: 403 });
    }

    if (customDomain !== undefined && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.custom_domain")) {
      return NextResponse.json({ message: "Custom domain management is not available." }, { status: 403 });
    }

    if (emailDomain !== undefined && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.custom_email_domain")) {
      return NextResponse.json({ message: "Custom email domain management is not available." }, { status: 403 });
    }

    if (emailSenderName !== undefined && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.custom_email_sender_name")) {
      return NextResponse.json({ message: "Email sender name updates are not available." }, { status: 403 });
    }

    const result = await upsertOrganizationBrandingSettings({
      slug,
      customDomain,
      theme,
      tabTitle,
      tabIconUrl,
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
