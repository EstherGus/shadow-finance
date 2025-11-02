"use client";

import { useEffect, useMemo } from "react";

import { Navbar } from "@/components/Navbar";
import { useShadowFinance } from "@/contexts/ShadowFinanceContext";

function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const { state, meta, actions } = useShadowFinance();
  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);

  // 页面挂载时触发刷新，确保数据是最新的
  useEffect(() => {
    if (meta.isConnected && state.contract?.address && state.ready && !state.refreshing && !state.loading) {
      console.log("[DashboardPage] Mounted, calling refreshAll");
      actions.refreshAll();
    }
  }, [meta.isConnected, state.contract?.address]); // 只在连接状态或合约地址变化时执行，避免无限循环

  const activeBudgets = useMemo(
    () => state.budgets.filter((budget) => budget.active),
    [state.budgets]
  );

  const ongoingGoals = useMemo(
    () => state.goals.filter((goal) => goal.active),
    [state.goals]
  );

  const renderConnectionNotice = () => (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)] mb-4">
        Connect your wallet to view encrypted analytics and balances.
      </p>
      <button
        onClick={meta.connect}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_15px_40px_rgba(96,114,233,0.35)]"
      >
        Connect Wallet
      </button>
    </div>
  );

  const renderContractNotice = () => (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)]">
        ShadowFinance contract is not deployed on this network. Switch to a supported chain to inspect the dashboard.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <header className="mt-16 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="sf-section-title">Encrypted Overview</h1>
            <p className="sf-section-description">
              Every number is computed from Fully Homomorphic Encryption outputs and decrypted only in your browser.
            </p>
          </div>
          {state.refreshing && (
            <span className="sf-pill">Syncing latest on-chain data…</span>
          )}
        </header>

        {!meta.isConnected && renderConnectionNotice()}
        {meta.isConnected && state.contract?.address === undefined && renderContractNotice()}

        {meta.isConnected && state.contract?.address && (
          <>
            {state.loading || state.refreshing ? (
              <div className="sf-card text-center py-12">
                <p className="text-base text-[var(--color-text-muted)]">
                  {state.refreshing ? "Syncing latest on-chain data…" : "Decrypting encrypted data..."}
                </p>
              </div>
            ) : (
              <>
                <section className="sf-grid-hero mb-12">
                  <div className="sf-card">
                    <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                      Total Income
                    </p>
                    <p className="mt-4 text-4xl font-semibold text-[var(--color-text)]">
                      ${state.totals.income.formatted}
                    </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-3">
                  Summed from encrypted inflows. Source mix remains private until you decrypt details.
                </p>
              </div>
              <div className="sf-card">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                  Total Expense
                </p>
                <p className="mt-4 text-4xl font-semibold text-[#f7419f]">
                  ${state.totals.expense.formatted}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-3">
                  Every expenditure handle is validated with input proofs before aggregation.
                </p>
              </div>
              <div className="sf-card">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
                  Net Position
                </p>
                <p className="mt-4 text-4xl font-semibold text-[#6072e9]">
                  ${state.totals.net.formatted}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-3">
                  Savings rate: {formatPercent(state.analytics.savingsRate)}
                </p>
              </div>
            </section>

            <section className="mb-12 sf-glass">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-[var(--color-text)]">
                  Monthly cash flow
                </h2>
                <span className="sf-pill">{state.analytics.monthly.length} months</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
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
                      <tr key={`month-${entry.month}`}>
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
                          No activity yet. Add encrypted transactions to see trends.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-12 grid gap-8 xl:grid-cols-2">
              <div className="sf-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Expense distribution
                  </h3>
                  <span className="sf-pill">{state.analytics.expenseByCategory.length} categories</span>
                </div>
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Spending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.analytics.expenseByCategory.map((entry) => (
                        <tr key={`cat-${entry.category}`}>
                          <td>{entry.category}</td>
                          <td className="text-right text-[#f7419f] font-medium">
                            ${entry.expense.formatted}
                          </td>
                        </tr>
                      ))}
                      {state.analytics.expenseByCategory.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-center text-sm text-[var(--color-text-muted)]">
                            No categories yet. Record encrypted expenses to populate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sf-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Income sources
                  </h3>
                  <span className="sf-pill">{state.analytics.incomeBySource.length} streams</span>
                </div>
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th className="text-right">Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.analytics.incomeBySource.map((entry) => (
                        <tr key={`source-${entry.category}`}>
                          <td>{entry.category}</td>
                          <td className="text-right text-[#27f2f6] font-medium">
                            ${entry.income.formatted}
                          </td>
                        </tr>
                      ))}
                      {state.analytics.incomeBySource.length === 0 && (
                        <tr>
                          <td colSpan={2} className="text-center text-sm text-[var(--color-text-muted)]">
                            No recorded income yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-2 mb-20">
              <div className="sf-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Active budgets
                  </h3>
                  <span className="sf-pill">{activeBudgets.length} active</span>
                </div>
                <div className="mt-6 space-y-4">
                  {activeBudgets.map((budget) => (
                    <div
                      key={`budget-${budget.category}`}
                      className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-[var(--color-text)]">
                            {budget.category}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            Period code {budget.period} · Start {formatDate(budget.startDate)}
                          </p>
                        </div>
                        <span
                          className={`sf-pill ${
                            budget.isOverBudget ? "bg-[#f7419f]/20 text-[#f7419f]" : "bg-[#83d1cc]/25 text-[#27758b]"
                          }`}
                        >
                          {budget.isOverBudget ? "Over budget" : "On track"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--color-text-muted)]">Budget</p>
                          <p className="font-semibold text-[var(--color-text)]">
                            ${budget.amount.formatted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Spent</p>
                          <p className="font-semibold text-[#f7419f]">
                            ${budget.spent.formatted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Remaining</p>
                          <p className="font-semibold text-[#6072e9]">
                            ${budget.remaining.formatted}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeBudgets.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No budgets set yet. Head to the budget screen to create encrypted envelopes.
                    </p>
                  )}
                </div>
              </div>

              <div className="sf-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text)]">
                    Goals progress
                  </h3>
                  <span className="sf-pill">{ongoingGoals.length} active</span>
                </div>
                <div className="mt-6 space-y-4">
                  {ongoingGoals.map((goal) => {
                    const progress = goal.target.raw === ZERO
                      ? 0
                      : Math.min(
                          100,
                          Number((goal.current.raw * HUNDRED) / goal.target.raw)
                        );
                    return (
                      <div
                        key={`goal-${goal.index}`}
                        className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-semibold text-[var(--color-text)]">
                              {goal.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              {goal.goalType === "savings" ? "Savings goal" : "Expense cap"} · Deadline {formatDate(goal.deadline)}
                            </p>
                          </div>
                          <span
                            className={`sf-pill ${
                              goal.completed
                                ? "bg-[#83d1cc]/25 text-[#27758b]"
                                : "bg-[#6072e9]/20 text-[#6072e9]"
                            }`}
                          >
                            {goal.completed ? "Completed" : `${progress.toFixed(0)}%`}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                            <span>${goal.current.formatted}</span>
                            <span>Target ${goal.target.formatted}</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-white/70 dark:bg-white/10">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-[#83d1cc] to-[#6072e9]"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {ongoingGoals.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No active goals. Create one to track encrypted milestones.
                    </p>
                  )}
                </div>
              </div>
            </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
