import sys
import os

# Add root folder to sys.path so app can import modules like supabase_service, db, etc.
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app

# Vercel serverless function entrypoint
if __name__ == "__main__":
    app.run()
