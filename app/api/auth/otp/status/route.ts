import { NextResponse } from "next/server";
import { getLoginOtpDeliveryStatus, OtpValidationError } from "../../../../../lib/auth-otp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") ?? "";
    const requestId = searchParams.get("requestId") ?? "";
    const status = await getLoginOtpDeliveryStatus(email, requestId);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof OtpValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to load OTP delivery status", error);
    return NextResponse.json(
      { message: "Failed to load OTP delivery status." },
      { status: 500 },
    );
  }
}

