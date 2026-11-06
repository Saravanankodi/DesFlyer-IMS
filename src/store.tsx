import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { expenseService } from "./services/expenseService";
import type { Expense, ExpenseInput } from "./types";

type ExpenseStore = {
  expenses: Expense[];
  loading: boolean;
  error: string;
  lastSyncedAt: number | null;
  syncError: string;
  refreshExpenses: () => Promise<void>;
  addExpense: (input: ExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  replaceExpenses: (expenses: Expense[]) => Promise<void>;
};

const ExpenseContext = createContext<ExpenseStore | null>(null);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    let active = true;
    const syncExpenses = async (initial = false) => {
      try {
        const records = await expenseService.getAll();
        if (!active) return;
        setExpenses(records);
        setLastSyncedAt(Date.now());
        setSyncError("");
        if (initial) setError("");
      } catch (reason) {
        if (!active) return;
        const message = reason instanceof Error ? reason.message : "Could not sync expenses.";
        setSyncError(message);
        if (initial) setError(message);
      } finally {
        if (active && initial) setLoading(false);
      }
    };
    void syncExpenses(true);
    const interval = window.setInterval(() => { void syncExpenses(); }, 120_000);
    const syncOnReturn = () => {
      if (document.visibilityState === "visible") void syncExpenses();
    };
    document.addEventListener("visibilitychange", syncOnReturn);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncOnReturn);
    };
  }, []);

  const refreshExpenses = useCallback(async () => {
    try {
      const records = await expenseService.getAll();
      setExpenses(records);
      setLastSyncedAt(Date.now());
      setSyncError("");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not sync expenses.";
      setSyncError(message);
    }
  }, []);

  const markSynced = () => {
    setLastSyncedAt(Date.now());
    setSyncError("");
  };

  const store = useMemo<ExpenseStore>(
    () => ({
      expenses,
      loading,
      error,
      lastSyncedAt,
      syncError,
      refreshExpenses,
      addExpense: async (input) => {
        const expense = await expenseService.add(input);
        setExpenses((current) => [expense, ...current]);
        markSynced();
        return expense;
      },
      updateExpense: async (id, updates) => {
        const updated = await expenseService.update(id, updates);
        setExpenses((current) => current.map((expense) => expense.id === id ? updated : expense));
        markSynced();
      },
      deleteExpense: async (id) => {
        await expenseService.remove(id);
        setExpenses((current) => current.filter((expense) => expense.id !== id));
        markSynced();
      },
      replaceExpenses: async (records) => {
        const saved = await expenseService.replaceAll(records);
        setExpenses(saved);
        markSynced();
      },
    }),
    [expenses, loading, error, lastSyncedAt, syncError, refreshExpenses],
  );

  return (
    <ExpenseContext.Provider value={store}>{children}</ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const store = useContext(ExpenseContext);
  if (!store)
    throw new Error("useExpenses must be used inside ExpenseProvider");
  return store;
}
