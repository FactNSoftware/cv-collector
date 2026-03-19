import { NextResponse } from "next/server";
import {
  OrgRegistrationError,
  startOrgRegistration,
  type CompanySize,
  type ExpectedUsers,
} from "../../../lib/org-registration";

export const runtime = "nodejs";

type RegistrationPayload = {
  orgName?: string;
  ownerEmail?: string;
  companySize?: string;
  expectedUsers?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegistrationPayload;

    const orgName = typeof body.orgName === "string" ? body.orgName : "";
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail : "";
    const companySize = typeof body.companySize === "string" ? body.companySize : "";
    const expectedUsers = typeof body.expectedUsers === "string" ? body.expectedUsers : "";

    const result = await startOrgRegistration({
      orgName,
      ownerEmail,
      companySize: companySize as CompanySize,
      expectedUsers: expectedUsers as ExpectedUsers,
    });

    return NextResponse.json({
      message: "Organization registered. Continue on your portal login.",
      slug: result.slug,
      redirectPath: `/o/${result.slug}`,
    });
  } catch (error) {
    if (error instanceof OrgRegistrationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to start org registration", error);
    return NextResponse.json(
      { message: "Failed to start registration. Please try again." },
      { status: 500 },
    );
  }
}
