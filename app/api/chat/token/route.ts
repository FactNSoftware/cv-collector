import { NextResponse } from "next/server";
import { ensureApplicationChatAccess, issueAcsTokenForEmail } from "../../../../lib/acs-chat";
import { requireApiSession } from "../../../../lib/auth-guards";

export const runtime = "nodejs";

type ChatTokenPayload = {
  applicationId?: string;
};

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as ChatTokenPayload;
    const applicationId = body.applicationId?.trim();

    if (!applicationId) {
      return NextResponse.json(
        { message: "applicationId is required." },
        { status: 400 },
      );
    }

    const access = await ensureApplicationChatAccess(applicationId, auth.session.email);
    const token = await issueAcsTokenForEmail(auth.session.email);

    return NextResponse.json({
      endpoint: token.endpoint,
      token: token.token,
      expiresOn: token.expiresOn,
      acsUserId: token.acsUserId,
      chatThreadId: access.chat.chatThreadId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue chat token.";
    const status = /not found|not available|only available|do not have access/i.test(message) ? 404 : 500;

    return NextResponse.json(
      { message },
      { status },
    );
  }
}
