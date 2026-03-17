"use client";

import Image from "next/image";
import { ClipboardEvent, FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";
import { useToast } from "./ToastProvider";

const OTP_LENGTH = 6;
const getDefaultOtp = () => Array.from({ length: OTP_LENGTH }, () => "");

type Props = {
  slug: string;
  orgName: string;
  orgLogoUrl?: string | null;
  orgDescription?: string | null;
  initialEmail?: string | null;
};

export function TenantLoginForm({
  slug,
  orgName,
  orgLogoUrl,
  orgDescription,
  initialEmail,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState((initialEmail ?? "").trim().toLowerCase());
  const [otp, setOtp] = useState(getDefaultOtp());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmittedOtp = useRef("");
  const hasAutoRequestedOtp = useRef(false);

  const requestOtp = useCallback(async (targetEmail: string = email) => {
    const normalizedEmail = targetEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      showToast("Enter your email to continue.", "warning");
      return false;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to send OTP." }));
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
  }, [email, showToast]);

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sent = await requestOtp();
    if (sent) {
      setStep("otp");
      setOtp(getDefaultOtp());
      lastSubmittedOtp.current = "";
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = nextValue;
    setOtp(next);
    if (nextValue && index < OTP_LENGTH - 1) {
      document.querySelector<HTMLInputElement>(`input[data-tenant-otp="${index + 1}"]`)?.focus();
    }
  };

  const handleOtpKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.querySelector<HTMLInputElement>(`input[data-tenant-otp="${index - 1}"]`)?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted
      .slice(0, OTP_LENGTH - index)
      .split("")
      .forEach((digit, offset) => {
        next[index + offset] = digit;
      });
    setOtp(next);
    const focusIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
    document.querySelector<HTMLInputElement>(`input[data-tenant-otp="${focusIndex}"]`)?.focus();
  };

  const verifyOtp = useCallback(async () => {
    if (isSubmitting) return;
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      showToast("Enter the full 6-digit OTP.", "warning");
      return;
    }
    lastSubmittedOtp.current = code;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: code, next: `/o/${slug}` }),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to verify OTP." }));
      if (!response.ok) {
        showToast(payload.message || "Failed to verify OTP.", "error");
        return;
      }
      showToast("Signed in successfully.");
      router.push(payload.redirectPath || `/o/${slug}`);
      router.refresh();
    } catch {
      showToast("Something went wrong while verifying OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, otp, router, showToast, slug]);

  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await verifyOtp();
  };

  useEffect(() => {
    const normalizedInitialEmail = (initialEmail ?? "").trim().toLowerCase();

    if (!normalizedInitialEmail || hasAutoRequestedOtp.current) {
      return;
    }

    hasAutoRequestedOtp.current = true;
    setEmail(normalizedInitialEmail);

    const autoSendOtp = async () => {
      const sent = await requestOtp(normalizedInitialEmail);

      if (sent) {
        setStep("otp");
        setOtp(getDefaultOtp());
        lastSubmittedOtp.current = "";
      }
    };

    void autoSendOtp();
  }, [initialEmail, requestOtp]);

  useEffect(() => {
    if (step !== "otp") return;
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      if (lastSubmittedOtp.current === code) lastSubmittedOtp.current = "";
      return;
    }
    if (isSubmitting || lastSubmittedOtp.current === code) return;
    void verifyOtp();
  }, [isSubmitting, otp, step, verifyOtp]);

  const inputClass =
    "h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-base text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]";

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
              {orgLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogoUrl}
                  alt={`${orgName} logo`}
                  className="h-auto max-h-14 w-auto max-w-[220px] rounded object-contain"
                />
              ) : (
                <Image
                  src="/logo.webp"
                  width={184}
                  height={56}
                  className="h-auto w-46"
                  alt="Company logo"
                />
              )}
            </div>

            <p className="mb-3 mt-8 text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
              {orgName}
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-5xl">
              {step === "email" ? "Sign in to your portal" : "Verify your OTP"}
            </h1>
            <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
              {step === "email"
                ? "Enter your email to receive a one-time login code."
                : `Enter the 6-digit code sent to ${email || "your email"}.`}
            </p>
            {orgDescription && step === "email" && (
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {orgDescription}
              </p>
            )}

            {step === "email" ? (
              <form className="mt-10 space-y-5" onSubmit={handleEmailSubmit}>
                <div className="space-y-2">
                  <label htmlFor="tenant-email" className="text-sm font-medium text-[var(--color-ink)]">
                    Email
                  </label>
                  <input
                    id="tenant-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="theme-btn-primary flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl text-base font-medium disabled:cursor-not-allowed disabled:opacity-70"
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
                      data-tenant-otp={index}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                      onPaste={(e) => handleOtpPaste(e, index)}
                      className="h-14 w-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] text-center text-xl font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)] sm:h-16 sm:w-14"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="theme-btn-primary flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl text-base font-medium disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Verifying..." : "Verify OTP"}
                </button>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp(getDefaultOtp());
                      lastSubmittedOtp.current = "";
                    }}
                    className="text-sm text-[var(--color-muted)] underline underline-offset-2"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={async () => {
                      const sent = await requestOtp();
                      if (sent) {
                        setOtp(getDefaultOtp());
                        lastSubmittedOtp.current = "";
                      }
                    }}
                    className="text-sm text-[var(--color-muted)] underline underline-offset-2 disabled:opacity-50"
                  >
                    Resend code
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
