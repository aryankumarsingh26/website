import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

# Try initializing Supabase client
supabase_client = None
IS_SUPABASE_ENABLED = False

if SUPABASE_URL and SUPABASE_KEY and not SUPABASE_URL.startswith("https://your-project"):
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        # Test basic connection with a lightweight probe
        supabase_client.table("users").select("id").limit(1).execute()
        IS_SUPABASE_ENABLED = True
        print(f" [DB] Successfully connected to Cloud Supabase: {SUPABASE_URL}")
    except Exception as e:
        print(f" [DB WARNING] Failed to connect to Supabase: {e}")
        print(" [DB] Falling back to local SQLite database.")
        supabase_client = None
        IS_SUPABASE_ENABLED = False
else:
    print(" [DB] Supabase credentials not set in .env. Using local SQLite.")

import db as sqlite_db

def get_db_status():
    masked_url = "Cloud PostgreSQL"
    if IS_SUPABASE_ENABLED and SUPABASE_URL:
        try:
            parts = SUPABASE_URL.split("://")
            host = parts[1] if len(parts) > 1 else parts[0]
            masked_url = f"{parts[0]}://{host[:4]}***{host[host.find('.'):]}"
        except Exception:
            masked_url = "Cloud Supabase (Protected)"

    return {
        "is_supabase": IS_SUPABASE_ENABLED,
        "mode": "supabase" if IS_SUPABASE_ENABLED else "sqlite",
        "url": masked_url,
        "message": "Connected securely to Cloud Supabase" if IS_SUPABASE_ENABLED else "Running on Local SQLite."
    }

# ------------------------------------------------------------------------------
# Helpers: Metadata Packing / Unpacking (Owner, Buy & Sell Price, Total Sold)
# ------------------------------------------------------------------------------
def unpack_item(item):
    if not item:
        return item
    d = dict(item)
    raw_notes = d.get("notes") or ""
    owner_name = "Aryan"
    owner_id = 1
    buy_price = 0.0
    sell_price = 0.0
    total_sold = 0
    display_notes = raw_notes

    if raw_notes.startswith("{") and raw_notes.endswith("}"):
        try:
            meta = json.loads(raw_notes)
            owner_name = meta.get("owner", "Aryan")
            owner_id = meta.get("owner_id", 1)
            buy_price = float(meta.get("buy_price", 0.0))
            sell_price = float(meta.get("sell_price", 0.0))
            total_sold = int(meta.get("sold", 0))
            display_notes = meta.get("text", "")
        except Exception:
            pass

    d["owner_name"] = owner_name
    d["owner_id"] = owner_id
    d["buy_price"] = buy_price
    d["sell_price"] = sell_price
    d["total_sold"] = total_sold
    d["display_notes"] = display_notes
    return d

def pack_notes(owner_name="Aryan", owner_id=1, buy_price=0.0, sell_price=0.0, total_sold=0, text=""):
    return json.dumps({
        "owner": owner_name or "Aryan",
        "owner_id": int(owner_id or 1),
        "buy_price": float(buy_price or 0.0),
        "sell_price": float(sell_price or 0.0),
        "sold": int(total_sold or 0),
        "text": (text or "").strip()
    })

