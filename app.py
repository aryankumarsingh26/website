import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv(override=True)

import supabase_service as db_service
from db import init_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
    static_url_path="/static"
)

# Ensure local fallback DB is initialized safely (including on read-only serverless)
try:
    init_db()
except Exception as e:
    print(f"[DB] init_db bypassed on serverless: {e}")

# Security Guard: Block any access to sensitive files (.env, .git, .db, secrets)
@app.before_request
def block_sensitive_paths():
    path = request.path.lower()
    for sensitive in [".env", ".git", ".db", ".key", ".sqlite"]:
        if sensitive in path:
            return jsonify({"error": "Access Denied: Sensitive file protected"}), 403

# Allow CORS for all API calls
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

import urllib.parse

# WSGI Middleware to fix Vercel Serverless routing & PATH_INFO
class VercelPathFixerMiddleware:
    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        # Extract query string to find __path forwarded by Vercel rewrite
        query_string = environ.get("QUERY_STRING", "")
        if "__path=" in query_string:
            params = urllib.parse.parse_qs(query_string)
            raw_path = params.get("__path", [""])[0]
            cleaned_params = {k: v for k, v in params.items() if k != "__path"}
            environ["QUERY_STRING"] = urllib.parse.urlencode(cleaned_params, doseq=True)
            if raw_path.startswith("/"):
                environ["PATH_INFO"] = raw_path
            else:
                environ["PATH_INFO"] = "/" + raw_path if raw_path else "/"
        elif environ.get("PATH_INFO") in ["/api/index", "/api/index.py"]:
            environ["PATH_INFO"] = "/"

        return self.wsgi_app(environ, start_response)

app.wsgi_app = VercelPathFixerMiddleware(app.wsgi_app)

# ------------------------------------------------------------------------------
# Frontend Page
# ------------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")

# ------------------------------------------------------------------------------
# Database Status API (Supabase vs SQLite)
# ------------------------------------------------------------------------------
@app.route("/api/db-status", methods=["GET"])
def get_db_status():
    return jsonify(db_service.get_db_status())

# ------------------------------------------------------------------------------
# Users API (The 3 Partners: Aryan, Vinay, Divyan)
# ------------------------------------------------------------------------------
@app.route("/api/users", methods=["GET"])
def get_users():
    return jsonify(db_service.get_users())

@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    data = request.json or {}
    name = data.get("name", "").strip()
    avatar = data.get("avatar", "").strip()
    color = data.get("color", "").strip()

    if not name:
        return jsonify({"error": "Name cannot be empty"}), 400

    success = db_service.update_user(user_id, name, avatar, color)
    return jsonify({"success": success})

# ------------------------------------------------------------------------------
# Categories API
# ------------------------------------------------------------------------------
@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify(db_service.get_categories())

# ------------------------------------------------------------------------------
# Inventory Items API (With Partner Stock Filtering)
# ------------------------------------------------------------------------------
@app.route("/api/items", methods=["GET"])
def get_items():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    owner = request.args.get("owner", "").strip()
    is_maggi = request.args.get("is_maggi")
    return jsonify(db_service.get_items(category=category, search=search, owner=owner, is_maggi=is_maggi))

@app.route("/api/items", methods=["POST"])
def add_item():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Item name is required"}), 400

    item_id = db_service.add_item(data)
    return jsonify({"success": True, "id": item_id})

@app.route("/api/items/<int:item_id>", methods=["PUT"])
def update_item(item_id):
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Item name is required"}), 400

    success = db_service.update_item(item_id, data)
    return jsonify({"success": success})

@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    success = db_service.delete_item(item_id)
    return jsonify({"success": success})

# ------------------------------------------------------------------------------
# SELL Action (Selling Maggi, Kurkure, Biscuits etc. with Profit Tracking)
# ------------------------------------------------------------------------------
@app.route("/api/items/<int:item_id>/sell", methods=["POST"])
def sell_item(item_id):
    data = request.json or {}
    amount = int(data.get("amount", 1))
    sell_price = data.get("sell_price")
    buy_price = data.get("buy_price")
    total_cash_received = data.get("total_cash_received")
    seller_name = data.get("seller_name", "Partner").strip()
    seller_id = data.get("seller_id", 1)
    notes = data.get("notes", "").strip()

    success, error, new_qty, sold_qty, revenue, profit = db_service.sell_item(
        item_id, amount, sell_price, seller_id, seller_name, notes,
        total_cash_received=total_cash_received, custom_buy_price=buy_price
    )
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({
        "success": True,
        "new_quantity": new_qty,
        "sold_quantity": sold_qty,
        "revenue": revenue,
        "profit": profit
    })

