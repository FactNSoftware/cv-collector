import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { listCandidateProfiles } from "../../../../lib/candidate-profile";
import { listCvSubmissions } from "../../../../lib/cv-storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const [profiles, submissions] = await Promise.all([
      listCandidateProfiles(),
      listCvSubmissions(),
    ]);

    const items = profiles.map((profile) => ({
      ...profile,
      submissions: submissions
        .filter((submission) => submission.email === profile.email)
        .map((submission) => ({
          id: submission.id,
          jobOpening: submission.jobOpening,
          submittedAt: submission.submittedAt,
          resumeOriginalName: submission.resumeOriginalName,
          resumeDownloadUrl: `/api/cv/${submission.id}/resume`,
        })),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to load admin user list", error);
    return NextResponse.json({ message: "Failed to load users." }, { status: 500 });
  }
}
