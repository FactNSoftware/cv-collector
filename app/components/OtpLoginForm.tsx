"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useState } from "react";
import { useToast } from "./ToastProvider";

const OTP_LENGTH = 6;

const getDefaultOtp = () => {
  return Array.from({ length: OTP_LENGTH }, () => "");
};

export function OtpLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(getDefaultOtp());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const requestOtp = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to send OTP." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to send OTP.", "error");
        return false;
      }

      showToast("OTP sent. Check your inbox.");
      return true;
    } catch {
      showToast("Something went wrong while sending OTP.", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const sent = await requestOtp();

    if (sent) {
      setStep("otp");
      setOtp(getDefaultOtp());
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = nextValue;
    setOtp(nextOtp);

    if (nextValue && index < OTP_LENGTH - 1) {
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-otp-index="${index + 1}"]`,
      );
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      const previousInput = document.querySelector<HTMLInputElement>(
        `input[data-otp-index="${index - 1}"]`,
      );
      previousInput?.focus();
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const otpCode = otp.join("");

    if (otpCode.length !== OTP_LENGTH) {
      showToast("Enter the full 6-digit OTP.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to verify OTP." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to verify OTP.", "error");
        return;
      }

      showToast("Logged in successfully.");
      router.push("/apply");
      router.refresh();
    } catch {
      showToast("Something went wrong while verifying OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="h-screen">
      <section className="grid h-full grid-cols-1 md:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image
            src="/main.png"
            alt="Abstract warm gradient artwork"
            fill
            priority
            className="object-cover"
          />
        </div>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 md:px-16">
          <div className="w-full max-w-md">
            <div>
              <Image
                src="/logo.webp"
                width={184}
                height={56}
                className="h-auto w-46"
                alt="Company logo"
              />
            </div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[#01371B]">
              Candidate Portal
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-5xl">
              {step === "email" ? "Login to continue" : "Verify your OTP"}
            </h1>
            <p className="mt-4 text-base leading-7 text-[#6b6b6b]">
              {step === "email"
                ? "Enter your email below to receive a one-time password."
                : `Enter the 6-digit code sent to ${email || "your email"}.`}
            </p>

            {step === "email" ? (
              <form className="mt-10 space-y-5" onSubmit={handleEmailSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-[#303030]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="mt-2 h-14 w-full rounded-2xl border border-[#e7dfd4] bg-[#fcfaf7] px-4 text-base text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#01371B] text-base font-medium text-[#A3E42F] transition hover:bg-[#262626] focus:outline-none focus:ring-4 focus:ring-[#d9d9d9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : "Get OTP"}
                </button>
              </form>
            ) : (
              <form className="mt-10 space-y-6" onSubmit={handleOtpSubmit}>
                <div className="flex gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      data-otp-index={index}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleOtpChange(index, event.target.value)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(event, index)}
                      className="h-14 w-12 rounded-2xl border border-[#e7dfd4] bg-[#fcfaf7] text-center text-xl font-semibold text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc] sm:h-16 sm:w-14"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#01371B] text-base font-medium text-[#A3E42F] transition hover:bg-[#262626] focus:outline-none focus:ring-4 focus:ring-[#d9d9d9] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="cursor-pointer text-sm font-medium text-[#7a7a7a] transition hover:text-[#171717]"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={isSubmitting}
                    className="cursor-pointer text-sm font-medium text-[#0c5db3] transition hover:text-[#08457f] disabled:opacity-70"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
