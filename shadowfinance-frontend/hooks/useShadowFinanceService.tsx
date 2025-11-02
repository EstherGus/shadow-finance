"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";

import { ShadowFinanceABI } from "@/abi/ShadowFinanceABI";
import { ShadowFinanceAddresses } from "@/abi/ShadowFinanceAddresses";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

type NumericHandle = string;

export type MoneyValue = {
  raw: bigint;
  formatted: string;
};

export type IncomeRecord = {
  index: number;
  source: string;
  note: string;
  date: number;
  amount: MoneyValue;
};

export type ExpenseRecord = {
  index: number;
  category: string;
  note: string;
  date: number;
  amount: MoneyValue;
};

export type BudgetItem = {
  category: string;
  period: number;
  startDate: number;
  active: boolean;
  amount: MoneyValue;
  spent: MoneyValue;
  remaining: MoneyValue;
  isOverBudget: boolean;
};

export type GoalItem = {
  index: number;
  name: string;
  goalType: "savings" | "expense";
  target: MoneyValue;
  current: MoneyValue;
  deadline: number;
  note: string;
  active: boolean;
  completed: boolean;
};

export type MonthlyStat = {
  month: string;
  income: MoneyValue;
  expense: MoneyValue;
  net: MoneyValue;
};

export type CategoryStat = {
  category: string;
  income: MoneyValue;
  expense: MoneyValue;
  net: MoneyValue;
};

export type ShadowFinanceAnalytics = {
  monthly: MonthlyStat[];
  expenseByCategory: CategoryStat[];
  incomeBySource: CategoryStat[];
  savingsRate: number | undefined;
};

export type ShadowFinanceTotals = {
  income: MoneyValue;
  expense: MoneyValue;
  net: MoneyValue;
};

export type ShadowFinanceServiceState = {
  ready: boolean;
  loading: boolean;
  refreshing: boolean;
  error?: string;
  contract?: {
    address?: `0x${string}`;
    chainId?: number;
    chainName?: string;
  };
  totals: ShadowFinanceTotals;
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  budgets: BudgetItem[];
  goals: GoalItem[];
  analytics: ShadowFinanceAnalytics;
};

export type ShadowFinanceServiceActions = {
  refreshAll: () => Promise<void>;
  addIncome: (payload: {
    amount: string;
    source: string;
    date: number;
    note: string;
  }) => Promise<void>;
  addExpense: (payload: {
    amount: string;
    category: string;
    date: number;
    note: string;
  }) => Promise<void>;
  setBudget: (payload: {
    amount: string;
    category: string;
    period: number;
    startDate: number;
  }) => Promise<void>;
  setGoal: (payload: {
    name: string;
    goalType: "savings" | "expense";
    amount: string;
    deadline: number;
    note: string;
  }) => Promise<void>;
};

export type ShadowFinanceService = {
  state: ShadowFinanceServiceState;
  actions: ShadowFinanceServiceActions;
};

const ZERO_HANDLE = ethers.ZeroHash;
const ZERO = BigInt(0);
const ONE = BigInt(1);
const NEGATIVE_ONE = BigInt(-1);
const HUNDRED = BigInt(100);
const TEN_THOUSAND = BigInt(10000);
const TWO_POW_128 = ONE << BigInt(128);
const TWO_POW_127 = ONE << BigInt(127);

const EMPTY_MONEY: MoneyValue = { raw: ZERO, formatted: "0.00" };

function parseMoneyInput(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Amount is required");
  }

  const negative = trimmed.startsWith("-");
  const sanitized = negative ? trimmed.slice(1) : trimmed;

  if (!/^\d+(\.\d{0,2})?$/.test(sanitized)) {
    throw new Error("Amount must be a positive number with up to 2 decimals");
  }

  const [wholePart, fractionalPart = ""] = sanitized.split(".");
  const normalizedFraction = fractionalPart.padEnd(2, "0");
  const cents = BigInt(wholePart) * HUNDRED + BigInt(normalizedFraction);

  if (negative) {
    throw new Error("Negative amounts are not supported");
  }

  return cents;
}

