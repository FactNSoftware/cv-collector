"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ClipboardEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { LoadingOverlay } from "./LoadingOverlay";
import { OrganizationRegistrationForm } from "./OrganizationRegistrationForm";
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
  const [showRegistration, setShowRegistration] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const { showToast } = useToast();
  const lastSubmittedOtp = useRef("");

  const requestOtp = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      lastSubmittedOtp.current = "";
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

  const handleOtpPaste = (
    event: ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const nextOtp = [...otp];
    const pastedDigits = pasted.slice(0, OTP_LENGTH - index).split("");
    pastedDigits.forEach((digit, offset) => {
      nextOtp[index + offset] = digit;
    });
    setOtp(nextOtp);
    const focusIndex = Math.min(index + pastedDigits.length, OTP_LENGTH - 1);
    const nextInput = document.querySelector<HTMLInputElement>(
      `input[data-otp-index="${focusIndex}"]`,
    );
    nextInput?.focus();
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyOtp();
  };

  const verifyOtp = useCallback(async () => {
    if (isSubmitting) return;
    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      showToast("Enter the full 6-digit OTP.", "warning");
      return;
    }
    lastSubmittedOtp.current = otpCode;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpCode, next: "/system" }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to verify OTP." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to verify OTP.", "error");
        return;
      }

      showToast("Logged in successfully.");
      router.push(payload.redirectPath || "/system");
      router.refresh();
    } catch {
      showToast("Something went wrong while verifying OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, otp, router, showToast]);

  useEffect(() => {
    if (step !== "otp") return;
    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      if (lastSubmittedOtp.current === otpCode) lastSubmittedOtp.current = "";
      return;
    }
    if (isSubmitting || lastSubmittedOtp.current === otpCode) return;
    void verifyOtp();
  }, [isSubmitting, otp, step, verifyOtp]);

  return (
    <main className="h-screen">
      {isSubmitting && (
        <LoadingOverlay
          title={step === "email" ? "Sending OTP" : "Verifying OTP"}
          message={
            step === "email"
              ? "Sending your one-time code."
              : "Checking your one-time code and signing you in."
          }
        />
      )}
      <section className="grid h-full grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image
            src="/main.png"
            alt="Abstract warm gradient artwork"
            fill
            priority
            className="object-cover"
          />
        </div>

        <div className="flex items-center justify-center overflow-y-auto px-6 py-12 sm:px-10 md:px-16">
          <div className="w-full max-w-md">
            <Image
              src="/logo.webp"
              width={184}
              height={56}
              className="h-auto w-46"
              alt="Company logo"
            />

            {showRegistration ? (
              <OrganizationRegistrationForm onCancel={() => setShowRegistration(false)} />
            ) : (
              <>
                <p className="mb-3 mt-8 text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
                  Hiring Platform
                </p>
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-5xl">
                  Launch your hiring portal today
                </h1>
                <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
                  Set up a dedicated hiring portal for your organization. Post jobs, manage candidates, and collaborate with your team — all from your own branded URL.
                </p>

                <button
                  type="button"
                  onClick={() => setShowRegistration(true)}
                  className="theme-btn-primary mt-8 flex h-13 w-full cursor-pointer items-center justify-center rounded-2xl text-base font-medium"
                >
                  Register your organization →
                </button>

                <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
                  Already have a portal?{" "}
                  <span className="font-medium text-[var(--color-ink)]">
                    Sign in at your organization&apos;s URL (e.g.{" "}
                    <span className="font-mono text-xs">your-slug.ourdomain</span>)
                  </span>
                </p>

                {/* System admin login — collapsed by default */}
                {!showAdminLogin ? (
                  <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(true)}
                      className="cursor-pointer text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                    >
                      System admin sign in
                    </button>
                  </div>
                ) : (
                  <div className="mt-10 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {step === "email" ? "System admin sign in" : "Verify your OTP"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAdminLogin(false);
                          setStep("email");
                          setEmail("");
                          setOtp(getDefaultOtp());
                          lastSubmittedOtp.current = "";
                        }}
                        className="cursor-pointer text-xs text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                      >
                        Cancel
                      </button>
                    </div>

                    {step === "email" ? (
                      <form className="space-y-4" onSubmit={handleEmailSubmit}>
                        <input
                          id="admin-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="admin@example.com"
                          className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="theme-btn-primary flex h-10 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? "Sending..." : "Get OTP"}
                        </button>
                      </form>
                    ) : (
                      <form className="space-y-4" onSubmit={handleOtpSubmit}>
                        <p className="text-xs text-[var(--color-muted)]">
                          Enter the 6-digit code sent to {email}.
                        </p>
                        <div className="flex gap-2">
                          {otp.map((digit, index) => (
                            <input
                              key={index}
                              data-otp-index={index}
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={1}
                              value={digit}
                              onChange={(event) => handleOtpChange(index, event.target.value)}
                              onKeyDown={(event) => handleOtpKeyDown(event, index)}
                              onPaste={(event) => handleOtpPaste(event, index)}
                              className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center text-base font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                            />
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="theme-btn-primary flex h-10 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? "Verifying..." : "Verify OTP"}
                        </button>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setStep("email");
                              lastSubmittedOtp.current = "";
                            }}
                            className="cursor-pointer text-xs text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                          >
                            Different email
                          </button>
                          <button
                            type="button"
                            onClick={requestOtp}
                            disabled={isSubmitting}
                            className="cursor-pointer text-xs text-[var(--color-link)] transition hover:text-[var(--color-link-hover)] disabled:opacity-70"
                          >
                            Resend OTP
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

