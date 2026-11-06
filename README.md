# DesFlyer Internal Expense

A React + TypeScript expense tracker with a Python API and temporary JSON-file storage.

## Run locally

```bash
npm install
npm run dev
```

This starts the web app at the Vite URL and the Python API at `http://localhost:3001`. The Vite development server proxies `/api` requests to the API. Python 3.10 or newer must be available as `python` on your PATH.

Create a production frontend build with `npm run build`. To run only the API, use `npm run dev:api`. The API uses only Python's standard library, so no Python package installation is needed.

## API

- `GET /api/health` — service status
- `GET /api/expenses` — list expenses
- `GET /api/expenses/:id` — get an expense
- `POST /api/expenses` — create an expense
- `PATCH /api/expenses/:id` — update an expense
- `DELETE /api/expenses/:id` — delete an expense

Expense records and uploaded receipt data are stored in `data/expenses.json`. Login users and salted password hashes are stored in `data/users.json`. The API requires a login session for expense routes. These are temporary, single-server files intended for local development.

## Demo login

- Email: `admin@desflyer.com`
- Password: `DesFlyer@2026!`

The demo password is stored as a PBKDF2 hash in `data/users.json`.

## Screens

Dashboard, add/edit expense, expense records, transaction details, analytics and a mock login screen. The login screen does not authenticate users.
