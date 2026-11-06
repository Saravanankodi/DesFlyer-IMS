import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ExpenseProvider, useExpenses } from "./store";
import { AuthProvider, useAuth } from "./auth";
import { AddExpense } from "./pages/AddExpense";
import { Analytics } from "./pages/Analytics";
import { Dashboard } from "./pages/Dashboard";
import { ExpenseDetail } from "./pages/ExpenseDetail";
import { ExpenseRecords } from "./pages/ExpenseRecords";
import { Login } from "./pages/Login";
import { AdminSettings } from "./pages/AdminSettings";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady) return <main className="page-content"><section className="panel"><p>Loading account…</p></section></main>;
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return <ExpenseProvider><ExpenseRoutes /></ExpenseProvider>;
}

function ExpenseRoutes() {
  const { loading, error } = useExpenses();
  const { isAdmin } = useAuth();
  if (loading) return <main className="page-content"><section className="panel"><p>Loading expenses…</p></section></main>;
  if (error) return <main className="page-content"><section className="panel"><h1>Could not connect to the expense API</h1><p>{error}</p><p>Start the app with <code>npm run dev</code> so the API server is running.</p></section></main>;
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/expenses" element={<ExpenseRecords />} />
        <Route path="/expenses/new" element={<AddExpense />} />
        <Route path="/expenses/:id/edit" element={<AddExpense />} />
        <Route path="/expenses/:id" element={<ExpenseDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={isAdmin ? <AdminSettings /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