function formatMoney(raw: bigint): string {
  const sign = raw < ZERO ? "-" : "";
  const abs = raw < ZERO ? raw * NEGATIVE_ONE : raw;
  const whole = abs / HUNDRED;
  const cents = abs % HUNDRED;
  return `${sign}${whole.toString()}.${cents.toString().padStart(2, "0")}`;
}

function makeMoney(raw: bigint): MoneyValue {
  return { raw, formatted: formatMoney(raw) };
}

function coerceToBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (typeof value === "boolean") return value ? ONE : ZERO;
  throw new Error(`Unsupported decrypted value type: ${typeof value}`);
}

function normalizeSigned128(value: bigint): bigint {
  const normalized = ((value % TWO_POW_128) + TWO_POW_128) % TWO_POW_128;
  return normalized >= TWO_POW_127 ? normalized - TWO_POW_128 : normalized;
}

function monthKeyFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

const INITIAL_STATE: ShadowFinanceServiceState = {
  ready: false,
  loading: true, // 初始状态设为 true，避免显示未解密的数据
  refreshing: false,
  totals: {
    income: EMPTY_MONEY,
    expense: EMPTY_MONEY,
    net: EMPTY_MONEY,
  },
  incomes: [],
  expenses: [],
  budgets: [],
  goals: [],
  analytics: {
    monthly: [],
    expenseByCategory: [],
    incomeBySource: [],
    savingsRate: undefined,
  },
};

type ServiceDependencies = {
  instance: FhevmInstance | undefined;
  signer: ethers.JsonRpcSigner | undefined;
  readonlyProvider: ethers.ContractRunner | undefined;
  chainId: number | undefined;
  account: string | undefined;
  storage: GenericStringStorage | undefined;
  isConnected: boolean;
  fhevmStatus: "idle" | "loading" | "ready" | "error";
};

type DecryptRequest = {
  handle: NumericHandle;
  type: "euint" | "ebool";
};

type DecryptMap = Record<string, bigint>;

