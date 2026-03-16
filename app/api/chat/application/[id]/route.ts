import { NextResponse } from "next/server";
import {
  deleteApplicationChatMessageAsAdmin,
  ensureApplicationChatAccess,
  listChatMessageModerations,
  markApplicationChatRead,
} from "../../../../../lib/acs-chat";
import { requireApiSession } from "../../../../../lib/auth-guards";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const access = await ensureApplicationChatAccess(id, auth.session.email);

    return NextResponse.json({
      applicationId: access.chat.applicationId,
      jobId: access.submission?.jobId ?? access.chat.jobId,
      jobCode: access.submission?.jobCode ?? access.chat.jobCode,
      jobTitle: access.submission?.jobTitle || access.submission?.jobOpening || access.chat.jobTitle,
      candidateEmail: access.submission?.email ?? access.chat.candidateEmail,
      candidateName: access.submission
        ? [access.submission.firstName, access.submission.lastName].filter(Boolean).join(" ").trim()
        : "",
      adminEmail: access.chat.adminEmail,
      chatThreadId: access.chat.chatThreadId,
      isAdminRequester: access.isAdminRequester,
      reviewStatus: access.submission?.reviewStatus ?? "accepted",
      isArchived: access.isArchived,
      deletedMessageIds: (await listChatMessageModerations(access.chat.applicationId)).map((item) => item.messageId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load application chat.";
    const status = /not found|not available|only available|do not have access/i.test(message) ? 404 : 500;

    return NextResponse.json(
      { message },
      { status },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const access = await ensureApplicationChatAccess(id, auth.session.email);
    const readState = await markApplicationChatRead(
      access.chat.applicationId,
      auth.session.email,
      new Date(),
    );

    return NextResponse.json({
      applicationId: access.chat.applicationId,
      lastReadAt: readState.lastReadAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update chat read state.";
    const status = /not found|not available|only available|do not have access/i.test(message) ? 404 : 500;

    return NextResponse.json(
      { message },
      { status },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
    const result = await deleteApplicationChatMessageAsAdmin({
      applicationId: id,
      requesterEmail: auth.session.email,
      messageId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete chat message.";
    const status = /only admins|do not have access/i.test(message)
      ? 403
      : /not found|not available|only available/i.test(message)
        ? 404
        : 500;

    return NextResponse.json(
      { message },
      { status },
    );
  }
}
