import { NextResponse } from "next/server";
import { processOtpEmailQueueBatch } from "../../../../../lib/otp-email-queue";

export const runtime = "nodejs";

const PROCESS_TOKEN_ENV = "ADMIN_PERMISSION_TOKEN";

const isAuthorized = (request: Request) => {
  const expected = process.env[PROCESS_TOKEN_ENV]?.trim();

  if (!expected) {
    return false;
  }

  const headerValue = request.headers.get("x-admin-permission-token")?.trim();
  return headerValue === expected;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processOtpEmailQueueBatch(10);
    return NextResponse.json({ message: "OTP email queue processed.", ...result });
  } catch (error) {
    console.error("Failed to process OTP email queue", error);
    return NextResponse.json(
      { message: "Failed to process OTP email queue." },
      { status: 500 },
    );
  }
}
