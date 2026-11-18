import sqlite3
import os
import json
from datetime import datetime

if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/room_stock.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "room_stock.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users table (3 Partners: Aryan, Vinay, Divyan)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL DEFAULT '👤',
            color TEXT NOT NULL DEFAULT '#f59e0b',
            pin TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 2. Categories table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            icon TEXT NOT NULL,
            badge_color TEXT NOT NULL
        )
    """)

    # 3. Items inventory table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            unit TEXT NOT NULL DEFAULT 'packet',
            low_stock_threshold INTEGER NOT NULL DEFAULT 2,
            is_maggi INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. Activity Log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            user_name TEXT NOT NULL,
            action_type TEXT NOT NULL, -- 'sell', 'restock', 'add', 'edit', 'delete'
            item_name TEXT NOT NULL,
            quantity_change INTEGER NOT NULL,
            cost REAL DEFAULT 0.0,
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payer_id INTEGER NOT NULL,
            payer_name TEXT NOT NULL,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            split_count INTEGER NOT NULL DEFAULT 3,
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Shopping list table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shopping_list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            quantity INTEGER DEFAULT 1,
            unit TEXT DEFAULT 'packet',
            added_by TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed the 3 Business Partners: Aryan, Vinay, Divyan
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()["count"] == 0:
        cursor.executemany("""
            INSERT INTO users (name, avatar, color) VALUES (?, ?, ?)
        """, [
            ("Aryan", "🦁", "#ef4444"),
            ("Vinay", "💼", "#3b82f6"),
            ("Divyan", "🚀", "#10b981")
        ])
    else:
        # Update names if existing
        cursor.execute("UPDATE users SET name = 'Aryan', avatar = '🦁' WHERE id = 1")
        cursor.execute("UPDATE users SET name = 'Vinay', avatar = '💼' WHERE id = 2")
        cursor.execute("UPDATE users SET name = 'Divyan', avatar = '🚀' WHERE id = 3")

    # Seed Categories suited for Maggi, Kurkure, Biscuits & Snacks business
    cursor.execute("SELECT COUNT(*) as count FROM categories")
    if cursor.fetchone()["count"] == 0:
        cursor.executemany("""
            INSERT INTO categories (name, icon, badge_color) VALUES (?, ?, ?)
        """, [
            ("Maggi & Noodles", "🍜", "amber"),
            ("Kurkure & Chips", "🍟", "orange"),
            ("Biscuits & Bakery", "🍪", "yellow"),
            ("Cold Drinks & Juices", "🥤", "cyan"),
            ("Chocolates & Candy", "🍫", "purple"),
            ("Extra Snacks", "📦", "emerald")
        ])

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