# ------------------------------------------------------------------------------
# Users (The 3 Partners: Aryan, Vinay, Divyan)
# ------------------------------------------------------------------------------
def get_users():
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("users").select("id, name, avatar, color, pin").order("id").execute()
            return res.data or []
        except Exception as e:
            print(f"Supabase get_users error: {e}")
    conn = sqlite_db.get_connection()
    rows = conn.execute("SELECT id, name, avatar, color, pin FROM users ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_user(user_id, name, avatar, color):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("users").update({
                "name": name,
                "avatar": avatar or "👤",
                "color": color or "#f59e0b"
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Supabase update_user error: {e}")
            return False
    conn = sqlite_db.get_connection()
    conn.execute(
        "UPDATE users SET name = ?, avatar = ?, color = ? WHERE id = ?",
        (name, avatar or "👤", color or "#f59e0b", user_id)
    )
    conn.commit()
    conn.close()
    return True

# ------------------------------------------------------------------------------
# Categories
# ------------------------------------------------------------------------------
def get_categories():
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("categories").select("*").order("id").execute()
            return res.data or []
        except Exception as e:
            print(f"Supabase get_categories error: {e}")
    conn = sqlite_db.get_connection()
    rows = conn.execute("SELECT * FROM categories ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ------------------------------------------------------------------------------
# Items Inventory with Partner Stock Filtering
# ------------------------------------------------------------------------------
def get_items(category=None, search=None, owner=None, is_maggi=None):
    raw_items = []
    if IS_SUPABASE_ENABLED:
        try:
            query = supabase_client.table("items").select("*")
            if category and category != "all":
                query = query.eq("category", category)
            if is_maggi is not None and is_maggi != "":
                query = query.eq("is_maggi", int(is_maggi))
            if search:
                query = query.ilike("name", f"%{search}%")
            
            res = query.order("id", desc=True).execute()
            raw_items = res.data or []
        except Exception as e:
            print(f"Supabase get_items error: {e}")
    else:
        q = "SELECT * FROM items WHERE 1=1"
        params = []
        if category and category != "all":
            q += " AND category = ?"
            params.append(category)
        if search:
            q += " AND (name LIKE ? OR notes LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        if is_maggi is not None and is_maggi != "":
            q += " AND is_maggi = ?"
            params.append(int(is_maggi))
        q += " ORDER BY id DESC"

        conn = sqlite_db.get_connection()
        rows = conn.execute(q, params).fetchall()
        conn.close()
        raw_items = [dict(r) for r in rows]

    # Unpack metadata and filter by owner if requested
    unpacked = [unpack_item(item) for item in raw_items]

    if owner and owner != "all":
        unpacked = [i for i in unpacked if i.get("owner_name", "").lower() == owner.lower()]

    return unpacked

def add_item(data):
    name = data.get("name", "").strip()
    category = data.get("category", "Maggi & Noodles").strip()
    quantity = int(data.get("quantity", 0))
    unit = data.get("unit", "packet").strip()
    low_stock_threshold = int(data.get("low_stock_threshold", 2))
    is_maggi = 1 if "maggi" in category.lower() or "noodles" in category.lower() or data.get("is_maggi") else 0
    
    owner_name = data.get("owner_name", "Aryan").strip()
    owner_id = int(data.get("owner_id", 1))
    buy_price = float(data.get("buy_price", 0.0))
    sell_price = float(data.get("sell_price", 0.0))
    user_notes = data.get("notes", "").strip()

    packed = pack_notes(
        owner_name=owner_name,
        owner_id=owner_id,
        buy_price=buy_price,
        sell_price=sell_price,
        total_sold=0,
        text=user_notes
    )

    user_name = data.get("user_name", owner_name).strip()
    user_id = data.get("user_id", owner_id)

    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("items").insert({
                "name": name,
                "category": category,
                "quantity": max(0, quantity),
                "unit": unit,
                "low_stock_threshold": low_stock_threshold,
                "is_maggi": is_maggi,
                "notes": packed
            }).execute()
            item_id = res.data[0]["id"] if res.data else None

            # Log activity
            supabase_client.table("activity_log").insert({
                "user_id": user_id,
                "user_name": user_name,
                "action_type": "add",
                "item_name": name,
                "quantity_change": quantity,
                "cost": buy_price * quantity if buy_price > 0 else 0.0,
                "notes": f"{owner_name} added {quantity} {unit} of '{name}' (Dukaan Buy: ₹{buy_price}, Sell: ₹{sell_price})"
            }).execute()
            return item_id
        except Exception as e:
            print(f"Supabase add_item error: {e}")

    # SQLite fallback
    conn = sqlite_db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO items (name, category, quantity, unit, low_stock_threshold, is_maggi, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (name, category, max(0, quantity), unit, low_stock_threshold, is_maggi, packed))
    item_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO activity_log (user_id, user_name, action_type, item_name, quantity_change, cost, notes)
        VALUES (?, ?, 'add', ?, ?, ?, ?)
    """, (user_id, user_name, name, quantity, buy_price * quantity if buy_price > 0 else 0.0, f"{owner_name} added {quantity} {unit} of '{name}'"))

    conn.commit()
    conn.close()
    return item_id

def update_item(item_id, data):
    name = data.get("name", "").strip()
    category = data.get("category", "").strip()
    quantity = int(data.get("quantity", 0))
    unit = data.get("unit", "packet").strip()
    low_stock_threshold = int(data.get("low_stock_threshold", 2))
    is_maggi = 1 if "maggi" in category.lower() or "noodles" in category.lower() or data.get("is_maggi") else 0
    
    owner_name = data.get("owner_name", "Aryan").strip()
    owner_id = int(data.get("owner_id", 1))
    buy_price = float(data.get("buy_price", 0.0))
    sell_price = float(data.get("sell_price", 0.0))
    total_sold = int(data.get("total_sold", 0))
    user_notes = data.get("notes", "").strip()

    packed = pack_notes(
        owner_name=owner_name,
        owner_id=owner_id,
        buy_price=buy_price,
        sell_price=sell_price,
        total_sold=total_sold,
        text=user_notes
    )

    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("items").update({
                "name": name,
                "category": category,
                "quantity": max(0, quantity),
                "unit": unit,
                "low_stock_threshold": low_stock_threshold,
                "is_maggi": is_maggi,
                "notes": packed,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", item_id).execute()
            return True
        except Exception as e:
            print(f"Supabase update_item error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("""
        UPDATE items
        SET name = ?, category = ?, quantity = ?, unit = ?, low_stock_threshold = ?, is_maggi = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (name, category, max(0, quantity), unit, low_stock_threshold, is_maggi, packed, item_id))
    conn.commit()
    conn.close()
    return True

def delete_item(item_id):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("items").delete().eq("id", item_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_item error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True

# ------------------------------------------------------------------------------
# SELL Action (Selling Maggi, Kurkure, Biscuits etc.)
# ------------------------------------------------------------------------------
def sell_item(item_id, amount, custom_sell_price, seller_id, seller_name, customer_notes="", total_cash_received=None):
    amount = max(1, int(amount))
    
    # 1. Fetch current item
    item = None
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("items").select("*").eq("id", item_id).execute()
            if res.data:
                item = res.data[0]
        except Exception as e:
            print(f"Supabase fetch error: {e}")
    else:
        conn = sqlite_db.get_connection()
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        conn.close()
        if row:
            item = dict(row)

    if not item:
        return False, "Item not found in stock", 0, 0, 0.0

    unpacked = unpack_item(item)
    current_qty = unpacked["quantity"]
    if current_qty < amount:
        return False, f"Not enough stock! Sirf {current_qty} {unpacked['unit']} bache hain.", 0, 0, 0.0

    new_qty = current_qty - amount
    
    # Custom typed cash or auto calculated
    if total_cash_received is not None and str(total_cash_received).strip() != "":
        total_revenue = float(total_cash_received)
    else:
        effective_sell_price = float(custom_sell_price) if custom_sell_price and float(custom_sell_price) > 0 else unpacked["sell_price"]
        total_revenue = amount * effective_sell_price
        
    new_sold = unpacked["total_sold"] + amount

    packed = pack_notes(
        owner_name=unpacked["owner_name"],
        owner_id=unpacked["owner_id"],
        buy_price=unpacked["buy_price"],
        sell_price=unpacked["sell_price"],
        total_sold=new_sold,
        text=unpacked["display_notes"]
    )

    log_note = f"{seller_name} sold {amount} {unpacked['unit']} of {unpacked['name']} (Cash Received: ₹{total_revenue:.2f})"
    if customer_notes:
        log_note += f" - {customer_notes}"

    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("items").update({
                "quantity": new_qty,
                "notes": packed,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", item_id).execute()

            # Record sale in activity log
            supabase_client.table("activity_log").insert({
                "user_id": seller_id,
                "user_name": seller_name,
                "action_type": "sell",
                "item_name": unpacked["name"],
                "quantity_change": -amount,
                "cost": total_revenue,
                "notes": log_note
            }).execute()

            # Low stock alert into shopping list
            if new_qty <= unpacked["low_stock_threshold"]:
                chk = supabase_client.table("shopping_list").select("id").eq("item_name", unpacked["name"]).eq("status", "pending").execute()
                if not chk.data:
                    supabase_client.table("shopping_list").insert({
                        "item_name": unpacked["name"],
                        "category": unpacked["category"],
                        "quantity": max(6, unpacked["low_stock_threshold"] * 3),
                        "unit": unpacked["unit"],
                        "added_by": f"Restock Alert ({unpacked['owner_name']})"
                    }).execute()

            return True, None, new_qty, amount, total_revenue
        except Exception as e:
            print(f"Supabase sell_item error: {e}")
            return False, str(e), 0, 0, 0.0

    # SQLite fallback
    conn = sqlite_db.get_connection()
    conn.execute("UPDATE items SET quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_qty, packed, item_id))
    conn.execute("""
        INSERT INTO activity_log (user_id, user_name, action_type, item_name, quantity_change, cost, notes)
        VALUES (?, ?, 'sell', ?, ?, ?, ?)
    """, (seller_id, seller_name, unpacked["name"], -amount, total_revenue, log_note))

    if new_qty <= unpacked["low_stock_threshold"]:
        chk = conn.execute("SELECT id FROM shopping_list WHERE item_name = ? AND status = 'pending'", (unpacked["name"],)).fetchone()
        if not chk:
            conn.execute("""
                INSERT INTO shopping_list (item_name, category, quantity, unit, added_by)
                VALUES (?, ?, ?, ?, ?)
            """, (unpacked["name"], unpacked["category"], max(6, unpacked["low_stock_threshold"] * 3), unpacked["unit"], f"Restock Alert ({unpacked['owner_name']})"))

    conn.commit()
    conn.close()
    return True, None, new_qty, amount, total_revenue

# ------------------------------------------------------------------------------
# RESTOCK Action (Bringing fresh stock from shop)
# ------------------------------------------------------------------------------
def restock_item(item_id, amount, buy_cost, user_id, user_name, notes=""):
    amount = max(1, int(amount))
    buy_cost = float(buy_cost or 0.0)

    item = None
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("items").select("*").eq("id", item_id).execute()
            if res.data:
                item = res.data[0]
        except Exception as e:
            print(f"Supabase fetch error: {e}")
    else:
        conn = sqlite_db.get_connection()
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        conn.close()
        if row:
            item = dict(row)

    if not item:
        return False, "Item not found in stock", 0

    unpacked = unpack_item(item)
    new_qty = unpacked["quantity"] + amount

    packed = pack_notes(
        owner_name=unpacked["owner_name"],
        owner_id=unpacked["owner_id"],
        buy_price=unpacked["buy_price"],
        sell_price=unpacked["sell_price"],
        total_sold=unpacked["total_sold"],
        text=unpacked["display_notes"]
    )

    log_note = f"{user_name} restocked {amount} {unpacked['unit']} of {unpacked['name']}"
    if buy_cost > 0:
        log_note += f" (Total Cost: ₹{buy_cost:.2f})"

    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("items").update({
                "quantity": new_qty,
                "notes": packed,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", item_id).execute()

            supabase_client.table("activity_log").insert({
                "user_id": user_id,
                "user_name": user_name,
                "action_type": "restock",
                "item_name": unpacked["name"],
                "quantity_change": amount,
                "cost": buy_cost,
                "notes": log_note
            }).execute()

            # If cost provided, record in expenses
            if buy_cost > 0 and user_id:
                supabase_client.table("expenses").insert({
                    "payer_id": user_id,
                    "payer_name": user_name,
                    "title": f"Dukaan se laya: {amount} {unpacked['unit']} {unpacked['name']}",
                    "amount": buy_cost,
                    "notes": notes
                }).execute()

            supabase_client.table("shopping_list").update({"status": "bought"}).eq("item_name", unpacked["name"]).eq("status", "pending").execute()
            return True, None, new_qty
        except Exception as e:
            print(f"Supabase restock error: {e}")
            return False, str(e), 0

    conn = sqlite_db.get_connection()
    conn.execute("UPDATE items SET quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_qty, packed, item_id))
    conn.execute("""
        INSERT INTO activity_log (user_id, user_name, action_type, item_name, quantity_change, cost, notes)
        VALUES (?, ?, 'restock', ?, ?, ?, ?)
    """, (user_id, user_name, unpacked["name"], amount, buy_cost, log_note))

    if buy_cost > 0 and user_id:
        conn.execute("""
            INSERT INTO expenses (payer_id, payer_name, title, amount, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, user_name, f"Dukaan se laya: {amount} {unpacked['unit']} {unpacked['name']}", buy_cost, notes))

    conn.execute("UPDATE shopping_list SET status = 'bought' WHERE item_name = ? AND status = 'pending'", (unpacked["name"],))
    conn.commit()
    conn.close()
    return True, None, new_qty

# ------------------------------------------------------------------------------
# Quick Stock Adjustment (+1 or -1 without Bikri / Sales formality)
# ------------------------------------------------------------------------------
def adjust_stock(item_id, delta, user_id=1, user_name="Partner"):
    delta = int(delta)
    if delta == 0:
        return False, "Delta cannot be zero", 0

    item = None
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("items").select("*").eq("id", item_id).execute()
            if res.data:
                item = res.data[0]
        except Exception as e:
            print(f"Supabase fetch error: {e}")
    else:
        conn = sqlite_db.get_connection()
        row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        conn.close()
        if row:
            item = dict(row)

    if not item:
        return False, "Item not found in stock", 0

    unpacked = unpack_item(item)
    current_qty = unpacked["quantity"]
    new_qty = current_qty + delta
    if new_qty < 0:
        return False, f"Stock 0 se kam nahi ho sakta! Abhi {current_qty} bache hain.", current_qty

    packed = pack_notes(
        owner_name=unpacked["owner_name"],
        owner_id=unpacked["owner_id"],
        buy_price=unpacked["buy_price"],
        sell_price=unpacked["sell_price"],
        total_sold=unpacked["total_sold"],
        text=unpacked["display_notes"]
    )

    action_text = f"kam kiya ({delta})" if delta < 0 else f"badhaya (+{delta})"
    log_note = f"{user_name} ne '{unpacked['name']}' ka stock {action_text}. Ab {new_qty} {unpacked['unit']} bache hain."

    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("items").update({
                "quantity": new_qty,
                "notes": packed,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", item_id).execute()

            supabase_client.table("activity_log").insert({
                "user_id": user_id,
                "user_name": user_name,
                "action_type": "adjust",
                "item_name": unpacked["name"],
                "quantity_change": delta,
                "cost": 0.0,
                "notes": log_note
            }).execute()
            return True, None, new_qty
        except Exception as e:
            print(f"Supabase adjust_stock error: {e}")
            return False, str(e), current_qty

    conn = sqlite_db.get_connection()
    conn.execute("UPDATE items SET quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_qty, packed, item_id))
    conn.execute("""
        INSERT INTO activity_log (user_id, user_name, action_type, item_name, quantity_change, cost, notes)
        VALUES (?, ?, 'adjust', ?, ?, 0.0, ?)
    """, (user_id, user_name, unpacked["name"], delta, log_note))
    conn.commit()
    conn.close()
    return True, None, new_qty

# ------------------------------------------------------------------------------
# Dashboard Business Stats
# ------------------------------------------------------------------------------
def get_stats():
    all_items = get_items()

    total_stock = sum(i["quantity"] for i in all_items)
    aryan_stock = sum(i["quantity"] for i in all_items if i.get("owner_name", "").lower() == "aryan")
    vinay_stock = sum(i["quantity"] for i in all_items if i.get("owner_name", "").lower() == "vinay")
    divyan_stock = sum(i["quantity"] for i in all_items if i.get("owner_name", "").lower() == "divyan")

    low_stock_count = len([i for i in all_items if i["quantity"] <= i["low_stock_threshold"]])

    # Sales & Revenue calculations from activity_log
    activity = get_activity(limit=100)
    sales = [a for a in activity if a.get("action_type") == "sell"]
    total_revenue = sum(float(s.get("cost", 0.0)) for s in sales)
    total_items_sold = sum(abs(int(s.get("quantity_change", 0))) for s in sales)

    # Sales by Partner
    partner_sales = {
        "Aryan": {"sold": 0, "revenue": 0.0},
        "Vinay": {"sold": 0, "revenue": 0.0},
        "Divyan": {"sold": 0, "revenue": 0.0}
    }
    for s in sales:
        u = s.get("user_name", "Aryan")
        qty = abs(int(s.get("quantity_change", 0)))
        rev = float(s.get("cost", 0.0))
        if u not in partner_sales:
            partner_sales[u] = {"sold": 0, "revenue": 0.0}
        partner_sales[u]["sold"] += qty
        partner_sales[u]["revenue"] += rev

    return {
        "total_stock": total_stock,
        "aryan_stock": aryan_stock,
        "vinay_stock": vinay_stock,
        "divyan_stock": divyan_stock,
        "low_stock_count": low_stock_count,
        "total_revenue": round(total_revenue, 2),
        "total_items_sold": total_items_sold,
        "partner_sales": partner_sales
    }

def get_activity(limit=40):
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("activity_log").select("*").order("id", desc=True).limit(limit).execute()
            return res.data or []
        except Exception as e:
            print(f"Supabase get_activity error: {e}")

    conn = sqlite_db.get_connection()
    logs = conn.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(l) for l in logs]

# ------------------------------------------------------------------------------
# Expenses & Hisab-Kitab
# ------------------------------------------------------------------------------
def get_expenses_data():
    if IS_SUPABASE_ENABLED:
        try:
            exp_res = supabase_client.table("expenses").select("*").order("id", desc=True).execute()
            expenses = exp_res.data or []
            usr_res = supabase_client.table("users").select("id, name, avatar").order("id").execute()
            users = usr_res.data or []
            return calculate_hisab(expenses, users)
        except Exception as e:
            print(f"Supabase get_expenses error: {e}")

    conn = sqlite_db.get_connection()
    expenses = [dict(e) for e in conn.execute("SELECT * FROM expenses ORDER BY id DESC").fetchall()]
    users = [dict(u) for u in conn.execute("SELECT id, name, avatar FROM users ORDER BY id ASC").fetchall()]
    conn.close()
    return calculate_hisab(expenses, users)

def calculate_hisab(expenses, users):
    num_users = max(1, len(users))
    total_spent = sum(float(e["amount"]) for e in expenses)
    per_person_share = total_spent / num_users if num_users > 0 else 0.0

    user_spend = {u["id"]: 0.0 for u in users}
    for e in expenses:
        pid = e.get("payer_id")
        if pid in user_spend:
            user_spend[pid] += float(e["amount"])

    balances = []
    for u in users:
        spent = user_spend.get(u["id"], 0.0)
        net = spent - per_person_share
        balances.append({
            "id": u["id"],
            "name": u["name"],
            "avatar": u["avatar"],
            "total_spent": round(spent, 2),
            "share": round(per_person_share, 2),
            "net_balance": round(net, 2)
        })

    settlements = []
    debtors = [b.copy() for b in balances if b["net_balance"] < -0.01]
    creditors = [b.copy() for b in balances if b["net_balance"] > 0.01]

    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        amt = min(-debtor["net_balance"], creditor["net_balance"])
        if amt > 0.01:
            settlements.append({
                "from": debtor["name"],
                "to": creditor["name"],
                "amount": round(amt, 2)
            })
            debtor["net_balance"] += amt
            creditor["net_balance"] -= amt

        if abs(debtor["net_balance"]) < 0.01:
            i += 1
        if abs(creditor["net_balance"]) < 0.01:
            j += 1

    return {
        "expenses": expenses,
        "total_spent": round(total_spent, 2),
        "per_person_share": round(per_person_share, 2),
        "balances": balances,
        "settlements": settlements
    }

def add_expense(payer_id, payer_name, title, amount, notes=""):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("expenses").insert({
                "payer_id": payer_id,
                "payer_name": payer_name,
                "title": title,
                "amount": amount,
                "notes": notes
            }).execute()

            supabase_client.table("activity_log").insert({
                "user_id": payer_id,
                "user_name": payer_name,
                "action_type": "expense",
                "item_name": title,
                "quantity_change": 0,
                "cost": amount,
                "notes": f"{payer_name} spent ₹{amount:.2f} for {title}"
            }).execute()
            return True
        except Exception as e:
            print(f"Supabase add_expense error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("""
        INSERT INTO expenses (payer_id, payer_name, title, amount, notes)
        VALUES (?, ?, ?, ?, ?)
    """, (payer_id, payer_name, title, amount, notes))

    conn.execute("""
        INSERT INTO activity_log (user_id, user_name, action_type, item_name, quantity_change, cost, notes)
        VALUES (?, ?, 'expense', ?, 0, ?, ?)
    """, (payer_id, payer_name, title, amount, f"{payer_name} spent ₹{amount:.2f} for {title}"))

    conn.commit()
    conn.close()
    return True

def delete_expense(expense_id):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("expenses").delete().eq("id", expense_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_expense error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()
    return True

# ------------------------------------------------------------------------------
# Shopping List (Restock Wishlist)
# ------------------------------------------------------------------------------
def get_shopping():
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("shopping_list").select("*").order("status", desc=True).order("id", desc=True).execute()
            return res.data or []
        except Exception as e:
            print(f"Supabase get_shopping error: {e}")

    conn = sqlite_db.get_connection()
    items = conn.execute("SELECT * FROM shopping_list ORDER BY status DESC, id DESC").fetchall()
    conn.close()
    return [dict(i) for i in items]

def add_shopping(item_name, category, quantity, unit, added_by):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("shopping_list").insert({
                "item_name": item_name,
                "category": category,
                "quantity": max(1, quantity),
                "unit": unit,
                "added_by": added_by
            }).execute()
            return True
        except Exception as e:
            print(f"Supabase add_shopping error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("""
        INSERT INTO shopping_list (item_name, category, quantity, unit, added_by)
        VALUES (?, ?, ?, ?, ?)
    """, (item_name, category, max(1, quantity), unit, added_by))
    conn.commit()
    conn.close()
    return True

def toggle_shopping(item_id):
    if IS_SUPABASE_ENABLED:
        try:
            res = supabase_client.table("shopping_list").select("status").eq("id", item_id).execute()
            if res.data:
                curr = res.data[0]["status"]
                new_status = "bought" if curr == "pending" else "pending"
                supabase_client.table("shopping_list").update({"status": new_status}).eq("id", item_id).execute()
                return True
        except Exception as e:
            print(f"Supabase toggle_shopping error: {e}")
            return False

    conn = sqlite_db.get_connection()
    item = conn.execute("SELECT status FROM shopping_list WHERE id = ?", (item_id,)).fetchone()
    if item:
        new_status = "bought" if item["status"] == "pending" else "pending"
        conn.execute("UPDATE shopping_list SET status = ? WHERE id = ?", (new_status, item_id))
        conn.commit()
    conn.close()
    return True

def delete_shopping(item_id):
    if IS_SUPABASE_ENABLED:
        try:
            supabase_client.table("shopping_list").delete().eq("id", item_id).execute()
            return True
        except Exception as e:
            print(f"Supabase delete_shopping error: {e}")
            return False

    conn = sqlite_db.get_connection()
    conn.execute("DELETE FROM shopping_list WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return True
