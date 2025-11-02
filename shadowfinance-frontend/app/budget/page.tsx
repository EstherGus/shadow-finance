"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { useShadowFinance } from "@/contexts/ShadowFinanceContext";

const PERIOD_LABEL: Record<number, string> = {
  0: "Weekly",
  1: "Monthly",
  2: "Yearly",
};

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

export default function BudgetPage() {
  const { state, actions, meta } = useShadowFinance();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  // 页面挂载时触发刷新，确保数据是最新的
  useEffect(() => {
    if (meta.isConnected && state.contract?.address && state.ready && !state.refreshing && !state.loading) {
      console.log("[BudgetPage] Mounted, calling refreshAll");
      actions.refreshAll();
    }
  }, [meta.isConnected, state.contract?.address]); // 只在连接状态或合约地址变化时执行，避免无限循环

  const activeBudgets = useMemo(
    () => state.budgets.filter((budget) => budget.active),
    [state.budgets]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setSuccess(undefined);

    if (!category.trim()) {
      setFormError("Category is required");
      return;
    }

    if (!amount.trim()) {
      setFormError("Amount is required");
      return;
    }

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);

    try {
      await actions.setBudget({
        category: category.trim(),
        amount,
        period,
        startDate: startTimestamp,
      });
      setSuccess("Budget saved.");
      setCategory("");
      setAmount("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const renderConnectionNotice = () => (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)] mb-4">
        Connect your wallet to configure encrypted budgets.
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
        ShadowFinance contract is not deployed on this network. Switch to a supported chain to manage budgets.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <header className="mt-16 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="sf-section-title">Budget intelligence</h1>
            <p className="sf-section-description">
              Define encrypted spending envelopes and keep remaining headroom private. Only aggregated trends are displayed.
            </p>
          </div>
          {state.refreshing && <span className="sf-pill">Recomputing encrypted envelopes…</span>}
        </header>

        {!meta.isConnected && renderConnectionNotice()}
        {meta.isConnected && state.contract?.address === undefined && renderContractNotice()}

        {meta.isConnected && state.contract?.address && (
          <>
            {state.loading || state.refreshing ? (
              <div className="sf-card text-center py-12">
                <p className="text-base text-[var(--color-text-muted)]">
                  {state.refreshing ? "Recomputing encrypted envelopes…" : "Decrypting encrypted budgets..."}
                </p>
              </div>
            ) : (
              <>
                {(formError || success || state.error) && (
              <div
                className={`mb-8 rounded-2xl border px-5 py-4 text-sm shadow-[0_18px_40px_rgba(131,209,204,0.22)] ${
                  formError || state.error
                    ? "border-[#f7419f]/40 bg-[#f7419f]/10 text-[#a11d64] dark:text-[#fcd2e5]"
                    : "border-[#83d1cc]/45 bg-[#83d1cc]/15 text-[#27758b]"
                }`}
              >
                {formError || state.error || success}
              </div>
            )}

            <section className="mb-12 grid gap-8 xl:grid-cols-[1.2fr_1fr]">
              <div className="sf-card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  Create encrypted budget
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Allocations are stored as encrypted integers. Remaining headroom uses the same encryption context for subtraction.
                </p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        required
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                        placeholder="e.g., Food, Housing"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        required
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Period
                      </label>
                      <select
                        value={period}
                        onChange={(event) => setPeriod(Number(event.target.value))}
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                      >
                        <option value={0}>Weekly</option>
                        <option value={1}>Monthly</option>
                        <option value={2}>Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={state.refreshing}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_15px_40px_rgba(96,114,233,0.35)] disabled:opacity-50"
                  >
                    Save budget
                  </button>
                </form>
              </div>

              <div className="sf-card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  Snapshot
                </h2>
                <div className="space-y-4 text-sm text-[var(--color-text-muted)]">
                  <p>
                    • Encrypted remainders: subtraction performed in FHE, with signed interpretation client-side.
                  </p>
                  <p>
                    • Status badges turn pink when the encrypted spent value exceeds the budget handle.
                  </p>
                  <p>
                    • Deploying new budgets triggers regeneration of ABI map and static exports.
                  </p>
                </div>
              </div>
            </section>

            <section className="sf-glass mb-20">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--color-text)]">
                  Budget ledger
                </h3>
                <span className="sf-pill">{state.budgets.length} total · {activeBudgets.length} active</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Period</th>
                      <th className="text-right">Budget</th>
                      <th className="text-right">Spent</th>
                      <th className="text-right">Remaining</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.budgets.map((budget) => (
                      <tr key={`budget-row-${budget.category}`}>
                        <td>
                          <div className="font-semibold text-[var(--color-text)]">
                            {budget.category}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            Start {formatDate(budget.startDate)}
                          </div>
                        </td>
                        <td>{PERIOD_LABEL[budget.period] ?? `Code ${budget.period}`}</td>
                        <td className="text-right text-[var(--color-text)] font-medium">
                          ${budget.amount.formatted}
                        </td>
                        <td className="text-right text-[#f7419f] font-medium">
                          ${budget.spent.formatted}
                        </td>
                        <td className="text-right text-[#6072e9] font-medium">
                          ${budget.remaining.formatted}
                        </td>
                        <td className="text-center">
                          <span
                            className={`sf-pill ${
                              budget.isOverBudget ? "bg-[#f7419f]/20 text-[#f7419f]" : "bg-[#83d1cc]/25 text-[#27758b]"
                            }`}
                          >
                            {budget.isOverBudget ? "Over" : "On track"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {state.budgets.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-sm text-[var(--color-text-muted)]">
                          No budgets defined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
