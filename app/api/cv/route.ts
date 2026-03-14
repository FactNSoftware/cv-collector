import { NextResponse } from "next/server";
import { PdfValidationError } from "../../../lib/cv-file-service";
import { requireApiSession } from "../../../lib/auth-guards";
import {
  createCvSubmission,
  DuplicateApplicantError,
  listCvSubmissionsByEmail,
} from "../../../lib/cv-storage";
import { upsertCandidateProfile } from "../../../lib/candidate-profile";
import { listPublishedJobs } from "../../../lib/jobs";

export const runtime = "nodejs";

const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "idOrPassportNumber",
  "jobOpening",
] as const;

const getStringValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request);

    if ("response" in auth) {
      return auth.response;
    }

    const submissions = await listCvSubmissionsByEmail(auth.session.email);

    return NextResponse.json({
      items: submissions.map((submission) => ({
        id: submission.id,
        firstName: submission.firstName,
        lastName: submission.lastName,
        email: submission.email,
        phone: submission.phone,
        idOrPassportNumber: submission.idOrPassportNumber,
        jobOpening: submission.jobOpening,
        resumeOriginalName: submission.resumeOriginalName,
        resumeDownloadUrl: `/api/cv/${submission.id}/resume`,
        submittedAt: submission.submittedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to read CV submissions", error);
    return NextResponse.json(
      { message: "Failed to load CV submissions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(request);

    if ("response" in auth) {
      return auth.response;
    }

    const formData = await request.formData();

    const values = {
      firstName: getStringValue(formData, "firstName"),
      lastName: getStringValue(formData, "lastName"),
      email: getStringValue(formData, "email"),
      phone: getStringValue(formData, "phone"),
      idOrPassportNumber: getStringValue(formData, "idOrPassportNumber"),
      jobOpening: getStringValue(formData, "jobOpening"),
    };

    const missingFields = REQUIRED_FIELDS.filter((field) => !values[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          message: "Please fill all required fields.",
          missingFields,
        },
        { status: 400 },
      );
    }

    if (values.email.trim().toLowerCase() !== auth.session.email) {
      return NextResponse.json(
        { message: "Submission email must match the logged-in account." },
        { status: 403 },
      );
    }

    const resume = formData.get("resume");

    if (!(resume instanceof File)) {
      return NextResponse.json(
        { message: "CV is required. Please upload a CV file." },
        { status: 400 },
      );
    }

    const publishedJobs = await listPublishedJobs();
    const hasMatchingJob = publishedJobs.some(
      (job) => job.title === values.jobOpening,
    );

    if (!hasMatchingJob) {
      return NextResponse.json(
        { message: "Please select a valid published job opening." },
        { status: 400 },
      );
    }

    await upsertCandidateProfile({
      email: auth.session.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      idOrPassportNumber: values.idOrPassportNumber,
    });

    const created = await createCvSubmission({
      ...values,
      resumeOriginalName: resume.name || "resume.pdf",
      resumeMimeType: resume.type,
      resumeBuffer: Buffer.from(await resume.arrayBuffer()),
    });

    return NextResponse.json(
      {
        message: "CV submitted successfully.",
        item: {
          id: created.id,
          firstName: created.firstName,
          lastName: created.lastName,
          email: created.email,
          phone: created.phone,
          idOrPassportNumber: created.idOrPassportNumber,
          jobOpening: created.jobOpening,
          resumeOriginalName: created.resumeOriginalName,
          resumeDownloadUrl: `/api/cv/${created.id}/resume`,
          submittedAt: created.submittedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DuplicateApplicantError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof PdfValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to save CV submission", error);
    return NextResponse.json(
      { message: "Failed to submit CV." },
      { status: 500 },
    );
  }
}
