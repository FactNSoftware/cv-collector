"use client";

import Link from "next/link";
import { ClipboardEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";
import { useToast } from "./ToastProvider";

const OTP_LENGTH = 6;

const getDefaultOtp = () => Array.from({ length: OTP_LENGTH }, () => "");

export function SystemLoginForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(getDefaultOtp());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmittedOtp = useRef("");

  const requestOtp = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showToast("Enter your email to continue.", "warning");
      return false;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/system-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to send OTP." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to send OTP.", "error");
        return false;
      }

      showToast(payload.message || "OTP requested successfully.");
      return true;
    } catch {
      showToast("Something went wrong while sending OTP.", "error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [email, showToast]);

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
      document.querySelector<HTMLInputElement>(`input[data-system-otp-index="${index + 1}"]`)?.focus();
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document.querySelector<HTMLInputElement>(`input[data-system-otp-index="${index - 1}"]`)?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }

    event.preventDefault();
    const nextOtp = [...otp];
    pasted
      .slice(0, OTP_LENGTH - index)
      .split("")
      .forEach((digit, offset) => {
        nextOtp[index + offset] = digit;
      });
    setOtp(nextOtp);

    const focusIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
    document.querySelector<HTMLInputElement>(`input[data-system-otp-index="${focusIndex}"]`)?.focus();
  };

  const verifyOtp = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      showToast("Enter the full 6-digit OTP.", "warning");
      return;
    }

    lastSubmittedOtp.current = otpCode;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/system-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      router.push(payload.redirectPath || "/system");
      router.refresh();
    } catch {
      showToast("Something went wrong while verifying OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, otp, router, showToast]);

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyOtp();
  };

  useEffect(() => {
    if (step !== "otp") {
      return;
    }

    const otpCode = otp.join("");
    if (otpCode.length !== OTP_LENGTH) {
      if (lastSubmittedOtp.current === otpCode) {
        lastSubmittedOtp.current = "";
      }
      return;
    }

    if (isSubmitting || lastSubmittedOtp.current === otpCode) {
      return;
    }

    void verifyOtp();
  }, [isSubmitting, otp, step, verifyOtp]);

  const inputClass =
    "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]";

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
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

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(252,253,249,0.94),rgba(228,238,229,0.9))] p-8 shadow-[var(--shadow-soft)] sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(165,235,46,0.3),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-strong)]">
                Super Admin Access
              </div>
              <Link
                href="/"
                prefetch
                className="rounded-full border border-[var(--color-border)] bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)] transition hover:border-[var(--color-border-strong)] hover:bg-white"
              >
                Home
              </Link>
            </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
            Secure access for platform operations.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)] sm:text-lg">
            Sign in with your approved admin email to manage global settings, organization oversight, and system-level operations.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Access control", "Restricted entry for platform administrators."],
              ["Operational view", "Centralized access to system-level management."],
              ["OTP security", "One-time-code sign-in for admin sessions."],
            ].map(([title, body]) => (
              <article
                key={title}
                className="rounded-[24px] border border-[var(--color-border)] bg-white/82 p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-strong)]">
                  {title}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[32px] border border-[var(--color-border)] bg-[var(--color-panel)] p-7 shadow-[var(--shadow-soft)] sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
              System Login
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-4xl">
              {step === "email" ? "Sign in as super admin" : "Verify your OTP"}
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              {step === "email"
                ? "Use your approved admin email to request a one-time code."
                : `Enter the 6-digit code sent to ${email}.`}
            </p>

            {step === "email" ? (
              <form className="mt-8 space-y-4" onSubmit={handleEmailSubmit}>
                <input
                  id="system-admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="theme-btn-primary flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Sending..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form className="mt-8 space-y-4" onSubmit={handleOtpSubmit}>
                <div className="flex gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      data-system-otp-index={index}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(event, index)}
                      onPaste={(event) => handleOtpPaste(event, index)}
                      className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white text-center text-base font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="theme-btn-primary flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Verifying..." : "Verify OTP"}
                </button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp(getDefaultOtp());
                      lastSubmittedOtp.current = "";
                    }}
                    className="text-xs text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                  >
                    Different email
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void requestOtp();
                    }}
                    disabled={isSubmitting}
                    className="text-xs text-[var(--color-link)] transition hover:text-[var(--color-link-hover)] disabled:opacity-70"
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
