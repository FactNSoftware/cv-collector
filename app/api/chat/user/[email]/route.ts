import { NextResponse } from "next/server";
import { deleteAllChatsForCandidateAsAdmin } from "../../../../../lib/acs-chat";
import { requireApiSession } from "../../../../../lib/auth-guards";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ email: string }> },
) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { email } = await context.params;
    const result = await deleteAllChatsForCandidateAsAdmin({
      candidateEmail: decodeURIComponent(email),
      requesterEmail: auth.session.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user chats.";
    const status = /only admins/i.test(message) ? 403 : 500;

    return NextResponse.json(
      { message },
      { status },
    );
  }
}
