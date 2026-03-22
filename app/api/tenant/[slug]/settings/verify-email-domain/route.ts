import { NextResponse } from "next/server";
import { requireOrganizationFunctionalityApiSession } from "../../../../../../lib/auth-guards";
import {
  getOrganizationBrandingSettingsBySlug,
  upsertOrganizationBrandingSettings,
  verifyEmailDomain,
} from "../../../../../../lib/organization-branding";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationFunctionalityApiSession(
    request,
    slug,
    "tenant_settings",
    "tenant_settings.custom_email_domain",
    {
    ownerOnly: true,
    },
  );

  if ("response" in auth) {
    return auth.response;
  }

  const { settings } = await getOrganizationBrandingSettingsBySlug(slug);

  if (!settings?.emailDomain) {
    return NextResponse.json(
      { allVerified: false, spf: false, dkim1: false, dkim2: false, message: "No email domain configured. Save a domain first." },
      { status: 400 },
    );
  }

  try {
    const result = await verifyEmailDomain(settings.emailDomain);

    if (result.allVerified) {
      await upsertOrganizationBrandingSettings({
        slug,
        emailDomainVerified: true,
        updatedBy: auth.session.email,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { allVerified: false, spf: false, dkim1: false, dkim2: false, message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { allVerified: false, spf: false, dkim1: false, dkim2: false, message: "DNS verification failed. Please try again." },
      { status: 500 },
    );
  }
}
