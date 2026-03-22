import { NextResponse } from "next/server";
import {
  requireOrganizationFeatureApiSession,
} from "../../../../../lib/auth-guards";
import { isFunctionalityEnabled } from "../../../../../lib/feature-catalog";
import { updateOrganizationProfile } from "../../../../../lib/organizations";
import { validateOrganizationLogoUrl } from "../../../../../lib/job-assets";

export const runtime = "nodejs";

const INTERNAL_LOGO_URL_PREFIX = "/api/job-assets/";

type UpdateOrganizationPayload = {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  description?: string | null;
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

  if (!isFunctionalityEnabled(auth.functionalityKeys, "tenant_settings.organization_profile_view")) {
    return NextResponse.json({ message: "Organization profile view is not available." }, { status: 403 });
  }

  return NextResponse.json({ organization: auth.organization });
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
    const body = (await request.json()) as UpdateOrganizationPayload;
    const functionalityKeys = auth.functionalityKeys;
    const updatesProfileFields = ["name", "websiteUrl", "contactEmail", "contactPhone", "location", "description"]
      .some((key) => Object.prototype.hasOwnProperty.call(body, key));
    const updatesSlug = Object.prototype.hasOwnProperty.call(body, "slug");
    const logoUrl = Object.prototype.hasOwnProperty.call(body, "logoUrl")
      ? body.logoUrl
      : undefined;
    const updatesLogoUrl = Object.prototype.hasOwnProperty.call(body, "logoUrl");

    if (updatesProfileFields && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.organization_profile")) {
      return NextResponse.json({ message: "Organization profile editing is not available." }, { status: 403 });
    }

    if (updatesSlug && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.slug_update")) {
      return NextResponse.json({ message: "Portal slug updates are not available." }, { status: 403 });
    }

    if (updatesLogoUrl && !isFunctionalityEnabled(functionalityKeys, "tenant_settings.logo_url")) {
      return NextResponse.json({ message: "Logo URL updates are not available." }, { status: 403 });
    }

    const currentLogoUrl = auth.organization.logoUrl?.trim() ?? "";
    const nextLogoUrl = typeof logoUrl === "string" ? logoUrl.trim() : "";

    const isInternalLogoAsset = nextLogoUrl.startsWith(INTERNAL_LOGO_URL_PREFIX);

    if (typeof logoUrl === "string" && nextLogoUrl && nextLogoUrl !== currentLogoUrl && !isInternalLogoAsset) {
      await validateOrganizationLogoUrl(nextLogoUrl);
    }

    const result = await updateOrganizationProfile({
      currentSlug: slug,
      name: Object.prototype.hasOwnProperty.call(body, "name") ? body.name : undefined,
      slug: Object.prototype.hasOwnProperty.call(body, "slug") ? body.slug : undefined,
      logoUrl,
      websiteUrl: Object.prototype.hasOwnProperty.call(body, "websiteUrl") ? body.websiteUrl : undefined,
      contactEmail: Object.prototype.hasOwnProperty.call(body, "contactEmail") ? body.contactEmail : undefined,
      contactPhone: Object.prototype.hasOwnProperty.call(body, "contactPhone") ? body.contactPhone : undefined,
      location: Object.prototype.hasOwnProperty.call(body, "location") ? body.location : undefined,
      description: Object.prototype.hasOwnProperty.call(body, "description") ? body.description : undefined,
      updatedBy: auth.session.email,
    });

    return NextResponse.json({
      message: "Organization profile saved.",
      organization: result.organization,
      slugChanged: result.slugChanged,
      previousSlug: result.previousSlug,
    });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes("already exists")
        ? 409
        : error.message.includes("on the server right now")
          ? 503
          : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json(
      { message: "Failed to update organization profile." },
      { status: 500 },
    );
  }
}
