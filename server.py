"""Small local API for the DesFlyer expense tracker (JSON file storage)."""

import json
import hashlib
import hmac
import os
import re
import secrets
import threading
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "expenses.json"
TEMP_FILE = ROOT / "data" / "expenses.json.tmp"
USERS_FILE = ROOT / "data" / "users.json"
USERS_TEMP_FILE = ROOT / "data" / "users.json.tmp"
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


def read_users():
    with USERS_FILE.open("r", encoding="utf-8") as file:
        users = json.load(file)
    if not isinstance(users, list):
        raise ValueError("User storage must contain a JSON array.")
    return users


def write_users(users):
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with USERS_TEMP_FILE.open("w", encoding="utf-8") as file:
        json.dump(users, file, ensure_ascii=False, indent=2)
        file.write("\n")
    USERS_TEMP_FILE.replace(USERS_FILE)


def public_user(user):
    return {
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "admin" if user["email"].lower() == "admin@desflyer.com" else "employee"),
    }


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
        if length > 16 * 1024 * 1024:
            raise ValueError("Request body is too large.")
        raw_body = self.rfile.read(length)
        return json.loads(raw_body) if raw_body else None

    def require_authentication(self):
        if self.authenticated_email():
            return True
        self.send_json(401, {"error": "Please log in to access expenses."})
        return False

    def authenticated_email(self):
        authorization = self.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        with sessions_lock:
            return sessions.get(token) if scheme.lower() == "bearer" else None

    def require_admin(self):
        email = self.authenticated_email()
        if not email:
            self.send_json(401, {"error": "Please log in to access this area."})
            return False
        try:
            user = next((item for item in read_users() if item.get("email", "").lower() == email), None)
        except (OSError, json.JSONDecodeError, ValueError):
            self.send_json(500, {"error": "The user service could not complete the request."})
            return False
        if not user or public_user(user)["role"] != "admin":
            self.send_json(403, {"error": "Administrator access is required."})
            return False
        return True

    def do_OPTIONS(self):
        self.send_json(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self.send_json(200, {"status": "ok"})
        if parsed.path == "/api/auth/me":
            email = self.authenticated_email()
            if not email:
                return self.send_json(401, {"error": "Please log in to access your account."})
            try:
                user = next((item for item in read_users() if item.get("email", "").lower() == email), None)
                if not user:
                    return self.send_json(401, {"error": "This account is no longer available."})
                return self.send_json(200, {"user": public_user(user)})
            except (OSError, json.JSONDecodeError, ValueError):
                return self.send_json(500, {"error": "The user service could not complete the request."})
        if parsed.path == "/api/auth/users":
            if not self.require_admin():
                return
            try:
                users = [public_user(user) for user in read_users()]
                return self.send_json(200, users)
            except (OSError, json.JSONDecodeError, ValueError):
                return self.send_json(500, {"error": "The user service could not complete the request."})
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
                users = read_users()
                user = next((item for item in users if item.get("email", "").lower() == email), None)
                if user is None:
                    return self.send_json(401, {"error": "Invalid email or password."})
                if user.get("isActive", True) is False:
                    return self.send_json(403, {"error": "This account is disabled. Contact your administrator."})
                salt = bytes.fromhex(user["salt"])
                provided_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
                if not hmac.compare_digest(provided_hash.hex(), user["passwordHash"]):
                    return self.send_json(401, {"error": "Invalid email or password."})
                token = secrets.token_urlsafe(32)
                with sessions_lock:
                    sessions[token] = email
                return self.send_json(200, {"token": token, "user": public_user(user)})
            except (OSError, json.JSONDecodeError, ValueError) as error:
                print(f"Authentication error: {error}")
                return self.send_json(500, {"error": "The login service could not complete the request."})
        if urlparse(self.path).path == "/api/auth/users":
            if not self.require_admin():
                return
            try:
                body = self.read_body()
                if not isinstance(body, dict):
                    return self.send_json(400, {"error": "Name, work email, and password are required."})
                name = str(body.get("name", "")).strip()
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", ""))
                if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
                    return self.send_json(400, {"error": "Enter a name and valid work email address."})
                if len(password) < 8:
                    return self.send_json(400, {"error": "Password must be at least 8 characters."})
                users = read_users()
                if any(item.get("email", "").lower() == email for item in users):
                    return self.send_json(409, {"error": "An account with that email already exists."})
                salt = secrets.token_bytes(16)
                password_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
                user = {
                    "name": name,
                    "email": email,
                    "role": "employee",
                    "salt": salt.hex(),
                    "passwordHash": password_hash.hex(),
                    "isActive": True,
                }
                users.append(user)
                write_users(users)
                return self.send_json(201, public_user(user))
            except (json.JSONDecodeError, ValueError) as error:
                return self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
            except Exception as error:
                print(f"User administration error: {error}")
                return self.send_json(500, {"error": "The user service could not complete the request."})
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
                creator_email = self.authenticated_email()
                creator = next(
                    (user for user in read_users() if user.get("email", "").lower() == creator_email),
                    None,
                )
                creator_account = public_user(creator) if creator else None
                expense = {
                    **body,
                    "id": next_expense_id(expenses),
                    "amount": float(body["amount"]),
                    "status": "Pending",
                    "receipt": bool(body.get("receipt", False)),
                    "createdByRole": creator_account["role"] if creator_account else "admin",
                    "createdByName": creator_account["name"] or creator_email.split("@", 1)[0] if creator_account else "Admin",
                    "createdByEmail": creator_email,
                    "submittedAt": datetime.now(timezone.utc).isoformat(),
                }
                expense.pop("approvedAt", None)
                expenses.insert(0, expense)
                write_expenses(expenses)
            self.send_json(201, expense)
        except (json.JSONDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
        except Exception as error:
            print(f"API error: {error}")
            self.send_json(500, {"error": "The expense service could not complete the request."})

    def do_PATCH(self):
        if urlparse(self.path).path == "/api/auth/password":
            if not self.require_admin():
                return
            try:
                updates = self.read_body()
                password = str(updates.get("password", "")) if isinstance(updates, dict) else ""
                if len(password) < 8:
                    return self.send_json(400, {"error": "Password must be at least 8 characters."})
                email = self.authenticated_email()
                if not email:
                    return self.send_json(401, {"error": "Please log in to change the administrator password."})
                with storage_lock:
                    users = read_users()
                    index = next((i for i, item in enumerate(users) if item.get("email", "").lower() == email), None)
                    if index is None or public_user(users[index])["role"] != "admin":
                        return self.send_json(403, {"error": "Only the signed-in administrator can change this password."})
                    salt = secrets.token_bytes(16)
                    updated = {
                        **users[index],
                        "salt": salt.hex(),
                        "passwordHash": hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000).hex(),
                    }
                    users[index] = updated
                    write_users(users)
                with sessions_lock:
                    authorization = self.headers.get("Authorization", "")
                    _, _, current_token = authorization.partition(" ")
                    for session_token, session_email in list(sessions.items()):
                        if session_email == email and session_token != current_token:
                            del sessions[session_token]
                return self.send_json(200, public_user(updated))
            except (json.JSONDecodeError, ValueError) as error:
                return self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
            except Exception as error:
                print(f"Administrator password update error: {error}")
                return self.send_json(500, {"error": "The administrator password could not be updated."})

        user_match = re.fullmatch(r"/api/auth/users/(.+)", urlparse(self.path).path)
        if user_match:
            if not self.require_admin():
                return
            try:
                updates = self.read_body()
                if not isinstance(updates, dict):
                    return self.send_json(400, {"error": "Account details are required."})
                old_email = unquote(user_match.group(1)).strip().lower()
                name = str(updates.get("name", "")).strip()
                email = str(updates.get("email", "")).strip().lower()
                password = str(updates.get("password", ""))
                if not name or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
                    return self.send_json(400, {"error": "Enter a name and valid work email address."})
                if password and len(password) < 8:
                    return self.send_json(400, {"error": "Password must be at least 8 characters."})
                with storage_lock:
                    users = read_users()
                    index = next((i for i, item in enumerate(users) if item.get("email", "").lower() == old_email), None)
                    if index is None:
                        return self.send_json(404, {"error": "Employee account not found."})
                    account_role = public_user(users[index])["role"]
                    if account_role == "admin":
                        if old_email != self.authenticated_email():
                            return self.send_json(403, {"error": "You can only change the password for your own administrator account."})
                        if not password:
                            return self.send_json(400, {"error": "Enter a new administrator password."})
                        if name and name != users[index].get("name", ""):
                            return self.send_json(403, {"error": "Administrator account names cannot be changed here."})
                        if email and email != old_email:
                            return self.send_json(403, {"error": "Administrator account emails cannot be changed here."})
                    elif account_role != "employee":
                        return self.send_json(403, {"error": "This account cannot be edited here."})
                    if any(i != index and item.get("email", "").lower() == email for i, item in enumerate(users)):
                        return self.send_json(409, {"error": "An account with that email already exists."})
                    updated = {**users[index], "name": name, "email": email}
                    if password:
                        salt = secrets.token_bytes(16)
                        updated["salt"] = salt.hex()
                        updated["passwordHash"] = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000).hex()
                    users[index] = updated
                    write_users(users)
                if email != old_email or password:
                    with sessions_lock:
                        authorization = self.headers.get("Authorization", "")
                        _, _, current_token = authorization.partition(" ")
                        for session_token, session_email in list(sessions.items()):
                            if session_email == old_email and session_token != current_token:
                                del sessions[session_token]
                return self.send_json(200, public_user(updated))
            except (json.JSONDecodeError, ValueError) as error:
                return self.send_json(400, {"error": str(error) or "Invalid JSON request body."})
            except Exception as error:
                print(f"User administration error: {error}")
                return self.send_json(500, {"error": "The user service could not complete the request."})

        match = re.fullmatch(r"/api/expenses/(.+)", urlparse(self.path).path)
        if not match:
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_authentication():
            return
        try:
            updates = self.read_body()
            if not isinstance(updates, dict):
                return self.send_json(400, {"error": "Request body must be an object."})
            if "submittedAt" in updates or "approvedAt" in updates:
                return self.send_json(400, {"error": "Submission and approval timestamps are managed by the system."})
            if "status" in updates and not self.require_admin():
                return
            identifier = unquote(match.group(1))
            with storage_lock:
                expenses = read_expenses()
                index = next((i for i, item in enumerate(expenses) if item.get("id") == identifier), None)
                if index is None:
                    return self.send_json(404, {"error": "Expense not found."})
                updated = {**expenses[index], **updates, "id": expenses[index]["id"]}
                if (
                    updates.get("status") == "Verified"
                    and expenses[index].get("status") != "Verified"
                    and not expenses[index].get("approvedAt")
                ):
                    updated["approvedAt"] = datetime.now(timezone.utc).isoformat()
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
        user_match = re.fullmatch(r"/api/auth/users/(.+)", urlparse(self.path).path)
        if user_match:
            if not self.require_admin():
                return
            email = unquote(user_match.group(1)).strip().lower()
            with storage_lock:
                users = read_users()
                user = next((item for item in users if item.get("email", "").lower() == email), None)
                if user is None:
                    return self.send_json(404, {"error": "Employee account not found."})
                if public_user(user)["role"] != "employee":
                    return self.send_json(403, {"error": "Administrator accounts cannot be deleted here."})
                write_users([item for item in users if item.get("email", "").lower() != email])
            with sessions_lock:
                for session_token, session_email in list(sessions.items()):
                    if session_email == email:
                        del sessions[session_token]
            return self.send_json(204)

        match = re.fullmatch(r"/api/expenses/(.+)", urlparse(self.path).path)
        if not match:
            return self.send_json(404, {"error": "Route not found."})
        if not self.require_admin():
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
        if not self.require_admin():
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
