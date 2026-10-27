import {
  createContext,
  useContext,
  useEffect,
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

  useEffect(() => {
    let active = true;
    expenseService.getAll()
      .then((records) => { if (active) setExpenses(records); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load expenses.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const store = useMemo<ExpenseStore>(
    () => ({
      expenses,
      loading,
      error,
      addExpense: async (input) => {
        const expense = await expenseService.add(input);
        setExpenses((current) => [expense, ...current]);
        return expense;
      },
      updateExpense: async (id, updates) => {
        const updated = await expenseService.update(id, updates);
        setExpenses((current) => current.map((expense) => expense.id === id ? updated : expense));
      },
      deleteExpense: async (id) => {
        await expenseService.remove(id);
        setExpenses((current) => current.filter((expense) => expense.id !== id));
      },
      replaceExpenses: async (records) => {
        const saved = await expenseService.replaceAll(records);
        setExpenses(saved);
      },
    }),
    [expenses, loading, error],
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
