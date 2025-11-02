"use client";

import { useEffect, useMemo, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { TransactionForm } from "@/components/TransactionForm";
import { useShadowFinance } from "@/contexts/ShadowFinanceContext";

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TransactionsPage() {
  const { state, actions, meta } = useShadowFinance();
  const [formError, setFormError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  // 页面挂载时触发刷新，确保数据是最新的
  useEffect(() => {
    if (meta.isConnected && state.contract?.address && state.ready && !state.refreshing && !state.loading) {
      console.log("[TransactionsPage] Mounted, calling refreshAll");
      actions.refreshAll();
    }
  }, [meta.isConnected, state.contract?.address]); // 只在连接状态或合约地址变化时执行，避免无限循环

  const isBusy = state.refreshing;

  const sortedIncomes = useMemo(
    () => [...state.incomes].sort((a, b) => b.date - a.date),
    [state.incomes]
  );

  const sortedExpenses = useMemo(
    () => [...state.expenses].sort((a, b) => b.date - a.date),
    [state.expenses]
  );

  const handleIncomeSubmit = async (data: {
    amount: string;
    source?: string;
    date: number;
    note: string;
  }) => {
    setFormError(undefined);
    setSuccessMessage(undefined);
    try {
      await actions.addIncome({
        amount: data.amount,
        source: data.source ?? "",
        date: data.date,
        note: data.note,
      });
      setSuccessMessage("Income recorded successfully.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleExpenseSubmit = async (data: {
    amount: string;
    category?: string;
    date: number;
    note: string;
  }) => {
    setFormError(undefined);
    setSuccessMessage(undefined);
    try {
      await actions.addExpense({
        amount: data.amount,
        category: data.category ?? "",
        date: data.date,
        note: data.note,
      });
      setSuccessMessage("Expense recorded successfully.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const renderConnectionNotice = () => (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)] mb-4">
        Connect your wallet to record encrypted transactions.
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
        ShadowFinance contract is not deployed on the current network. Switch to a supported chain to continue.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <header className="mt-16 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="sf-section-title">Encrypted Transactions</h1>
            <p className="sf-section-description">
              Capture incomes and expenses with input proofs. Totals remain private until you decrypt them locally.
            </p>
          </div>
          {state.refreshing && <span className="sf-pill">Syncing ledger…</span>}
        </header>

        {!meta.isConnected && renderConnectionNotice()}
        {meta.isConnected && state.contract?.address === undefined && renderContractNotice()}

        {meta.isConnected && state.contract?.address && (
          <>
            {state.loading || state.refreshing ? (
              <div className="sf-card text-center py-12">
                <p className="text-base text-[var(--color-text-muted)]">
                  {state.refreshing ? "Syncing ledger…" : "Decrypting encrypted transactions..."}
                </p>
              </div>
            ) : (
              <>
                {(state.error || formError || successMessage) && (
              <div
                className={`mb-8 rounded-2xl border px-5 py-4 text-sm shadow-[0_18px_40px_rgba(131,209,204,0.22)] ${
                  formError || state.error
                    ? "border-[#f7419f]/40 bg-[#f7419f]/10 text-[#a11d64] dark:text-[#fcd2e5]"
                    : "border-[#83d1cc]/45 bg-[#83d1cc]/15 text-[#27758b]"
                }`}
              >
                {formError || state.error || successMessage}
              </div>
            )}

            <section className="mb-12 grid gap-8 xl:grid-cols-2">
              <div className="sf-card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  Add encrypted income
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Amounts are encrypted with your FHE key. Proofs travel with the transaction to guarantee authenticity.
                </p>
                <TransactionForm type="income" onSubmit={handleIncomeSubmit} disabled={isBusy} />
              </div>
              <div className="sf-card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  Add encrypted expense
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Categorise outflows without revealing raw values. Decrypt when you need full visibility.
                </p>
                <TransactionForm type="expense" onSubmit={handleExpenseSubmit} disabled={isBusy} />
              </div>
            </section>

            <section className="sf-glass mb-20">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text)]">Transaction history</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Sorted by newest first. Values remain encrypted until you authorise a decrypt operation.
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="sf-pill">{sortedIncomes.length} incomes</span>
                  <span className="sf-pill">{sortedExpenses.length} expenses</span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/40 dark:border-white/10 overflow-hidden">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedIncomes.map((income) => (
                        <tr key={`income-${income.index}`}>
                          <td>{formatTimestamp(income.date)}</td>
                          <td>{income.source || "Unknown"}</td>
                          <td className="text-right text-[#27f2f6] font-medium">
                            ${income.amount.formatted}
                          </td>
                        </tr>
                      ))}
                      {sortedIncomes.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-sm text-[var(--color-text-muted)]">
                            No income records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-white/40 dark:border-white/10 overflow-hidden">
                  <table className="sf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExpenses.map((expense) => (
                        <tr key={`expense-${expense.index}`}>
                          <td>{formatTimestamp(expense.date)}</td>
                          <td>{expense.category || "General"}</td>
                          <td className="text-right text-[#f7419f] font-medium">
                            ${expense.amount.formatted}
                          </td>
                        </tr>
                      ))}
                      {sortedExpenses.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-sm text-[var(--color-text-muted)]">
                            No expense records yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
