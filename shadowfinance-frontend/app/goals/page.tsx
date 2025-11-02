"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { useShadowFinance } from "@/contexts/ShadowFinanceContext";

function formatDate(timestamp: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

export default function GoalsPage() {
  const { state, actions, meta } = useShadowFinance();
  const ZERO = BigInt(0);
  const TEN_THOUSAND = BigInt(10000);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<"savings" | "expense">("savings");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  // 页面挂载时触发刷新，确保数据是最新的
  useEffect(() => {
    if (meta.isConnected && state.contract?.address && state.ready && !state.refreshing && !state.loading) {
      console.log("[GoalsPage] Mounted, calling refreshAll");
      actions.refreshAll();
    }
  }, [meta.isConnected, state.contract?.address]); // 只在连接状态或合约地址变化时执行，避免无限循环

  const activeGoals = useMemo(
    () => state.goals.filter((goal) => goal.active),
    [state.goals]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);
    setSuccess(undefined);

    if (!name.trim()) {
      setFormError("Goal name is required");
      return;
    }
    if (!amount.trim()) {
      setFormError("Target amount is required");
      return;
    }

    const deadlineSeconds = Math.floor(new Date(deadline).getTime() / 1000);

    try {
      await actions.setGoal({
        name: name.trim(),
        goalType,
        amount,
        deadline: deadlineSeconds,
        note,
      });
      setSuccess("Goal saved.");
      setName("");
      setAmount("");
      setNote("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const renderConnectionNotice = () => (
    <div className="sf-card text-center">
      <p className="text-base text-[var(--color-text-muted)] mb-4">
        Connect your wallet to create encrypted financial goals.
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
        ShadowFinance contract is not deployed on this network. Switch to a supported chain to manage goals.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-container">
        <header className="mt-16 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="sf-section-title">Encrypted goals</h1>
            <p className="sf-section-description">
              Track savings goals and expense caps without exposing balances. FHE handles keep progress private until you decrypt.
            </p>
          </div>
          {state.refreshing && <span className="sf-pill">Syncing encrypted goals…</span>}
        </header>

        {!meta.isConnected && renderConnectionNotice()}
        {meta.isConnected && state.contract?.address === undefined && renderContractNotice()}

        {meta.isConnected && state.contract?.address && (
          <>
            {state.loading || state.refreshing ? (
              <div className="sf-card text-center py-12">
                <p className="text-base text-[var(--color-text-muted)]">
                  {state.refreshing ? "Syncing encrypted goals…" : "Decrypting encrypted goals..."}
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
                  Create encrypted goal
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mb-6">
                  Savings goals accumulate net income; expense goals monitor encrypted outflow staying below the target.
                </p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Goal name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                        placeholder="e.g., Emergency fund"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Target amount
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
                        Goal type
                      </label>
                      <select
                        value={goalType}
                        onChange={(event) =>
                          setGoalType(event.target.value as "savings" | "expense")
                        }
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                      >
                        <option value="savings">Savings goal</option>
                        <option value="expense">Expense cap</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(event) => setDeadline(event.target.value)}
                        className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      className="w-full rounded-xl border border-white/60 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] shadow-sm"
                      placeholder="Describe milestones or conditions"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={state.refreshing}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-[0_15px_40px_rgba(96,114,233,0.35)] disabled:opacity-50"
                  >
                    Save goal
                  </button>
                </form>
              </div>

              <div className="sf-card">
                <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
                  Workflow tips
                </h2>
                <ul className="space-y-3 text-sm text-[var(--color-text-muted)]">
                  <li>• Savings goals derive progress from encrypted net income handles.</li>
                  <li>• Expense caps use encrypted total expense – no raw amount ever leaves the chain.</li>
                  <li>• Completion badges flip automatically once FHE comparisons resolve.</li>
                </ul>
              </div>
            </section>

            <section className="sf-glass mb-20">
              <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
                <h3 className="text-xl font-semibold text-[var(--color-text)]">
                  Goals ledger
                </h3>
                <span className="sf-pill">{state.goals.length} total · {activeGoals.length} active</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/40 dark:border-white/10">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Goal</th>
                      <th className="text-right">Current</th>
                      <th className="text-right">Target</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.goals.map((goal) => {
                      const progress = goal.target.raw === ZERO
                        ? 0
                        : Number((goal.current.raw * TEN_THOUSAND) / goal.target.raw) / 100;
                      return (
                        <tr key={`goal-row-${goal.index}`}>
                          <td>
                            <div className="font-semibold text-[var(--color-text)]">
                              {goal.name}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {goal.goalType === "savings" ? "Savings" : "Expense"} · Deadline {formatDate(goal.deadline)}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)]">
                              {goal.note || "No additional notes"}
                            </div>
                          </td>
                          <td className="text-right text-[#6072e9] font-medium">
                            ${goal.current.formatted}
                          </td>
                          <td className="text-right text-[var(--color-text)] font-medium">
                            ${goal.target.formatted}
                          </td>
                          <td className="text-center">
                            <span
                              className={`sf-pill ${
                                goal.completed
                                  ? "bg-[#83d1cc]/25 text-[#27758b]"
                                  : "bg-[#6072e9]/20 text-[#6072e9]"
                              }`}
                            >
                              {goal.completed ? "Completed" : `${progress.toFixed(1)}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {state.goals.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-sm text-[var(--color-text-muted)]">
                          No goals defined yet.
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
