"use client";

import { Building2, Search, Waypoints } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { OrganizationRegistrationForm } from "./OrganizationRegistrationForm";
import { useToast } from "./ToastProvider";

type OrganizationLookupItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
};

type Props = {
  initialVerifiedEmail?: string | null;
  hasSession?: boolean;
};

const OTP_LENGTH = 6;
const getDefaultOtp = () => Array.from({ length: OTP_LENGTH }, () => "");

export function PortalDiscoveryForm({ initialVerifiedEmail, hasSession = false }: Props) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [step, setStep] = useState<"email" | "otp" | "results">(initialVerifiedEmail ? "results" : "email");
  const [email, setEmail] = useState((initialVerifiedEmail ?? "").trim().toLowerCase());
  const [otp, setOtp] = useState(getDefaultOtp());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(initialVerifiedEmail));
  const [searched, setSearched] = useState(Boolean(initialVerifiedEmail));
  const [results, setResults] = useState<OrganizationLookupItem[]>([]);
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExitLoading, setIsExitLoading] = useState(false);
  const lastSubmittedOtp = useRef("");
  const hasPortalSession = hasSession || Boolean(initialVerifiedEmail) || isVerified;

  const goBackHome = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore logout failures and continue to the public landing page.
    }

    window.location.assign("/");
  }, []);

  const openPortal = useCallback((slug: string) => {
    if (!slug) {
      return;
    }

    setOpeningSlug(slug);
    window.location.assign(`/portal/open/${slug}`);
  }, []);

  const loadOrganizations = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/portal/organizations", { method: "GET" });
      const payload = await response.json().catch(() => ({ message: "Unable to search organizations." }));

      if (!response.ok) {
        showToast(payload.message || "Unable to search organizations.", "error");
        return;
      }

      const items = Array.isArray(payload.items) ? payload.items as OrganizationLookupItem[] : [];
      setResults(items);
      setSearched(true);
      setStep("results");

      if (items.length === 0) {
        showToast("No organizations found for this verified email.", "error");
      }
    } catch {
      showToast("Unable to search organizations right now.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isVerified) {
      return;
    }

    void loadOrganizations();
  }, [isVerified, loadOrganizations]);

  const requestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showToast("Enter your email to continue.", "error");
      return;
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
        return;
      }

      setOtp(getDefaultOtp());
      lastSubmittedOtp.current = "";
      setStep("otp");
      showToast(payload.message || "OTP requested successfully.");
    } catch {
      showToast("Something went wrong while sending OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const code = otp.join("");

    if (isSubmitting) {
      return;
    }

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
        body: JSON.stringify({ email: normalizedEmail, otp: code, next: "/portal" }),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to verify OTP." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to verify OTP.", "error");
        return;
      }

      setIsVerified(true);
      setSearched(false);
      setResults([]);
      lastSubmittedOtp.current = code;
      showToast("Verification complete.");
    } catch {
      showToast("Something went wrong while verifying OTP.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, isSubmitting, otp, showToast]);

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);

    setOtp((current) => {
      const next = [...current];
      next[index] = nextValue;
      return next;
    });

    if (lastSubmittedOtp.current) {
      lastSubmittedOtp.current = "";
    }

    if (nextValue && index < OTP_LENGTH - 1) {
      document.querySelector<HTMLInputElement>(`input[data-portal-otp="${index + 1}"]`)?.focus();
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document.querySelector<HTMLInputElement>(`input[data-portal-otp="${index - 1}"]`)?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");

    if (!pasted) {
      return;
    }

    event.preventDefault();

    setOtp((current) => {
      const next = [...current];
      pasted
        .slice(0, OTP_LENGTH - index)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      return next;
    });

    if (lastSubmittedOtp.current) {
      lastSubmittedOtp.current = "";
    }

    const focusIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
    document.querySelector<HTMLInputElement>(`input[data-portal-otp="${focusIndex}"]`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (step === "email") {
        void requestOtp();
      } else if (step === "otp") {
        void verifyOtp();
      }
    }
  };

  useEffect(() => {
    if (step !== "otp" || isSubmitting) {
      return;
    }

    const code = otp.join("");

    if (code.length !== OTP_LENGTH) {
      if (lastSubmittedOtp.current === code) {
        lastSubmittedOtp.current = "";
      }
      return;
    }

    if (lastSubmittedOtp.current === code) {
      return;
    }

    void verifyOtp();
  }, [isSubmitting, otp, step, verifyOtp]);

  useEffect(() => {
    if (pathname !== "/portal" || !hasPortalSession) {
      return;
    }

    const guardedUrl = window.location.href;
    const currentMarker = {
      portalBackGuard: "current",
      step,
    };
    const sentinelMarker = {
      portalBackGuard: "sentinel",
      step,
    };

    window.history.replaceState(currentMarker, "", guardedUrl);
    window.history.pushState(sentinelMarker, "", guardedUrl);

    const handlePopState = (event: PopStateEvent) => {
      const marker = event.state?.portalBackGuard;
      window.history.replaceState(currentMarker, "", guardedUrl);
      window.history.pushState(sentinelMarker, "", guardedUrl);

      if (marker === "current" || marker === "sentinel" || window.location.pathname !== "/portal") {
        setShowExitConfirm(true);
        return;
      }

      setShowExitConfirm(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasPortalSession, pathname, step]);

  const handleExitConfirm = useCallback(async () => {
    setIsExitLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore logout failures and continue to home.
    } finally {
      const { protocol, port } = window.location;
      const portSuffix = port ? `:${port}` : "";
      window.location.assign(`${protocol}//lvh.me${portSuffix}/`);
    }
  }, []);

  return (
    <>
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="Leave portal finder?"
        message="Going back will log you out of the current verified portal session and return you to home."
        confirmLabel="Logout"
        loadingLabel="Logging out..."
        tone="warning"
        isLoading={isExitLoading}
        onConfirm={handleExitConfirm}
        onCancel={() => setShowExitConfirm(false)}
      />
      <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(252,253,249,0.96),rgba(228,238,229,0.92))] p-8 shadow-[var(--shadow-soft)] sm:p-10">
          {showRegistration ? (
            <OrganizationRegistrationForm onCancel={() => setShowRegistration(false)} />
          ) : (
            <>
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-strong)]">
                Portal Finder
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[var(--color-ink)] sm:text-5xl">
                Find your organization portal
              </h1>
              <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
                Verify your work email first. After OTP confirmation, we will show the organizations you can access and you can open a portal directly without another verification.
              </p>

              <div className="mt-8 rounded-[28px] border border-[var(--color-border)] bg-white/90 p-5">
                {step === "email" ? (
                  <>
                    <label htmlFor="portal-email" className="text-sm font-medium text-[var(--color-ink)]">
                      Work email
                    </label>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        id="portal-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="jane@company.com"
                        className="h-12 flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                      />
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void requestOtp()}
                        className="theme-btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium disabled:opacity-60"
                      >
                        <Search className="h-4 w-4" />
                        {isSubmitting ? "Sending..." : "Send OTP"}
                      </button>
                    </div>
                  </>
                ) : step === "otp" ? (
                  <>
                    <p className="text-sm font-medium text-[var(--color-ink)]">Verify OTP</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Enter the 6-digit code sent to <span className="font-medium text-[var(--color-ink)]">{email}</span>.
                    </p>
                    <div className="mt-4 flex gap-2 sm:gap-3">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          data-portal-otp={index}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onKeyDown={(event) => {
                            handleKeyDown(event);
                            handleOtpKeyDown(event, index);
                          }}
                          onChange={(event) => handleOtpChange(index, event.target.value)}
                          onPaste={(event) => handleOtpPaste(event, index)}
                          className="h-12 w-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] text-center text-lg font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)] sm:h-14 sm:w-12"
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void verifyOtp()}
                        className="theme-btn-primary inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-medium disabled:opacity-60"
                      >
                        {isSubmitting ? "Verifying..." : "Verify OTP"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setStep("email");
                          setOtp(getDefaultOtp());
                        }}
                        className="theme-action-button theme-action-button-secondary inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm disabled:opacity-60"
                      >
                        Change email
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void requestOtp()}
                        className="text-sm text-[var(--color-muted)] underline underline-offset-4 disabled:opacity-60"
                      >
                        Resend code
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[var(--color-ink)]">Verified email</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Showing available portals for <span className="font-medium text-[var(--color-ink)]">{email}</span>.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void loadOrganizations()}
                        className="theme-btn-primary inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-medium disabled:opacity-60"
                      >
                        {isSubmitting ? "Refreshing..." : "Refresh portals"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => {
                          setIsVerified(false);
                          setStep("email");
                          setSearched(false);
                          setResults([]);
                          setOtp(getDefaultOtp());
                        }}
                        className="theme-action-button theme-action-button-secondary inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm disabled:opacity-60"
                      >
                        Use different email
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-strong)]">
                  Need a new workspace?
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                  If your email is not linked to any organization yet, you can go back home or create a new organization from here.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void goBackHome()}
                    className="theme-action-button theme-action-button-secondary inline-flex h-11 items-center rounded-2xl px-5 text-sm"
                  >
                    Back to home
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegistration(true)}
                    className="theme-btn-primary inline-flex h-11 items-center rounded-2xl px-5 text-sm font-medium"
                  >
                    Create organization
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[36px] border border-[var(--color-border)] bg-[var(--color-panel)] p-8 shadow-[var(--shadow-soft)] sm:p-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3">
              <Waypoints className="h-5 w-5 text-[var(--color-brand-strong)]" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-strong)]">
                  Available portals
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Verified organizations will appear here as cards.
              </p>
            </div>
          </div>

          {!isVerified ? (
            <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-[var(--color-border)] bg-white px-6 text-center text-sm leading-7 text-[var(--color-muted)]">
              Verify your email first to unlock the organization list.
            </div>
          ) : !searched || isSubmitting ? (
            <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-[var(--color-border)] bg-white px-6 text-center text-sm leading-7 text-[var(--color-muted)]">
              Loading verified organization portals.
            </div>
          ) : results.length === 0 ? (
            <div className="mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--color-border)] bg-white px-6 text-center">
              <Building2 className="h-10 w-10 text-[var(--color-muted)]" />
              <p className="mt-4 text-lg font-medium text-[var(--color-ink)]">No portals found</p>
              <p className="mt-2 max-w-md text-sm leading-7 text-[var(--color-muted)]">
                We could not find an active organization for your verified email.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void goBackHome()}
                  className="theme-action-button theme-action-button-secondary inline-flex h-11 items-center rounded-2xl px-5 text-sm"
                >
                  Back home
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegistration(true)}
                  className="theme-btn-primary inline-flex h-11 items-center rounded-2xl px-5 text-sm font-medium"
                >
                  Create organization
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {results.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[28px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)]">
                      {item.logoUrl ? (
                        <Image
                          src={item.logoUrl}
                          alt={`${item.name} logo`}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-[var(--color-brand-strong)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-[var(--color-ink)]">{item.name}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{item.slug}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(openingSlug)}
                    onClick={() => openPortal(item.slug)}
                    className="theme-btn-primary mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-medium disabled:opacity-70"
                  >
                    {openingSlug === item.slug ? "Opening portal..." : "Open portal"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
        </section>
      </main>
    </>
  );
}
