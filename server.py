"""Small local API for the DesFlyer expense tracker (JSON file storage)."""

import json
import hashlib
import hmac
import os
import re
import secrets
import threading
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "expenses.json"
TEMP_FILE = ROOT / "data" / "expenses.json.tmp"
USERS_FILE = ROOT / "data" / "users.json"
PORT = int(os.environ.get("API_PORT", "3001"))
storage_lock = threading.Lock()
sessions = {}
sessions_lock = threading.Lock()
required_fields = ("date", "vendor", "category", "amount", "purpose", "paidFor", "paidForType")


def read_expenses():
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            expenses = json.load(file)
    except FileNotFoundError:
        return []
    if not isinstance(expenses, list):
        raise ValueError("Expense storage must contain a JSON array.")
    return expenses


def write_expenses(expenses):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with TEMP_FILE.open("w", encoding="utf-8") as file:
        json.dump(expenses, file, ensure_ascii=False, indent=2)
        file.write("\n")
    TEMP_FILE.replace(DATA_FILE)


def validate_expense(body):
    if not isinstance(body, dict):
        return "Request body must be an object."
    for field in required_fields:
        if body.get(field) is None or body.get(field) == "":
            return f"{field} is required."
    try:
        amount = float(body["amount"])
    except (TypeError, ValueError):
        return "amount must be a positive number."
    if amount <= 0:
        return "amount must be a positive number."
    return None


def next_expense_id(expenses):
    year = date.today().year
    highest = 0
    for expense in expenses:
        identifier = expense.get("id", "")
        match = re.fullmatch(r"#DF-(\d+)-(\d{4})", identifier)
        if match and int(match.group(2)) == year:
            highest = max(highest, int(match.group(1)))
            continue

        # Include legacy IDs in the count so the sequence stays unique after upgrade.
        legacy_match = re.fullmatch(r"EXP-(\d{4})-(\d+)", identifier)
        if legacy_match and int(legacy_match.group(1)) == year:
            highest = max(highest, int(legacy_match.group(2)))
    return f"#DF-{highest + 1:04d}-{year}"


class ExpenseRequestHandler(BaseHTTPRequestHandler):
    server_version = "DesFlyerExpenseAPI/1.0"

    def log_message(self, format_string, *args):
        print(f"{self.log_date_time_string()} {self.address_string()} {format_string % args}")

    def send_json(self, status, payload=None):
        body = b"" if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 1_000_000:
            raise ValueError("Request body is too large.")
        raw_body = self.rfile.read(length)
        return json.loads(raw_body) if raw_body else None

    def require_authentication(self):
        authorization = self.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        with sessions_lock:
            authenticated = scheme.lower() == "bearer" and token in sessions
        if not authenticated:
            self.send_json(401, {"error": "Please log in to access expenses."})
        return authenticated

    def do_OPTIONS(self):
        self.send_json(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self.send_json(200, {"status": "ok"})
        if parsed.path == "/api/expenses":
            if not self.require_authentication():
                return
            with storage_lock:
                return self.send_json(200, read_expenses())
        match = re.fullmatch(r"/api/expenses/(.+)", parsed.path)
        if match:
            if not self.require_authentication():
                return
            identifier = unquote(match.group(1))
            with storage_lock:
                expense = next((item for item in read_expenses() if item.get("id") == identifier), None)
            if expense is None:
                return self.send_json(404, {"error": "Expense not found."})
            return self.send_json(200, expense)
        self.send_json(404, {"error": "Route not found."})

    def do_POST(self):
        if urlparse(self.path).path == "/api/auth/login":
            try:
                body = self.read_body()
                if not isinstance(body, dict):
                    return self.send_json(400, {"error": "Email and password are required."})
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", ""))
                with USERS_FILE.open("r", encoding="utf-8") as file:
                    users = json.load(file)
                user = next((item for item in users if item.get("email", "").lower() == email), None)
                if user is None:
                    return self.send_json(401, {"error": "Invalid email or password."})
                salt = bytes.fromhex(user["salt"])
                provided_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
                if not hmac.compare_digest(provided_hash.hex(), user["passwordHash"]):
                    return self.send_json(401, {"error": "Invalid email or password."})
                token = secrets.token_urlsafe(32)
                with sessions_lock:
                    sessions[token] = email
                return self.send_json(200, {"token": token, "user": {"email": email}})
            except (OSError, json.JSONDecodeError, ValueError) as error:
                print(f"Authentication error: {error}")
                return self.send_json(500, {"error": "The login service could not complete the request."})
        if urlparse(self.path).path != "/api/expenses":
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_authentication():
            return
        try:
            body = self.read_body()
            error = validate_expense(body)
            if error:
                return self.send_json(400, {"error": error})
            with storage_lock:
                expenses = read_expenses()
                expense = {
                    **body,
                    "id": next_expense_id(expenses),
                    "amount": float(body["amount"]),
                    "status": "Pending",
                    "receipt": bool(body.get("receipt", False)),
                }
                expenses.insert(0, expense)
                write_expenses(expenses)
            self.send_json(201, expense)
        except (json.JSONDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
        except Exception as error:
            print(f"API error: {error}")
            self.send_json(500, {"error": "The expense service could not complete the request."})

    def do_PATCH(self):
        match = re.fullmatch(r"/api/expenses/(.+)", urlparse(self.path).path)
        if not match:
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_authentication():
            return
        try:
            updates = self.read_body()
            if not isinstance(updates, dict):
                return self.send_json(400, {"error": "Request body must be an object."})
            identifier = unquote(match.group(1))
            with storage_lock:
                expenses = read_expenses()
                index = next((i for i, item in enumerate(expenses) if item.get("id") == identifier), None)
                if index is None:
                    return self.send_json(404, {"error": "Expense not found."})
                updated = {**expenses[index], **updates, "id": expenses[index]["id"]}
                error = validate_expense(updated)
                if error:
                    return self.send_json(400, {"error": error})
                updated["amount"] = float(updated["amount"])
                expenses[index] = updated
                write_expenses(expenses)
            self.send_json(200, updated)
        except (json.JSONDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
        except Exception as error:
            print(f"API error: {error}")
            self.send_json(500, {"error": "The expense service could not complete the request."})

    def do_DELETE(self):
        match = re.fullmatch(r"/api/expenses/(.+)", urlparse(self.path).path)
        if not match:
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_authentication():
            return
        identifier = unquote(match.group(1))
        with storage_lock:
            expenses = read_expenses()
            remaining = [item for item in expenses if item.get("id") != identifier]
            if len(remaining) == len(expenses):
                return self.send_json(404, {"error": "Expense not found."})
            write_expenses(remaining)
        self.send_json(204)

    def do_PUT(self):
        if urlparse(self.path).path != "/api/expenses":
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_authentication():
            return
        try:
            expenses = self.read_body()
            if not isinstance(expenses, list):
                return self.send_json(400, {"error": "Request body must be an array."})
            with storage_lock:
                write_expenses(expenses)
            self.send_json(200, expenses)
        except (json.JSONDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
        except Exception as error:
            print(f"API error: {error}")
            self.send_json(500, {"error": "The expense service could not complete the request."})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), ExpenseRequestHandler)
    print(f"Expense API listening on http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping expense API.")
    finally:
        server.server_close()
