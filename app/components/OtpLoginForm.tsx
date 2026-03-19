"use client";

import Link from "next/link";
import { useState } from "react";
import { OrganizationRegistrationForm } from "./OrganizationRegistrationForm";

export function OtpLoginForm() {
  const [showRegistration, setShowRegistration] = useState(false);

  const platformHighlights = [
    "Branded careers experience",
    "Structured hiring workflows",
    "Secure team access",
  ];

  const featureCards = [
    {
      title: "Careers Front Door",
      body: "Present open roles through a polished hiring experience that feels like part of your brand.",
    },
    {
      title: "Candidate Pipeline",
      body: "Capture applications, review resumes, and move candidates through each stage with clarity.",
    },
    {
      title: "Hiring Coordination",
      body: "Give recruiters and hiring managers one place to align on decisions, feedback, and follow-up.",
    },
  ];

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(252,253,249,0.94),rgba(228,238,229,0.9))] p-8 shadow-[var(--shadow-soft)] sm:p-10 lg:p-12">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(165,235,46,0.3),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-strong)]">
                Talent Workspace
              </div>
              <Link
                href="/system/login"
                prefetch
                className="rounded-full border border-[var(--color-border)] bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)] transition hover:border-[var(--color-border-strong)] hover:bg-white"
              >
                Super Admin
              </Link>
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
              Hiring software that feels customer-ready from the first page.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)] sm:text-lg">
              Publish roles, receive applications, review candidates, and keep hiring momentum moving in one focused workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {platformHighlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--color-border)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[28px] border border-[var(--color-border)] bg-white/82 p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-strong)]">
                    {card.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {card.body}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-10 grid gap-4 rounded-[30px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6 md:grid-cols-3">
              <div>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-ink)]">Branded</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">A careers experience that looks intentional and polished.</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-ink)]">Collaborative</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Shared visibility for recruiters, operators, and hiring teams.</p>
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-ink)]">Practical</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Built for day-to-day recruiting work, not just collecting resumes.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[32px] border border-[var(--color-border)] bg-[var(--color-panel)] p-7 shadow-[var(--shadow-soft)] sm:p-8">
            {showRegistration ? (
              <OrganizationRegistrationForm onCancel={() => setShowRegistration(false)} />
            ) : (
              <>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
                  Recruiting Software
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-4xl">
                  Launch your hiring workspace
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
                  Start with a new workspace for your hiring team, or sign in to continue managing an existing one.
                </p>

                <button
                  type="button"
                  onClick={() => setShowRegistration(true)}
                  className="theme-btn-primary mt-8 flex h-13 w-full cursor-pointer items-center justify-center rounded-2xl text-base font-medium"
                >
                  Create workspace
                </button>

                <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
                  Already have a portal?{" "}
                  <Link href="/portal" className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition hover:text-[var(--color-brand-strong)]">
                    Open your organization&apos;s URL directly (for example{" "}
                    <span className="font-mono text-xs">your-slug.ourdomain</span>)
                  </Link>
                </p>
                <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center">
                  <Link
                    href="/system/login"
                    prefetch
                    className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                  >
                    Super admin sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
