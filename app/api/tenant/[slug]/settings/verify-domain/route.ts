import { NextResponse } from "next/server";
import { requireOrganizationOwnerApiSession } from "../../../../../../lib/auth-guards";
import {
  getOrganizationBrandingSettingsBySlug,
  upsertOrganizationBrandingSettings,
  verifyCustomDomain,
} from "../../../../../../lib/organization-branding";
import { getAppBaseUrl } from "../../../../../../lib/app-url";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationOwnerApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  const { settings } = await getOrganizationBrandingSettingsBySlug(slug);

  if (!settings?.customDomain) {
    return NextResponse.json(
      { verified: false, message: "No custom domain configured. Save a domain first." },
      { status: 400 },
    );
  }

  try {
    const platformHost = new URL(getAppBaseUrl()).hostname;
    const result = await verifyCustomDomain(settings.customDomain, platformHost);

    if (result.verified) {
      await upsertOrganizationBrandingSettings({
        slug,
        domainVerified: true,
        updatedBy: auth.session.email,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { verified: false, message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { verified: false, message: "DNS verification failed. Please try again." },
      { status: 500 },
    );
  }
}
