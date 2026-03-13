import { NextResponse } from "next/server";
import { OtpValidationError, sendLoginOtp } from "../../../../../lib/auth-otp";

export const runtime = "nodejs";

type SendOtpPayload = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpPayload;
    const email = typeof body.email === "string" ? body.email : "";

    await sendLoginOtp(email);

    return NextResponse.json({ message: "OTP sent successfully." });
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
