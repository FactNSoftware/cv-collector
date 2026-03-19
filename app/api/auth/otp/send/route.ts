import { after } from "next/server";
import { NextResponse } from "next/server";
import { OtpValidationError, sendLoginOtp } from "../../../../../lib/auth-otp";
import { processOtpEmailQueueBatch } from "../../../../../lib/otp-email-queue";

export const runtime = "nodejs";

type SendOtpPayload = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpPayload;
    const email = typeof body.email === "string" ? body.email : "";

    const result = await sendLoginOtp(email);

    after(async () => {
      try {
        await processOtpEmailQueueBatch(3);
      } catch (error) {
        console.error("Failed to process OTP email queue after auth OTP send", error);
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

    console.error("Failed to send OTP", error);
    return NextResponse.json(
      { message: "Failed to send OTP." },
      { status: 500 },
    );
  }
}
