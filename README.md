# DesFlyer Internal Expense

A small React + TypeScript frontend for the internal expense system. The data is sample data stored in memory; it resets when the page is refreshed.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Where to make common changes

- Change the sample expenses in `src/data/expenses.ts`.
- Connect the app to a backend later in `src/services/expenseService.ts`.
- Add or edit a screen in `src/pages/` and connect its URL in `src/App.tsx`.
- Shared navigation and page layout are in `src/components/Layout.tsx`.
- Reusable buttons, tables, badges and filters are in `src/components/Shared.tsx`.
- Colors, spacing and responsive styles are in `src/styles.css`.

## Screens

Dashboard, add/edit expense, expense records, transaction details, analytics and a mock login screen. The login screen is for demonstration only; it does not authenticate users.
