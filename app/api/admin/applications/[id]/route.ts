import { NextResponse } from "next/server";
import { enqueueAtsProcessing, triggerAtsQueueProcessing } from "../../../../../lib/ats-queue";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import { buildCandidateChatEmailTemplate } from "../../../../../lib/candidate-chat-email-template";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import { ensureApplicationChatForSubmission } from "../../../../../lib/acs-chat";
import { getAppBaseUrl } from "../../../../../lib/app-url";
import {
  getCvSubmissionById,
  deleteCvSubmission,
  updateCvSubmissionReview,
  type CvReviewStatus,
  AtsRecalculationError,
  InvalidApplicationReviewTransitionError,
} from "../../../../../lib/cv-storage";
import { sendTransactionalEmail } from "../../../../../lib/email-service";
import { getJobById, hasEffectiveAtsCriteria } from "../../../../../lib/jobs";

export const runtime = "nodejs";

type ApplicationPayload = {
  reviewStatus?: CvReviewStatus;
  rejectionReason?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as ApplicationPayload;

    if (!body.reviewStatus || !["pending", "accepted", "rejected"].includes(body.reviewStatus)) {
      return NextResponse.json(
        { message: "A valid review status is required." },
        { status: 400 },
      );
    }

    const updated = await updateCvSubmissionReview({
      id,
      reviewStatus: body.reviewStatus,
      reviewedBy: auth.session.email,
      rejectionReason: body.rejectionReason,
    });

    if (!updated) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: `application.${body.reviewStatus}`,
      targetType: "application",
      targetId: updated.id,
      summary: `Marked application ${updated.jobCode} for ${updated.email} as ${body.reviewStatus}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        candidateEmail: updated.email,
        jobCode: updated.jobCode,
        reviewStatus: body.reviewStatus,
        rejectionReason: updated.rejectionReason || undefined,
      },
    });

    let chatProvisioningWarning: string | null = null;
    let candidateEmailWarning: string | null = null;

    if (body.reviewStatus === "accepted") {
      try {
        const chat = await ensureApplicationChatForSubmission(updated, auth.session.email);
        const appBaseUrl = getAppBaseUrl();
        const chatUrl = `${appBaseUrl}/applications/chat/${updated.id}`;

        try {
          await sendTransactionalEmail(
            updated.email,
            buildCandidateChatEmailTemplate({
              recipientEmail: updated.email,
              jobCode: updated.jobCode,
              jobTitle: updated.jobTitle,
              loginUrl: appBaseUrl,
              chatUrl,
            }),
          );
        } catch (emailError) {
          const message = emailError instanceof Error ? emailError.message : "Unknown email delivery error.";
          candidateEmailWarning = "Application accepted and chat created, but the candidate email could not be sent.";
          console.error("Failed to send candidate acceptance chat email", {
            applicationId: updated.id,
            email: updated.email,
            error: message,
          });
        }

        await recordAdminAuditEvent({
          actorEmail: auth.session.email,
          action: "application.chat_provisioned",
          targetType: "application",
          targetId: updated.id,
          summary: `Provisioned chat for accepted application ${updated.jobCode} for ${updated.email}`,
          requestMethod: request.method,
          requestPath: new URL(request.url).pathname,
          userAgent: request.headers.get("user-agent") ?? "",
          details: {
            candidateEmail: updated.email,
            jobCode: updated.jobCode,
            chatThreadId: chat.chatThreadId,
            candidateEmailSent: !candidateEmailWarning,
          },
        });
      } catch (chatError) {
        const message = chatError instanceof Error ? chatError.message : "Unknown chat provisioning error.";

        chatProvisioningWarning = "Application accepted, but chat could not be provisioned yet.";

        await recordAdminAuditEvent({
          actorEmail: auth.session.email,
          action: "application.chat_provision_failed",
          targetType: "application",
          targetId: updated.id,
          summary: `Chat provisioning failed for accepted application ${updated.jobCode} for ${updated.email}`,
          requestMethod: request.method,
          requestPath: new URL(request.url).pathname,
          userAgent: request.headers.get("user-agent") ?? "",
          details: {
            candidateEmail: updated.email,
            jobCode: updated.jobCode,
            error: message,
          },
        });
      }
    }

    return NextResponse.json({
      message: chatProvisioningWarning || candidateEmailWarning || (
        body.reviewStatus === "accepted"
          ? "Application accepted, chat created, and candidate notified by email."
          : "Application updated successfully."
      ),
      item: updated,
      chatProvisioningWarning,
      candidateEmailWarning,
    });
  } catch (error) {
    if (error instanceof InvalidApplicationReviewTransitionError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 },
      );
    }

    console.error("Failed to update application", error);
    return NextResponse.json(
      { message: "Failed to update application." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const existing = await getCvSubmissionById(id);

    if (!existing) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    if (!existing.jobId) {
      return NextResponse.json({ message: "This application is missing a job reference." }, { status: 400 });
    }

    const relatedJob = await getJobById(existing.jobId);

    if (!relatedJob) {
      return NextResponse.json({ message: "The related job could not be found." }, { status: 404 });
    }

    if (!relatedJob.atsEnabled) {
      return NextResponse.json({ message: "ATS is not enabled for this job." }, { status: 400 });
    }

    if (existing.reviewStatus !== "pending") {
      return NextResponse.json(
        { message: "Only pending applications can be recalculated." },
        { status: 400 },
      );
    }

    if (!hasEffectiveAtsCriteria(relatedJob)) {
      return NextResponse.json(
        { message: "No ATS criteria are configured for this job. Add ATS rules before recalculating." },
        { status: 400 },
      );
    }

    await enqueueAtsProcessing({
      submissionId: id,
      reason: "admin_recalculate",
    });
    const updated = await getCvSubmissionById(id);

    void triggerAtsQueueProcessing({
      reason: "admin_recalculate",
      limit: 2,
    });

    if (!updated) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "application.ats_recalculate",
      targetType: "application",
      targetId: updated.id,
      summary: `Recalculated ATS for application ${updated.jobCode} for ${updated.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        candidateEmail: updated.email,
        jobCode: updated.jobCode,
        atsScore: updated.atsScore,
        atsMethod: updated.atsMethod,
        atsStatus: updated.atsStatus,
      },
    });

    return NextResponse.json({
      message: "ATS recalculation queued successfully.",
      item: updated,
    });
  } catch (error) {
    if (error instanceof AtsRecalculationError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to recalculate ATS", error);
    return NextResponse.json(
      { message: "Failed to recalculate ATS." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const existing = await getCvSubmissionById(id);
    const deleted = await deleteCvSubmission(id, auth.session.email);

    if (!deleted) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "application.delete",
      targetType: "application",
      targetId: id,
      summary: existing
        ? `Soft-deleted application ${existing.jobCode} for ${existing.email}`
        : `Soft-deleted application ${id}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: existing
        ? { candidateEmail: existing.email, jobCode: existing.jobCode }
        : undefined,
    });

    return NextResponse.json({ message: "Application deleted successfully." });
  } catch (error) {
    console.error("Failed to delete application", error);
    return NextResponse.json(
      { message: "Failed to delete application." },
      { status: 500 },
    );
  }
}
