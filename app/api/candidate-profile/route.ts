import { NextResponse } from "next/server";
import { requireApiSession } from "../../../lib/auth-guards";
import {
  getCandidateProfileByEmail,
  upsertCandidateProfile,
} from "../../../lib/candidate-profile";
import { candidateProfileSchema } from "../../../lib/candidate-profile-validation";

export const runtime = "nodejs";

type CandidateProfilePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  idOrPassportNumber?: string;
};

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request);

    if ("response" in auth) {
      return auth.response;
    }

    const profile = await getCandidateProfileByEmail(auth.session.email);

    return NextResponse.json({
      item: profile,
    });
  } catch (error) {
    console.error("Failed to load candidate profile", error);
    return NextResponse.json(
      { message: "Failed to load candidate profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiSession(request);

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as CandidateProfilePayload;
    const parsed = candidateProfileSchema.safeParse({
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      phone: body.phone ?? "",
      idOrPassportNumber: body.idOrPassportNumber ?? "",
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];

      return NextResponse.json(
        {
          message: issue?.message || "Profile details are invalid.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const profile = await upsertCandidateProfile({
      email: auth.session.email,
      ...parsed.data,
    });

    return NextResponse.json({
      message: "Profile updated successfully.",
      item: profile,
    });
  } catch (error) {
    console.error("Failed to update candidate profile", error);
    return NextResponse.json(
      { message: "Failed to update candidate profile." },
      { status: 500 },
    );
  }
}
