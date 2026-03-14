import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import {
  createAdminAccount,
  listAdminAccounts,
} from "../../../../lib/admin-access";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";

export const runtime = "nodejs";

type CreateAdminPayload = {
  email?: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const admins = await listAdminAccounts();
  return NextResponse.json({ items: admins });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await ensureCandidateProfile(email);
    const admin = await createAdminAccount(email, auth.session.email);

    return NextResponse.json({
      message: "Admin account created successfully.",
      item: admin,
    });
  } catch (error) {
    console.error("Failed to create admin", error);
    return NextResponse.json({ message: "Failed to create admin." }, { status: 500 });
  }
}
