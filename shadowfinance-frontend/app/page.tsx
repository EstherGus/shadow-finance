"use client";

import { Navbar } from "@/components/Navbar";
import { useMetaMask } from "@/hooks/metamask/useMetaMaskProvider";
import Link from "next/link";

export default function Home() {
  const { isConnected, connect } = useMetaMask();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <section className="mt-16 mb-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="relative">
            <div className="absolute -top-16 -left-20 h-48 w-48 rounded-full bg-gradient-to-r from-[#83d1cc] to-[#6072e9] opacity-30 blur-3xl" />
            <h1 className="sf-section-title text-4xl md:text-5xl">
              Private-by-design <span className="sf-highlight">finance intelligence</span> for Web3 citizens
          </h1>
            <p className="sf-section-description mt-5">
              ShadowFinance encrypts every transaction, budget, and goal on-chain using FHEVM. Analyse, compare and share insights without exposing raw balances.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {!isConnected ? (
                <button
                  onClick={connect}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_18px_45px_rgba(96,114,233,0.35)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6072e9]"
                >
                  <span>Connect Wallet Securely</span>
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_18px_45px_rgba(96,114,233,0.35)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6072e9]"
                >
                  Enter encrypted dashboard
                </Link>
              )}
              <Link
                href="/transactions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/70 bg-white/60 text-sm font-semibold text-[var(--color-text)] shadow-[0_10px_30px_rgba(131,209,204,0.22)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Explore secure workflows
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
              <span className="sf-pill">Fully Homomorphic Encryption</span>
              <span className="sf-pill">Zero data leakage</span>
              <span className="sf-pill">Wallet auto-resume</span>
            </div>
          </div>

          <div className="sf-card">
            <h3 className="sf-card-title">Live encrypted snapshot</h3>
            <p className="sf-card-subtitle mb-6">Metrics refresh instantly after every on-chain interaction.</p>
            <div className="grid gap-4">
              <div className="rounded-2xl bg-white/70 dark:bg-white/10 border border-white/60 dark:border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Total Balance</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--color-text)]">$—.——</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Private until you decrypt.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-[#83d1cc]/20 to-transparent border border-white/60 dark:border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Budgets</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">Granular & FHE-secured</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-[#6072e9]/18 to-transparent border border-white/60 dark:border-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Goals</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--color-text)]">Progress without revealing totals</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 dark:bg-white/10 border border-white/50 dark:border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Sync status</p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Wallet reconnects silently · FHE context hydrated on page load.
          </p>
        </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="sf-card">
              <h4 className="text-lg font-semibold text-[var(--color-text)]">Encrypted Transactions</h4>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Capture income and expense streams with FHE handles. Only your browser decrypts the result when you authorise.
              </p>
              <Link href="/transactions" className="mt-4 inline-flex text-sm font-semibold text-[#6072e9]">
                Record an entry →
              </Link>
            </div>
            <div className="sf-card">
              <h4 className="text-lg font-semibold text-[var(--color-text)]">Budget Intelligence</h4>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                Allocate spending envelopes per category. Remaining limits stay encrypted, yet trend charts stay responsive.
              </p>
              <Link href="/budget" className="mt-4 inline-flex text-sm font-semibold text-[#6072e9]">
                Configure budgets →
              </Link>
            </div>
            <div className="sf-card">
              <h4 className="text-lg font-semibold text-[var(--color-text)]">Goal Tracking</h4>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                From emergency funds to expense caps – progress, completion and insights remain private until you decrypt them.
              </p>
              <Link href="/goals" className="mt-4 inline-flex text-sm font-semibold text-[#6072e9]">
                Plan milestones →
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-20 sf-glass">
          <h3 className="text-xl font-semibold text-[var(--color-text)]">Privacy-first workflow</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {["Encrypt input", "Submit with proof", "Authorize decrypt", "Visualise securely"].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/50 dark:bg-white/5 p-4 shadow-sm">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#83d1cc] to-[#6072e9] text-white text-sm font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-[var(--color-text)]">{step}</p>
              </div>
            ))}
        </div>
        </section>
      </main>
    </div>
  );
}
