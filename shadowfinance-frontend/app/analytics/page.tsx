"use client";

import { useEffect } from "react";

import { Navbar } from "@/components/Navbar";
import { useShadowFinance } from "@/contexts/ShadowFinanceContext";

function renderConnectionNotice(connect: () => void) {
  return (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)] mb-4">
        Connect your wallet to unlock encrypted analytics.
      </p>
      <button
        onClick={connect}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_15px_40px_rgba(96,114,233,0.35)]"
      >
        Connect Wallet
      </button>
    </div>
  );
}

function renderContractNotice() {
  return (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)]">
        ShadowFinance contract is not deployed on this network. Switch to a supported chain to inspect analytics.
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { state, meta, actions } = useShadowFinance();

  // 页面挂载时触发刷新，确保数据是最新的
  useEffect(() => {
    if (meta.isConnected && state.contract?.address && state.ready && !state.refreshing && !state.loading) {
      console.log("[AnalyticsPage] Mounted, calling refreshAll");
      actions.refreshAll();
    }
  }, [meta.isConnected, state.contract?.address]); // 只在连接状态或合约地址变化时执行，避免无限循环

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <header className="mt-16 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="sf-section-title">Analytics</h1>
            <p className="sf-section-description">
              Visualise spending trends, category distribution, and income sources derived from encrypted records.
            </p>
          </div>
          {state.refreshing && (
            <span className="sf-pill">Updating analytics…</span>
          )}
        </header>

        {!meta.isConnected && renderConnectionNotice(meta.connect)}
        {meta.isConnected && state.contract?.address === undefined && renderContractNotice()}

        {meta.isConnected && state.contract?.address && (
          <>
            {state.loading || state.refreshing ? (
              <div className="sf-card text-center py-12">
                <p className="text-base text-[var(--color-text-muted)]">
                  {state.refreshing ? "Syncing analytics…" : "Decrypting encrypted analytics..."}
                </p>
              </div>
            ) : (
              <div className="space-y-12 mb-20">
            <section className="sf-card">
              <header className="flex flex-wrap items-center justify-between gap-6 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">
                    Monthly summary
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    All values decrypted locally. Net equals income minus expenses per month.
                  </p>
                </div>
                <span className="sf-pill">{state.analytics.monthly.length} months</span>
              </header>
              <div className="rounded-2xl border border-white/40 dark:border-white/10 overflow-hidden">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Income</th>
                      <th className="text-right">Expense</th>
                      <th className="text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.analytics.monthly.map((entry) => (
                      <tr key={`analytics-month-${entry.month}`}>
                        <td>{entry.month}</td>
                        <td className="text-right text-[#27f2f6] font-medium">
                          ${entry.income.formatted}
                        </td>
                        <td className="text-right text-[#f7419f] font-medium">
                          ${entry.expense.formatted}
                        </td>
                        <td className="text-right font-semibold text-[#6072e9]">
                          ${entry.net.formatted}
                        </td>
                      </tr>
                    ))}
                    {state.analytics.monthly.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-sm text-[var(--color-text-muted)]">
                          No monthly transactions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-2">
              <div className="sf-card">
                <header className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Expense distribution
                  </h3>
                  <span className="sf-pill">{state.analytics.expenseByCategory.length} categories</span>
                </header>
                <div className="mt-6 rounded-2xl border border-white/40 dark:border-white/10 overflow-hidden">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.analytics.expenseByCategory.map((entry) => (
                        <tr key={`analytics-category-${entry.category}`}>
                          <td>{entry.category}</td>
                          <td className="text-right text-[#f7419f] font-medium">
                            ${entry.expense.formatted}
                          </td>
                        </tr>
                      ))}
                      {state.analytics.expenseByCategory.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-center text-sm text-[var(--color-text-muted)]">
                            No categorized expenses yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sf-card">
                <header className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Income sources
                  </h3>
                  <span className="sf-pill">{state.analytics.incomeBySource.length} streams</span>
                </header>
                <div className="mt-6 rounded-2xl border border-white/40 dark:border-white/10 overflow-hidden">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th className="text-right">Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.analytics.incomeBySource.map((entry) => (
                        <tr key={`analytics-source-${entry.category}`}>
                          <td>{entry.category}</td>
                          <td className="text-right text-[#27f2f6] font-medium">
                            ${entry.income.formatted}
                          </td>
                        </tr>
                      ))}
                      {state.analytics.incomeBySource.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-center text-sm text-[var(--color-text-muted)]">
                            No income sources recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
