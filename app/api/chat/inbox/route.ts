import { NextResponse } from "next/server";
import { listChatInboxForRequester } from "../../../../lib/acs-chat";
import { requireApiSession } from "../../../../lib/auth-guards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const inbox = await listChatInboxForRequester(auth.session.email);

    return NextResponse.json(inbox);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat inbox.";

    return NextResponse.json(
      { message },
      { status: 500 },
    );
  }
}
