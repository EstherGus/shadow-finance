"use client";

import { useState } from "react";

interface TransactionFormProps {
  type: "income" | "expense";
  onSubmit: (data: {
    amount: string;
    source?: string;
    category?: string;
    date: number;
    note: string;
  }) => Promise<void>;
  disabled?: boolean;
}

export function TransactionForm({ type, onSubmit, disabled }: TransactionFormProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (type === "income" && !source) || (type === "expense" && !category)) {
      return;
    }

    if (disabled) {
      return;
    }

    setLoading(true);
    try {
      const timestamp = Math.floor(new Date(date).getTime() / 1000);
      await onSubmit({
        amount,
        source: type === "income" ? source : undefined,
        category: type === "expense" ? category : undefined,
        date: timestamp,
        note,
      });
      // Reset form
      setAmount("");
      setSource("");
      setCategory("");
      setNote("");
    } catch (error) {
      console.error("Transaction submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="0.00"
        />
      </div>

      {type === "income" ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Source
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="e.g., Salary, Investment"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="e.g., Food, Transport"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Note (Optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          placeholder="Additional notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading || disabled}
        className="w-full inline-flex items-center justify-center px-5 py-3 rounded-md font-semibold text-slate-900 bg-gradient-to-r from-[#83d1cc] via-[#48a9d0] to-[#6072e9] shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#6072e9] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : `Add ${type === "income" ? "Income" : "Expense"}`}
      </button>
    </form>
  );
}


