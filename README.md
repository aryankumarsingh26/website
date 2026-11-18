# 🏪 SnackVault - Aryan, Vinay & Divyan Ka Stock Tracker

Ek modern Cloud Store & Inventory Web App jo **Aryan**, **Vinay**, aur **Divyan** ke snack & Maggi selling business ke liye banayi gayi hai.

---

## 🌟 Features

1. **👥 3 Partner Sections (Ownership System)**:
   - **🦁 Aryan Ka Stock**: Aryan jo saman dukaan se laya uska alag section.
   - **💼 Vinay Ka Stock**: Vinay jo saman laya uska alag section.
   - **🚀 Divyan Ka Stock**: Divyan jo saman laya uska alag section.
   - **🌐 Sabhi Ka Stock**: Teeno ka total combined stock ek nazar me.

2. **➕ Ultra-Simple Custom Item Add**:
   - Sirf 3 cheezein: **Item Name**, **Item Price (₹)**, aur **Item Quantity**.

3. **💰 Smart "Becho" Modal with Custom Cash Input**:
   - Stock instant minus hota hai.
   - **Total Cash Received** me user khud se apni marzi ka custom cash amount type kar sakta hai.

4. **⚡ Quick Stock Buttons**:
   - Fast `- 1 pkt` aur `+ 1 pkt` buttons direct stock ghatane/badhane ke liye.
   - `+ Restock` button dukan se naya stock laane par.

5. **☁️ Supabase Cloud Database**:
   - Real-time cloud sync with PostgreSQL. Teeno doston ke phones par live stock sync rehta hai.

6. **📱 Mobile Optimized**:
   - Clean mobile orientation, zero horizontal wobble.

---

## 🚀 Setup & Run

1. **Virtual Environment**:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```env
   PORT=5000
   HOST=0.0.0.0
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```

3. **Run**:
   ```bash
   python main.py
   ```
   Open `http://localhost:5000` in browser.
