import os
import socket
from dotenv import load_dotenv
from app import app
from db import init_db

load_dotenv(override=True)

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    init_db()
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    local_ip = get_local_ip()

    print("\n" + "=" * 65)
    print(" 🍜 MAGGI VAULT & ROOM INVENTORY SYSTEM IS ONLINE! 🍜")
    print("=" * 65)
    print(f" ▶ Local access   : http://localhost:{port}")
    print(f" ▶ Wi-Fi / Mobile : http://{local_ip}:{port}")
    print("=" * 65)
    print(" 💡 Tip: Share the Wi-Fi/Mobile link with your 2 roommates")
    print("    so all 3 of you can track stock live on your phones!")
    print("=" * 65 + "\n")

    app.run(host=host, port=port, debug=True)
