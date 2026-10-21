import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { expenseService } from "./services/expenseService";
import type { Expense, ExpenseInput } from "./types";

type ExpenseStore = {
  expenses: Expense[];
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
};

const ExpenseContext = createContext<ExpenseStore | null>(null);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState(expenseService.getAll());
  const store = useMemo<ExpenseStore>(
    () => ({
      expenses,
      addExpense: (input) => {
        const expense = expenseService.add(input);
        setExpenses(expenseService.getAll());
        return expense;
      },
      updateExpense: (id, updates) => {
        expenseService.update(id, updates);
        setExpenses(expenseService.getAll());
      },
      deleteExpense: (id) => {
        expenseService.remove(id);
        setExpenses(expenseService.getAll());
      },
    }),
    [expenses],
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
