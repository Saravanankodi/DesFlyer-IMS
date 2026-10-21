import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ExpenseProvider } from "./store";
import { AddExpense } from "./pages/AddExpense";
import { Analytics } from "./pages/Analytics";
import { Dashboard } from "./pages/Dashboard";
import { ExpenseDetail } from "./pages/ExpenseDetail";
import { ExpenseRecords } from "./pages/ExpenseRecords";
import { Login } from "./pages/Login";

export default function App() {
  return (
    <ExpenseProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<ExpenseRecords />} />
          <Route path="/expenses/new" element={<AddExpense />} />
          <Route path="/expenses/:id/edit" element={<AddExpense />} />
          <Route path="/expenses/:id" element={<ExpenseDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ExpenseProvider>
  );
}