# ------------------------------------------------------------------------------
# RESTOCK Action (Brought fresh stock from dukaan)
# ------------------------------------------------------------------------------
@app.route("/api/items/<int:item_id>/restock", methods=["POST"])
def restock_item(item_id):
    data = request.json or {}
    amount = int(data.get("amount", 1))
    cost = float(data.get("cost", 0.0))
    user_name = data.get("user_name", "Partner").strip()
    user_id = data.get("user_id", 1)
    notes = data.get("notes", "").strip()

    if amount <= 0:
        return jsonify({"error": "Restock amount must be greater than zero"}), 400

    success, error, new_qty = db_service.restock_item(
        item_id, amount, cost, user_id, user_name, notes
    )
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"success": True, "new_quantity": new_qty})

# ------------------------------------------------------------------------------
# QUICK ADJUST Stock (+1 or -1 direct button)
# ------------------------------------------------------------------------------
@app.route("/api/items/<int:item_id>/adjust-stock", methods=["POST"])
def adjust_item_stock(item_id):
    data = request.json or {}
    delta = int(data.get("delta", 0))
    user_name = data.get("user_name", "Partner").strip()
    user_id = int(data.get("user_id", 1))

    if delta == 0:
        return jsonify({"error": "Delta cannot be zero"}), 400

    success, error, new_qty = db_service.adjust_stock(
        item_id, delta, user_id, user_name
    )
    if not success:
        return jsonify({"error": error}), 400

    return jsonify({"success": True, "new_quantity": new_qty})

# ------------------------------------------------------------------------------
# Dashboard Statistics & Business Overview
# ------------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify(db_service.get_stats())

# ------------------------------------------------------------------------------
# Activity Feed & Sales Log
# ------------------------------------------------------------------------------
@app.route("/api/activity", methods=["GET"])
def get_activity():
    limit = int(request.args.get("limit", 40))
    return jsonify(db_service.get_activity(limit=limit))

# ------------------------------------------------------------------------------
# Expenses & Hisab-Kitab
# ------------------------------------------------------------------------------
@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    return jsonify(db_service.get_expenses_data())

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.json or {}
    payer_id = int(data.get("payer_id", 1))
    payer_name = data.get("payer_name", "").strip()
    title = data.get("title", "").strip()
    amount = float(data.get("amount", 0.0))
    notes = data.get("notes", "").strip()

    if not title or amount <= 0:
        return jsonify({"error": "Valid title and amount required"}), 400

    success = db_service.add_expense(payer_id, payer_name, title, amount, notes)
    return jsonify({"success": success})

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    success = db_service.delete_expense(expense_id)
    return jsonify({"success": success})

# ------------------------------------------------------------------------------
# Shopping List API (Bazaar / Restock Wishlist)
# ------------------------------------------------------------------------------
@app.route("/api/shopping", methods=["GET"])
def get_shopping():
    return jsonify(db_service.get_shopping())

@app.route("/api/shopping", methods=["POST"])
def add_shopping_item():
    data = request.json or {}
    item_name = data.get("item_name", "").strip()
    category = data.get("category", "General").strip()
    quantity = int(data.get("quantity", 1))
    unit = data.get("unit", "packet").strip()
    added_by = data.get("added_by", "Partner").strip()

    if not item_name:
        return jsonify({"error": "Item name is required"}), 400

    success = db_service.add_shopping(item_name, category, quantity, unit, added_by)
    return jsonify({"success": success})

@app.route("/api/shopping/<int:item_id>/toggle", methods=["POST"])
def toggle_shopping_item(item_id):
    success = db_service.toggle_shopping(item_id)
    return jsonify({"success": success})

@app.route("/api/shopping/<int:item_id>", methods=["DELETE"])
def delete_shopping_item(item_id):
    success = db_service.delete_shopping(item_id)
    return jsonify({"success": success})

# ------------------------------------------------------------------------------
# Network Info (Local IP detection for Mobile Hotspot / Wi-Fi)
# ------------------------------------------------------------------------------
@app.route("/api/network-info", methods=["GET"])
def network_info():
    import socket
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    return jsonify({"local_ip": local_ip, "port": 5000})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