export function useShadowFinanceService(
  deps: ServiceDependencies
): ShadowFinanceService {
  const {
    instance,
    signer,
    readonlyProvider,
    chainId,
    account,
    storage,
    isConnected,
    fhevmStatus,
  } = deps;

  const [state, setState] = useState<ShadowFinanceServiceState>(INITIAL_STATE);
  const [actionPending, setActionPending] = useState(false);
  const signatureRef = useRef<FhevmDecryptionSignature | null>(null);
  const refreshingRef = useRef(false);

  const contractInfo = useMemo(() => {
    if (!chainId) {
      return undefined;
    }
    const info =
      ShadowFinanceAddresses[
        chainId.toString() as keyof typeof ShadowFinanceAddresses
      ];
    if (!info || info.address === ethers.ZeroAddress) {
      return {
        address: undefined,
        chainId,
        chainName: info?.chainName,
      } as ShadowFinanceServiceState["contract"];
    }
    return {
      address: info.address as `0x${string}`,
      chainId: info.chainId ?? chainId,
      chainName: info.chainName,
    };
  }, [chainId]);

  const readContract = useMemo(() => {
    if (!readonlyProvider || !contractInfo?.address) {
      return undefined;
    }
    return new ethers.Contract(
      contractInfo.address,
      ShadowFinanceABI.abi,
      readonlyProvider
    );
  }, [readonlyProvider, contractInfo?.address]);

  const writeContract = useMemo(() => {
    if (!signer || !contractInfo?.address) {
      return undefined;
    }
    return new ethers.Contract(
      contractInfo.address,
      ShadowFinanceABI.abi,
      signer
    );
  }, [signer, contractInfo?.address]);

  const ready = useMemo(() => {
    return (
      isConnected &&
      account !== undefined &&
      instance !== undefined &&
      signer !== undefined &&
      readContract !== undefined &&
      writeContract !== undefined &&
      storage !== undefined &&
      contractInfo?.address !== undefined &&
      fhevmStatus === "ready"
    );
  }, [
    isConnected,
    account,
    instance,
    signer,
    readContract,
    writeContract,
    storage,
    contractInfo?.address,
    fhevmStatus,
  ]);

  const ensureSignature = useCallback(async () => {
    if (!instance || !signer || !storage || !contractInfo?.address) {
      return null;
    }

    // 每次解密都重新生成签名，不使用缓存
    const signature = await FhevmDecryptionSignature.loadOrSign(
      instance,
      [contractInfo.address],
      signer,
      storage
    );

    // 不再缓存签名引用
    // if (signature) {
    //   signatureRef.current = signature;
    // }

    return signature;
  }, [instance, signer, storage, contractInfo?.address]);

  const decryptHandles = useCallback(
    async (requests: DecryptRequest[]): Promise<DecryptMap> => {
      if (!instance || !contractInfo?.address) {
        throw new Error("FHEVM instance or contract address unavailable");
      }

      const filtered = requests.filter((r) => r.handle !== ZERO_HANDLE);
      if (filtered.length === 0) {
        return {};
      }

      const signature = await ensureSignature();
      if (!signature) {
        throw new Error("Unable to obtain FHEVM decryption signature");
      }

      console.log("[decryptHandles] Signature obtained, decrypting", filtered.length, "handles");

      const contractAddress = contractInfo.address as `0x${string}`;
      const pairs = filtered.map((item) => ({
        handle: item.handle,
        contractAddress,
      }));

      try {
        const result = await instance.userDecrypt(
          pairs,
          signature.privateKey,
          signature.publicKey,
          signature.signature,
          signature.contractAddresses,
          signature.userAddress,
          signature.startTimestamp,
          signature.durationDays
        );

        console.log("[decryptHandles] Decryption successful, result keys:", Object.keys(result).length);

        return filtered.reduce<DecryptMap>((acc, item) => {
          const value = (result as Record<string, unknown>)[item.handle];
          acc[item.handle] = coerceToBigInt(value);
          return acc;
        }, {});
      } catch (error) {
        console.error("[decryptHandles] Decryption failed:", error);
        throw error;
      }
    },
    [ensureSignature, instance, contractInfo?.address]
  );

  const refreshAll = useCallback(async () => {
    if (!ready || !readContract) {
      return;
    }

    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    // 在开始刷新时，立即清空数据并设置加载状态，确保页面显示加载提示而不是旧数据
    setState({
      ready,
      refreshing: true,
      loading: true, // 强制设置为加载状态，直到解密完成
      contract: contractInfo,
      error: undefined,
      // 清空所有数据，避免显示旧数据
      totals: {
        income: EMPTY_MONEY,
        expense: EMPTY_MONEY,
        net: EMPTY_MONEY,
      },
      incomes: [],
      expenses: [],
      budgets: [],
      goals: [],
      analytics: {
        monthly: [],
        expenseByCategory: [],
        incomeBySource: [],
        savingsRate: undefined,
      },
    });

    try {
      const [incomeCountBn, expenseCountBn] = await Promise.all([
        readContract.getIncomeCount(),
        readContract.getExpenseCount(),
      ]);

      const incomeCount = Number(incomeCountBn);
      const expenseCount = Number(expenseCountBn);

      const incomeRequests = Array.from({ length: incomeCount }).map(
        async (_, index) => {
          const record = await readContract.getIncomeRecord(index);
          return {
            index,
            source: record.source as string,
            note: record.note as string,
            date: Number(record.date),
            amountHandle: record.amount as NumericHandle,
          };
        }
      );

      const expenseRequests = Array.from({ length: expenseCount }).map(
        async (_, index) => {
          const record = await readContract.getExpenseRecord(index);
          return {
            index,
            category: record.category as string,
            note: record.note as string,
            date: Number(record.date),
            amountHandle: record.amount as NumericHandle,
          };
        }
      );

      const incomesRaw = await Promise.all(incomeRequests);
      const expensesRaw = await Promise.all(expenseRequests);

      const [totalIncomeHandle, totalExpenseHandle, netIncomeHandle] =
        await Promise.all([
          readContract.getTotalIncome(),
          readContract.getTotalExpense(),
          readContract.getNetIncome(),
        ]);

      const [savingRateTuple, budgetCategoryCountBn, goalCountBn] =
        await Promise.all([
          readContract.getSavingRateRaw(),
          readContract.getBudgetCategoryCount(),
          readContract.getGoalCount(),
        ]);

      const [netIncomeHandleSavings, totalIncomeHandleSavings] = savingRateTuple;

      const budgetCategoryCount = Number(budgetCategoryCountBn);
      const goalCount = Number(goalCountBn);

      const budgetCategories = await Promise.all(
        Array.from({ length: budgetCategoryCount }).map(async (_, index) => {
          const category = await readContract.getBudgetCategory(index);
          return category as string;
        })
      );

      const budgetsRaw = await Promise.all(
        budgetCategories.map(async (category) => {
          const budgetStruct = await readContract.getBudget(category);
          const executionHandle = await readContract.getBudgetExecution(
            category
          );
          const remainingHandle = await readContract.getBudgetRemaining(
            category
          );
          const overHandle = await readContract.isOverBudget(category);
          return {
            category,
            period: Number(budgetStruct.period),
            startDate: Number(budgetStruct.startDate),
            active: Boolean(budgetStruct.active),
            amountHandle: budgetStruct.amount as NumericHandle,
            executionHandle: executionHandle as NumericHandle,
            remainingHandle: remainingHandle as NumericHandle,
            overHandle: overHandle as NumericHandle,
          };
        })
      );

      const goalsRaw = await Promise.all(
        Array.from({ length: goalCount }).map(async (_, index) => {
          const goalStruct = await readContract.getGoal(index);
          const progressTuple = await readContract.getGoalProgress(index);
          const completedHandle = await readContract.isGoalCompleted(index);
          return {
            index,
            name: goalStruct.name as string,
            goalType:
              (Number(goalStruct.goalType) === 0 ? "savings" : "expense") as GoalItem["goalType"],
            note: goalStruct.note as string,
            deadline: Number(goalStruct.deadline),
            active: Boolean(goalStruct.active),
            targetHandle: goalStruct.targetAmount as NumericHandle,
            currentHandle: progressTuple[0] as NumericHandle,
            completedHandle: completedHandle as NumericHandle,
          };
        })
      );

      const decryptRequests: DecryptRequest[] = [];

      incomesRaw.forEach((income) => {
        decryptRequests.push({ handle: income.amountHandle, type: "euint" });
      });

      expensesRaw.forEach((expense) => {
        decryptRequests.push({ handle: expense.amountHandle, type: "euint" });
      });

      decryptRequests.push({ handle: totalIncomeHandle, type: "euint" });
      decryptRequests.push({ handle: totalExpenseHandle, type: "euint" });
      decryptRequests.push({ handle: netIncomeHandle, type: "euint" });
      decryptRequests.push({ handle: netIncomeHandleSavings, type: "euint" });
      decryptRequests.push({ handle: totalIncomeHandleSavings, type: "euint" });

      budgetsRaw.forEach((budget) => {
        decryptRequests.push({ handle: budget.amountHandle, type: "euint" });
        decryptRequests.push({ handle: budget.executionHandle, type: "euint" });
        decryptRequests.push({ handle: budget.remainingHandle, type: "euint" });
        decryptRequests.push({ handle: budget.overHandle, type: "ebool" });
      });

      goalsRaw.forEach((goal) => {
        decryptRequests.push({ handle: goal.targetHandle, type: "euint" });
        decryptRequests.push({ handle: goal.currentHandle, type: "euint" });
        decryptRequests.push({ handle: goal.completedHandle, type: "ebool" });
      });

      const decrypted = await decryptHandles(decryptRequests);
      
      console.log("[refreshAll] Decryption completed, decrypted handles:", Object.keys(decrypted).length);

      const incomes: IncomeRecord[] = incomesRaw.map((income) => {
        const raw = income.amountHandle === ZERO_HANDLE ? ZERO : decrypted[income.amountHandle] ?? ZERO;
        return {
          index: income.index,
          source: income.source,
          note: income.note,
          date: income.date,
          amount: makeMoney(raw),
        };
      });

      const expenses: ExpenseRecord[] = expensesRaw.map((expense) => {
        const raw = expense.amountHandle === ZERO_HANDLE ? ZERO : decrypted[expense.amountHandle] ?? ZERO;
        return {
          index: expense.index,
          category: expense.category,
          note: expense.note,
          date: expense.date,
          amount: makeMoney(raw),
        };
      });

      const budgets: BudgetItem[] = budgetsRaw.map((budget) => {
        const amount = budget.amountHandle === ZERO_HANDLE ? ZERO : decrypted[budget.amountHandle] ?? ZERO;
        const spent = budget.executionHandle === ZERO_HANDLE ? ZERO : decrypted[budget.executionHandle] ?? ZERO;
        const remainingRaw = budget.remainingHandle === ZERO_HANDLE ? ZERO : decrypted[budget.remainingHandle] ?? ZERO;
        const remaining = normalizeSigned128(remainingRaw);
        const overValue = budget.overHandle === ZERO_HANDLE ? ZERO : decrypted[budget.overHandle] ?? ZERO;
        return {
          category: budget.category,
          period: budget.period,
          startDate: budget.startDate,
          active: budget.active,
          amount: makeMoney(amount),
          spent: makeMoney(spent),
          remaining: makeMoney(remaining),
          isOverBudget: overValue === ONE,
        };
      });

      const goals: GoalItem[] = goalsRaw.map((goal) => {
        const target = goal.targetHandle === ZERO_HANDLE ? ZERO : decrypted[goal.targetHandle] ?? ZERO;
        const currentRaw = goal.currentHandle === ZERO_HANDLE ? ZERO : decrypted[goal.currentHandle] ?? ZERO;
        const current = normalizeSigned128(currentRaw);
        const completed = goal.completedHandle === ZERO_HANDLE ? ZERO : decrypted[goal.completedHandle] ?? ZERO;
        return {
          index: goal.index,
          name: goal.name,
          goalType: goal.goalType,
          note: goal.note,
          deadline: goal.deadline,
          active: goal.active,
          target: makeMoney(target),
          current: makeMoney(current),
          completed: completed === ONE,
        };
      });

      const totalIncome = totalIncomeHandle === ZERO_HANDLE ? ZERO : decrypted[totalIncomeHandle] ?? ZERO;
      const totalExpense = totalExpenseHandle === ZERO_HANDLE ? ZERO : decrypted[totalExpenseHandle] ?? ZERO;
      const netIncomeRaw = netIncomeHandle === ZERO_HANDLE ? ZERO : decrypted[netIncomeHandle] ?? ZERO;
      const netIncome = normalizeSigned128(netIncomeRaw);

      const netIncomeSavingsRaw =
        netIncomeHandleSavings === ZERO_HANDLE
          ? ZERO
          : decrypted[netIncomeHandleSavings] ?? ZERO;
      const netIncomeSavings = normalizeSigned128(netIncomeSavingsRaw);
      const totalIncomeSavings =
        totalIncomeHandleSavings === ZERO_HANDLE
          ? ZERO
          : decrypted[totalIncomeHandleSavings] ?? ZERO;

      let savingsRate: number | undefined = undefined;
      if (totalIncomeSavings > ZERO) {
        const rate = Number((netIncomeSavings * TEN_THOUSAND) / totalIncomeSavings) / 100;
        savingsRate = Number.isFinite(rate) ? rate : undefined;
      }

      const monthlyMap = new Map<string, { income: bigint; expense: bigint }>();

      incomes.forEach((income) => {
        const key = monthKeyFromTimestamp(income.date);
        const entry = monthlyMap.get(key) ?? { income: ZERO, expense: ZERO };
        entry.income += income.amount.raw;
        monthlyMap.set(key, entry);
      });

      expenses.forEach((expense) => {
        const key = monthKeyFromTimestamp(expense.date);
        const entry = monthlyMap.get(key) ?? { income: ZERO, expense: ZERO };
        entry.expense += expense.amount.raw;
        monthlyMap.set(key, entry);
      });

      const monthly: MonthlyStat[] = Array.from(monthlyMap.entries())
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([month, value]) => ({
          month,
          income: makeMoney(value.income),
          expense: makeMoney(value.expense),
          net: makeMoney(value.income - value.expense),
        }));

      const expenseCategoryMap = new Map<string, bigint>();
      expenses.forEach((expense) => {
        const key = expense.category || "Uncategorized";
        expenseCategoryMap.set(
          key,
          (expenseCategoryMap.get(key) ?? ZERO) + expense.amount.raw
        );
      });

      const incomeSourceMap = new Map<string, bigint>();
      incomes.forEach((income) => {
        const key = income.source || "Other";
        incomeSourceMap.set(
          key,
          (incomeSourceMap.get(key) ?? ZERO) + income.amount.raw
        );
      });

      const expenseByCategory: CategoryStat[] = Array.from(
        expenseCategoryMap.entries()
      )
        .sort((a, b) => (b[1] > a[1] ? 1 : -1))
        .map(([category, value]) => ({
          category,
          income: makeMoney(ZERO),
          expense: makeMoney(value),
          net: makeMoney(ZERO - value),
        }));

      const incomeBySource: CategoryStat[] = Array.from(
        incomeSourceMap.entries()
      )
        .sort((a, b) => (b[1] > a[1] ? 1 : -1))
        .map(([category, value]) => ({
          category,
          income: makeMoney(value),
          expense: makeMoney(ZERO),
          net: makeMoney(value),
        }));

      console.log("[refreshAll] Setting state with loading: false, incomes:", incomes.length, "expenses:", expenses.length);
      
      setState({
        ready,
        loading: false,
        refreshing: false,
        error: undefined,
        contract: contractInfo,
        totals: {
          income: makeMoney(totalIncome),
          expense: makeMoney(totalExpense),
          net: makeMoney(netIncome),
        },
        incomes,
        expenses,
        budgets,
        goals,
        analytics: {
          monthly,
          expenseByCategory,
          incomeBySource,
          savingsRate,
        },
      });
      
      console.log("[refreshAll] State updated, loading should be false now");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[refreshAll] Error occurred:", message, error);
      setState((previous) => ({
        ...previous,
        ready,
        refreshing: false,
        loading: false,
        error: message,
        contract: contractInfo,
      }));
    } finally {
      refreshingRef.current = false;
      console.log("[refreshAll] Finally block executed, refreshingRef.current set to false");
    }
  }, [
    ready,
    readContract,
    decryptHandles,
    contractInfo,
  ]);

  useEffect(() => {
    if (ready) {
      // 在开始刷新前，先设置 loading 状态，避免显示旧数据
      setState((previous) => ({
        ...previous,
        ready,
        loading: true, // 确保在刷新开始时显示加载状态
        contract: contractInfo,
      }));
      // 使用 setTimeout 确保状态更新后再调用 refreshAll
      setTimeout(() => {
        refreshAll();
      }, 0);
    } else {
      setState((previous) => ({
        ...previous,
        ready,
        loading: true, // 未就绪时也显示加载状态
        contract: contractInfo,
      }));
    }
  }, [ready, refreshAll, contractInfo]);

  const runWithEncryption = useCallback(
    async (
      amount: bigint,
      fn: (handles: { handle: string; proof: string }) => Promise<void>
    ) => {
      if (!instance || !signer || !contractInfo?.address) {
        throw new Error("FHEVM instance or signer unavailable");
      }

      const signerAddress = await signer.getAddress();
      const input = instance.createEncryptedInput(
        contractInfo.address,
        signerAddress
      );
      input.add128(amount);
      const encrypted = await input.encrypt();
      const handleHex = ethers.hexlify(encrypted.handles[0]);
      const proofHex =
        typeof encrypted.inputProof === "string"
          ? encrypted.inputProof
          : ethers.hexlify(encrypted.inputProof);
      await fn({ handle: handleHex, proof: proofHex });
    },
    [instance, signer, contractInfo?.address]
  );

  const addIncome = useCallback<ShadowFinanceServiceActions["addIncome"]>(
    async ({ amount, source, date, note }) => {
      if (!writeContract) {
        throw new Error("Contract not ready");
      }
      const cents = parseMoneyInput(amount);

      setActionPending(true);
      try {
        await runWithEncryption(cents, async ({ handle, proof }) => {
          const tx = await writeContract.addIncome(
            handle,
            proof,
            source,
            date,
            note
          );
          await tx.wait();
        });
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          error: message,
        }));
        throw error;
      } finally {
        setActionPending(false);
      }
    },
    [writeContract, runWithEncryption, refreshAll]
  );

  const addExpense = useCallback<ShadowFinanceServiceActions["addExpense"]>(
    async ({ amount, category, date, note }) => {
      if (!writeContract) {
        throw new Error("Contract not ready");
      }
      const cents = parseMoneyInput(amount);

      setActionPending(true);
      try {
        await runWithEncryption(cents, async ({ handle, proof }) => {
          const tx = await writeContract.addExpense(
            handle,
            proof,
            category,
            date,
            note
          );
          await tx.wait();
        });
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          error: message,
        }));
        throw error;
      } finally {
        setActionPending(false);
      }
    },
    [writeContract, runWithEncryption, refreshAll]
  );

  const setBudget = useCallback<ShadowFinanceServiceActions["setBudget"]>(
    async ({ amount, category, period, startDate }) => {
      if (!writeContract) {
        throw new Error("Contract not ready");
      }
      const cents = parseMoneyInput(amount);

      setActionPending(true);
      try {
        await runWithEncryption(cents, async ({ handle, proof }) => {
          const tx = await writeContract.setBudget(
            handle,
            proof,
            category,
            period,
            startDate
          );
          await tx.wait();
        });
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          error: message,
        }));
        throw error;
      } finally {
        setActionPending(false);
      }
    },
    [writeContract, runWithEncryption, refreshAll]
  );

  const setGoal = useCallback<ShadowFinanceServiceActions["setGoal"]>(
    async ({ name, goalType, amount, deadline, note }) => {
      if (!writeContract) {
        throw new Error("Contract not ready");
      }
      const cents = parseMoneyInput(amount);
      const goalTypeValue = goalType === "savings" ? 0 : 1;

      setActionPending(true);
      try {
        await runWithEncryption(cents, async ({ handle, proof }) => {
          const tx = await writeContract.setGoal(
            name,
            goalTypeValue,
            handle,
            proof,
            deadline,
            note
          );
          await tx.wait();
        });
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          error: message,
        }));
        throw error;
      } finally {
        setActionPending(false);
      }
    },
    [writeContract, runWithEncryption, refreshAll]
  );

  useEffect(() => {
    if (!ready) {
      signatureRef.current = null;
    }
  }, [ready, chainId, account]);

  const derivedState: ShadowFinanceServiceState = useMemo(() => {
    const baseError =
      !ready && contractInfo?.address === undefined
        ? "ShadowFinance contract not deployed on this network"
        : state.error;

    // 只有在 state.loading 为 true 或正在刷新时才显示加载状态
    // 如果数据为空但 loading 为 false，说明已经加载完成，只是没有数据而已
    const loading = state.loading;

    const refreshing = state.refreshing || actionPending;

    return {
      ...state,
      ready,
      loading, // 直接使用 state.loading，不再添加额外的逻辑
      refreshing,
      error: baseError,
      contract: contractInfo,
    };
  }, [
    state,
    ready,
    actionPending,
    contractInfo,
  ]);

  return {
    state: derivedState,
    actions: {
      refreshAll,
      addIncome,
      addExpense,
      setBudget,
      setGoal,
    },
  };
}


