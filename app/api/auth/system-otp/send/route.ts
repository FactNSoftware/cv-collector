import { after } from "next/server";
import { NextResponse } from "next/server";
import { OtpValidationError, sendLoginOtp } from "@/lib/auth-otp";
import { processOtpEmailQueueBatch } from "@/lib/otp-email-queue";
import { isSuperAdminEmail } from "@/lib/super-admin-access";

export const runtime = "nodejs";

type SendSystemOtpPayload = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendSystemOtpPayload;
    const email = typeof body.email === "string" ? body.email : "";
    const normalizedEmail = email.trim().toLowerCase();

    if (!(await isSuperAdminEmail(normalizedEmail))) {
      return NextResponse.json(
        { message: "This email does not have super admin access." },
        { status: 403 },
      );
    }

    const result = await sendLoginOtp(normalizedEmail);

    after(async () => {
      try {
        await processOtpEmailQueueBatch(3);
      } catch (error) {
        console.error("Failed to process OTP email queue after system OTP send", error);
      }
    });

    return NextResponse.json({
      message: result.deliveryStatus === "sent"
        ? "OTP sent successfully."
        : "OTP requested successfully. Delivery is in progress.",
      requestId: result.requestId,
      status: result.deliveryStatus,
    });
  } catch (error) {
    if (error instanceof OtpValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to send system OTP", error);
    return NextResponse.json(
      { message: "Failed to send OTP." },
      { status: 500 },
    );
  }
}
