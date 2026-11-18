// ==============================================================================
// SnackVault - Aryan, Vinay & Divyan Ka Stock Tracker
// ==============================================================================

const state = {
  users: [],
  activeUser: null,
  items: [],
  categories: [],
  shopping: [],
  stats: {},
  activity: [],
  expensesData: { expenses: [], balances: [], settlements: [], total_spent: 0, per_person_share: 0 },
  activeTab: 'tab-inventory',
  activeOwnerFilter: 'all',
  networkInfo: { local_ip: '127.0.0.1', port: 5000 },
  dbStatus: null
};

// ------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadDbStatus();
  await loadUsers();
  await loadCategories();
  await loadNetworkInfo();
  await refreshAllData();
});

// ------------------------------------------------------------------------------
// API Loaders
// ------------------------------------------------------------------------------
async function loadDbStatus() {
  try {
    const res = await fetch('/api/db-status');
    state.dbStatus = await res.json();
    renderDbStatus();
  } catch (err) {
    console.error('Error loading DB status:', err);
  }
}

function renderDbStatus() {
  const badge = document.getElementById('dbStatusBadge');
  const icon = document.getElementById('dbStatusIcon');
  const text = document.getElementById('dbStatusText');

  if (!badge || !state.dbStatus) return;

  if (state.dbStatus.is_supabase) {
    badge.className = 'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border bg-emerald-500/15 border-emerald-500/40 text-emerald-400 cursor-pointer';
    if (icon) icon.className = 'w-2 h-2 rounded-full bg-emerald-400';
    if (text) text.textContent = '⚡ Supabase Live';
  } else {
    badge.className = 'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-500/40 cursor-pointer';
    if (icon) icon.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    if (text) text.textContent = '💾 SQLite Mode';
  }
}

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    state.users = await res.json();

    const savedUserId = localStorage.getItem('snack_active_user_id');
    const matched = state.users.find(u => u.id == savedUserId);
    state.activeUser = matched || state.users[0] || { id: 1, name: 'Aryan', avatar: '🦁', color: '#ef4444' };

    renderUserSwitcher();
    populateUserSelects();
    updateMyStockLabel();
  } catch (err) {
    console.error('Error loading users:', err);
    state.users = [
      { id: 1, name: 'Aryan', avatar: '🦁', color: '#ef4444' },
      { id: 2, name: 'Vinay', avatar: '💼', color: '#3b82f6' },
      { id: 3, name: 'Divyan', avatar: '🚀', color: '#10b981' }
    ];
    state.activeUser = state.users[0];
    renderUserSwitcher();
    populateUserSelects();
    updateMyStockLabel();
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    state.categories = await res.json();
    populateCategoryDropdowns();
  } catch (err) {
    console.error('Error loading categories:', err);
    state.categories = [
      { id: 1, name: 'Maggi & Noodles', icon: '🍜' },
      { id: 2, name: 'Kurkure & Chips', icon: '🍟' },
      { id: 3, name: 'Biscuits & Bakery', icon: '🍪' },
      { id: 4, name: 'Cold Drinks & Juices', icon: '🥤' },
      { id: 5, name: 'Extra Snacks', icon: '📦' }
    ];
    populateCategoryDropdowns();
  }
}

async function loadNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    state.networkInfo = await res.json();
    const url = `http://${state.networkInfo.local_ip}:${state.networkInfo.port}`;
    const el = document.getElementById('wifiShareUrl');
    if (el) el.textContent = url;
  } catch (err) {
    console.error('Error loading network info:', err);
  }
}

async function refreshAllData() {
  await Promise.all([
    loadStats(),
    loadItems(),
    loadShopping(),
    loadActivity()
  ]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    state.stats = await res.json();
    renderStats();
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

async function loadItems() {
  try {
    const search = document.getElementById('inventorySearch')?.value || '';
    const cat = document.getElementById('categoryFilter')?.value || 'all';

    let url = `/api/items?search=${encodeURIComponent(search)}`;
    if (cat !== 'all') url += `&category=${encodeURIComponent(cat)}`;

    const res = await fetch(url);
    state.items = await res.json();
    renderItemsGrid();
  } catch (err) {
    console.error('Error loading items:', err);
  }
}

async function loadShopping() {
  try {
    const res = await fetch('/api/shopping');
    state.shopping = await res.json();
    renderShoppingList();
  } catch (err) {
    console.error('Error loading shopping:', err);
  }
}

async function loadExpenses() {
  try {
    const res = await fetch('/api/expenses');
    state.expensesData = await res.json();
    renderHisabKitab();
  } catch (err) {
    console.error('Error loading expenses:', err);
  }
}

async function loadActivity() {
  try {
    const res = await fetch('/api/activity?limit=40');
    state.activity = await res.json();
    renderActivity();
  } catch (err) {
    console.error('Error loading activity:', err);
  }
}

// ------------------------------------------------------------------------------
// Partner Switcher & Dropdowns
// ------------------------------------------------------------------------------
function renderUserSwitcher() {
  const avatarEl = document.getElementById('activeUserAvatar');
  const nameEl = document.getElementById('activeUserName');
  const container = document.getElementById('userListContainer');

  if (avatarEl && state.activeUser) avatarEl.textContent = state.activeUser.avatar;
  if (nameEl && state.activeUser) nameEl.textContent = state.activeUser.name;

  if (container) {
    container.innerHTML = state.users.map(u => `
      <button onclick="setActiveUser(${u.id})" class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition ${state.activeUser?.id === u.id ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-zinc-300'}">
        <span class="flex items-center gap-2">
          <span>${u.avatar}</span>
          <span>${escapeHtml(u.name)}</span>
        </span>
        ${state.activeUser?.id === u.id ? '<i class="fa-solid fa-check text-amber-400"></i>' : ''}
      </button>
    `).join('');
  }
}

function setActiveUser(userId) {
  const user = state.users.find(u => u.id === userId);
  if (user) {
    state.activeUser = user;
    localStorage.setItem('snack_active_user_id', user.id);
    renderUserSwitcher();
    populateUserSelects();
    updateMyStockLabel();
    toggleUserDropdown(false);
    showToast(`Switched to ${user.name}! 🏪`, 'info');
    renderItemsGrid();
  }
}

function updateMyStockLabel() {
  const label = document.getElementById('myStockLabel');
  if (label && state.activeUser) {
    label.textContent = state.activeUser.name;
  }
}

function populateUserSelects() {
  const selects = ['sellUserSelect', 'restockUserSelect', 'expensePayerSelect'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = state.users.map(u => `
      <option value="${u.id}" ${state.activeUser?.id === u.id ? 'selected' : ''}>
        ${u.avatar} ${escapeHtml(u.name)}
      </option>
    `).join('');
  });

  const ownerSel = document.getElementById('newItemOwner');
  if (ownerSel) {
    ownerSel.innerHTML = state.users.map(u => `
      <option value="${escapeHtml(u.name)}" ${state.activeUser?.name === u.name ? 'selected' : ''}>
        ${u.avatar} ${escapeHtml(u.name)} Ka Stock
      </option>
    `).join('');
  }
}

function populateCategoryDropdowns() {
  const filterSel = document.getElementById('categoryFilter');
  const addSel = document.getElementById('newItemCategory');

  if (filterSel) {
    filterSel.innerHTML = `
      <option value="all">Sabhi Categories (All)</option>
      ${state.categories.map(c => `<option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
    `;
  }

  if (addSel) {
    addSel.innerHTML = state.categories.map(c => `
      <option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.name)}</option>
    `).join('');
  }
}

function renderStats() {
  const totalStock = document.getElementById('statTotalStock');
  const aryanStock = document.getElementById('statAryanStock');
  const vinayStock = document.getElementById('statVinayStock');
  const divyanStock = document.getElementById('statDivyanStock');

  if (totalStock) totalStock.textContent = state.stats.total_stock ?? 0;
  if (aryanStock) aryanStock.textContent = state.stats.aryan_stock ?? 0;
  if (vinayStock) vinayStock.textContent = state.stats.vinay_stock ?? 0;
  if (divyanStock) divyanStock.textContent = state.stats.divyan_stock ?? 0;

  // Individual Partner Profit Figures
  const totalProfit = document.getElementById('statTotalProfit');
  const aryanProfit = document.getElementById('statAryanProfit');
  const vinayProfit = document.getElementById('statVinayProfit');
  const divyanProfit = document.getElementById('statDivyanProfit');

  if (totalProfit) totalProfit.textContent = `₹${(state.stats.total_profit ?? 0).toFixed(2)}`;
  if (aryanProfit) aryanProfit.textContent = `₹${(state.stats.aryan_profit ?? 0).toFixed(2)}`;
  if (vinayProfit) vinayProfit.textContent = `₹${(state.stats.vinay_profit ?? 0).toFixed(2)}`;
  if (divyanProfit) divyanProfit.textContent = `₹${(state.stats.divyan_profit ?? 0).toFixed(2)}`;

  // Sold count sub-badges
  const partnerSales = state.stats.partner_sales || {};
  const aryanBadge = document.getElementById('statAryanSoldBadge');
  const vinayBadge = document.getElementById('statVinaySoldBadge');
  const divyanBadge = document.getElementById('statDivyanSoldBadge');

  if (aryanBadge) aryanBadge.textContent = `${partnerSales.Aryan?.sold || 0} sold`;
  if (vinayBadge) vinayBadge.textContent = `${partnerSales.Vinay?.sold || 0} sold`;
  if (divyanBadge) divyanBadge.textContent = `${partnerSales.Divyan?.sold || 0} sold`;
}

// ------------------------------------------------------------------------------
// Render Items Grid (Custom Items, Stock & Partner Ownership)
// ------------------------------------------------------------------------------
function renderItemsGrid() {
  const container = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('itemsEmptyState');
  if (!container) return;

  let filtered = [...state.items];

  // Filter by owner
  if (state.activeOwnerFilter === 'my' && state.activeUser) {
    filtered = filtered.filter(i => (i.owner_name || '').toLowerCase() === state.activeUser.name.toLowerCase());
  } else if (state.activeOwnerFilter !== 'all') {
    filtered = filtered.filter(i => (i.owner_name || '').toLowerCase() === state.activeOwnerFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  const ownerColors = {
    aryan: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🦁' },
    vinay: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '💼' },
    divyan: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '🚀' }
  };

  container.innerHTML = filtered.map(item => {
    const isOut = item.quantity === 0;
    const isLow = item.quantity > 0 && item.quantity <= item.low_stock_threshold;
    const ownerKey = (item.owner_name || 'aryan').toLowerCase();
    const ownerStyle = ownerColors[ownerKey] || { badge: 'bg-zinc-800 text-zinc-300 border-zinc-700', icon: '👤' };

    const isMine = state.activeUser && (item.owner_name || '').toLowerCase() === state.activeUser.name.toLowerCase();

    const profitPerUnit = (item.sell_price > 0 && item.buy_price > 0) ? (item.sell_price - item.buy_price) : 0;

    return `
      <div class="bg-zinc-900 border ${isMine ? 'border-amber-500/40' : 'border-zinc-800'} hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between shadow-md card-hover-glow transition relative">
        ${isMine ? `<span class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black shadow-sm uppercase tracking-wider">Aapka Stock</span>` : ''}
        
        <div>
          <!-- Owner & Category Badges -->
          <div class="flex items-center justify-between gap-1.5 mb-2">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${ownerStyle.badge} flex items-center gap-1">
              <span>${ownerStyle.icon}</span> ${escapeHtml(item.owner_name || 'Common')}
            </span>
            <span class="text-[10px] font-semibold text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800 truncate max-w-[120px]">
              ${escapeHtml(item.category)}
            </span>
          </div>

          <!-- Item Name -->
          <h4 class="text-sm font-extrabold text-white mt-1 leading-snug">${escapeHtml(item.name)}</h4>

          <!-- Stock Quantity Display -->
          <div class="mt-3 flex items-baseline justify-between">
            <div class="flex items-baseline gap-1.5">
              <span class="text-3xl font-black ${isOut ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-white'}">${item.quantity}</span>
              <span class="text-xs text-zinc-400 font-bold">${escapeHtml(item.unit)}</span>
            </div>

            ${isOut 
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/40 pulse-low-stock">Khatam</span>`
              : isLow 
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">Sirf ${item.quantity} bache!</span>`
              : `<span class="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">In Stock</span>`
            }
          </div>

          <!-- Pricing Info with Profit Margin -->
          <div class="mt-2.5 p-2 bg-zinc-800/60 rounded-xl border border-zinc-800 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-zinc-400 font-medium">Bikri Rate (Sell):</span>
              <span class="text-emerald-400 font-extrabold text-sm">₹${item.sell_price || item.buy_price || 0}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Kharid: ₹${item.buy_price || 0}</span>
              <span class="${profitPerUnit > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-400'}">
                Munafa: +₹${profitPerUnit.toFixed(1)}/pkt
              </span>
            </div>
          </div>

          ${item.display_notes ? `<p class="mt-2 text-[11px] text-zinc-500 italic truncate">📍 ${escapeHtml(item.display_notes)}</p>` : ''}
        </div>

        <!-- Action Buttons: SELL & RESTOCK / QUICK CONTROLS -->
        <div class="mt-4 pt-3 border-t border-zinc-800 space-y-2">
          <!-- Primary: Becho Button (Opens modal with live profit & custom cash input) -->
          <button onclick="openSellModal(${item.id}, '${escapeHtml(item.name)}', ${item.sell_price || 14}, ${item.buy_price || 0}, '${escapeHtml(item.owner_name || 'Aryan')}')" class="w-full py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ${isOut ? 'opacity-40 cursor-not-allowed' : ''}" ${isOut ? 'disabled' : ''}>
            <span class="text-sm">💰</span> Becho & Profit Add Karo
          </button>

          <!-- Secondary Row: -1, +1, Restock, Delete -->
          <div class="flex items-center gap-1.5">
            <button onclick="quickAdjustStock(${item.id}, -1, '${escapeHtml(item.name)}')" class="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1 ${isOut ? 'opacity-40 cursor-not-allowed' : ''}" ${isOut ? 'disabled' : ''} title="1 packet kam karo">
              - 1
            </button>
            <button onclick="quickAdjustStock(${item.id}, 1, '${escapeHtml(item.name)}')" class="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition active:scale-95 flex items-center justify-center gap-1" title="1 packet badhao">
              + 1
            </button>
            <button onclick="openRestockModal(${item.id}, '${escapeHtml(item.name)}')" class="py-1.5 px-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition active:scale-95 whitespace-nowrap" title="Dukaan se stock laya">
              + Restock
            </button>
            <button onclick="deleteItemConfirm(${item.id}, '${escapeHtml(item.name)}')" class="w-8 h-8 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition flex items-center justify-center text-xs shrink-0" title="Delete">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Quick Stock Adjustment (+1 or -1)
async function quickAdjustStock(itemId, delta, itemName) {
  const userName = state.activeUser ? state.activeUser.name : 'Partner';
  const userId = state.activeUser ? state.activeUser.id : 1;

  try {
    const res = await fetch(`/api/items/${itemId}/adjust-stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delta,
        user_name: userName,
        user_id: userId
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Stock update failed');

    const actionText = delta > 0 ? `+${delta} packet badhaya` : `${Math.abs(delta)} packet kam kiya`;
    showToast(`${userName} ne "${itemName}" ${actionText} (${data.new_quantity} bache) 📦`, 'info');
    await refreshAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterByOwner(owner) {
  state.activeOwnerFilter = owner;
  document.querySelectorAll('.owner-pill').forEach(pill => {
    if (pill.getAttribute('data-owner') === owner) {
      pill.classList.remove('bg-zinc-800', 'text-zinc-300', 'border');
      pill.classList.add('bg-amber-500', 'text-black');
    } else {
      pill.classList.add('bg-zinc-800', 'text-zinc-300', 'border');
      pill.classList.remove('bg-amber-500', 'text-black');
    }
  });
  renderItemsGrid();
}

// ------------------------------------------------------------------------------
// Activity Log Render
// ------------------------------------------------------------------------------
function renderActivity() {
  const container = document.getElementById('activityTimeline');
  if (!container) return;

  if (state.activity.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-zinc-500 text-xs">Koi activity record nahi hai.</div>`;
    return;
  }

  const icons = {
    sell: { icon: 'fa-indian-rupee-sign', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    restock: { icon: 'fa-cart-shopping', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    add: { icon: 'fa-plus', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    expense: { icon: 'fa-receipt', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
  };

  container.innerHTML = state.activity.map(a => {
    const style = icons[a.action_type] || { icon: 'fa-bell', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
    return `
      <div class="p-2.5 sm:p-3 bg-zinc-800/60 rounded-xl border border-zinc-800 flex items-start gap-2.5">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs border ${style.color} shrink-0 mt-0.5">
          <i class="fa-solid ${style.icon}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-white truncate">${escapeHtml(a.user_name)}</span>
            <span class="text-[10px] text-zinc-500">${a.created_at ? a.created_at.slice(0, 16) : ''}</span>
          </div>
          <p class="text-xs text-zinc-300 mt-0.5">${escapeHtml(a.notes || a.item_name)}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// Shopping List
// ------------------------------------------------------------------------------
function renderShoppingList() {
  const container = document.getElementById('shoppingListContainer');
  const countBadge = document.getElementById('shoppingCount');
  if (!container) return;

  const pending = state.shopping.filter(s => s.status === 'pending');
  if (countBadge) countBadge.textContent = pending.length;

  if (state.shopping.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-zinc-500 text-xs">
        Dukaan se laane ke liye koi item pending nahi hai! 🎉
      </div>
    `;
    return;
  }

  container.innerHTML = state.shopping.map(s => {
    const isBought = s.status === 'bought';
    return `
      <div class="py-2.5 flex items-center justify-between gap-3 ${isBought ? 'opacity-50' : ''}">
        <div class="flex items-center gap-2.5">
          <button onclick="toggleShoppingItem(${s.id})" class="w-5 h-5 rounded-md border flex items-center justify-center text-xs transition ${isBought ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700 hover:border-emerald-500 text-transparent'}">
            <i class="fa-solid fa-check"></i>
          </button>
          <div>
            <p class="text-xs sm:text-sm font-bold ${isBought ? 'line-through text-zinc-500' : 'text-white'}">
              ${escapeHtml(s.item_name)}
            </p>
            <div class="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span>Qty: ${s.quantity} ${s.unit}</span>
              <span>•</span>
              <span>Lana hai: ${escapeHtml(s.added_by)}</span>
            </div>
          </div>
        </div>

        <button onclick="deleteShoppingItem(${s.id})" class="text-zinc-500 hover:text-red-400 text-xs p-1">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// Hisab-Kitab (Splits)
// ------------------------------------------------------------------------------
function renderHisabKitab() {
  const { total_spent, per_person_share, balances, settlements } = state.expensesData;

  const totalEl = document.getElementById('hisabTotalSpent');
  const shareEl = document.getElementById('hisabPerShare');
  if (totalEl) totalEl.textContent = (total_spent || 0).toFixed(2);
  if (shareEl) shareEl.textContent = (per_person_share || 0).toFixed(2);

  // Settlements
  const settContainer = document.getElementById('settlementsContainer');
  if (settContainer) {
    if (!settlements || settlements.length === 0) {
      settContainer.innerHTML = `
        <div class="col-span-full p-3 bg-zinc-800/50 rounded-xl text-center text-xs text-emerald-400 font-semibold border border-emerald-500/20">
          🎉 Sabhi 3 doston ka dukaan hisab barabar hai!
        </div>
      `;
    } else {
      settContainer.innerHTML = settlements.map(s => `
        <div class="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-red-400">${escapeHtml(s.from)}</span>
            <span class="text-[11px] text-zinc-400">&rarr; gives &rarr;</span>
            <span class="text-xs font-bold text-emerald-400">${escapeHtml(s.to)}</span>
          </div>
          <span class="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
            ₹${s.amount.toFixed(2)}
          </span>
        </div>
      `).join('');
    }
  }

  // Balances Table
  const tableBody = document.getElementById('balancesTableBody');
  if (tableBody && balances) {
    tableBody.innerHTML = balances.map(b => {
      const isPositive = b.net_balance > 0.01;
      const isZero = Math.abs(b.net_balance) <= 0.01;
      const badge = isZero
        ? `<span class="text-zinc-400 font-bold">Settled (₹0.00)</span>`
        : isPositive
        ? `<span class="text-emerald-400 font-bold">+₹${b.net_balance.toFixed(2)} (Lena hai)</span>`
        : `<span class="text-red-400 font-bold">-₹${Math.abs(b.net_balance).toFixed(2)} (Dena hai)</span>`;

      return `
        <tr class="hover:bg-zinc-800/40 transition">
          <td class="py-2.5 flex items-center gap-1.5 font-bold text-white">
            <span>${b.avatar}</span>
            <span>${escapeHtml(b.name)}</span>
          </td>
          <td class="py-2.5 text-zinc-300 font-medium">₹${b.total_spent.toFixed(2)}</td>
          <td class="py-2.5 text-zinc-400">₹${b.share.toFixed(2)}</td>
          <td class="py-2.5 text-right">${badge}</td>
        </tr>
      `;
    }).join('');
  }
}

// ------------------------------------------------------------------------------
// Modal Openers & Actions
// ------------------------------------------------------------------------------
function openSellModal(itemId, itemName, defaultSellPrice = 14, buyPrice = 0, ownerName = 'Aryan') {
  document.getElementById('sellItemId').value = itemId;
  document.getElementById('sellModalTitle').textContent = `Becho: ${itemName}`;
  document.getElementById('sellAmount').value = 1;
  document.getElementById('sellPricePerUnit').value = defaultSellPrice;
  
  const buyPriceEl = document.getElementById('sellBuyPrice');
  if (buyPriceEl) buyPriceEl.value = buyPrice;

  // Auto-calculated default cash received
  const totalInput = document.getElementById('sellTotalReceived');
  if (totalInput) totalInput.value = (1 * defaultSellPrice).toFixed(2);

  document.getElementById('sellNotes').value = '';
  populateUserSelects();

  // Pre-select seller to match item owner
  const userSel = document.getElementById('sellUserSelect');
  if (userSel) {
    for (let i = 0; i < userSel.options.length; i++) {
      if (userSel.options[i].text.toLowerCase().includes(ownerName.toLowerCase())) {
        userSel.selectedIndex = i;
        break;
      }
    }
  }

  updateSellProfitDisplay();
  openModal('sellModal');
}

function updateAutoSellCash() {
  const qty = parseInt(document.getElementById('sellAmount')?.value || 1, 10);
  const price = parseFloat(document.getElementById('sellPricePerUnit')?.value || 0);
  const totalInput = document.getElementById('sellTotalReceived');
  if (totalInput) {
    totalInput.value = (qty * price).toFixed(2);
  }
  updateSellProfitDisplay();
}

function updateSellProfitDisplay() {
  const qty = parseInt(document.getElementById('sellAmount')?.value || 1, 10);
  const buyPrice = parseFloat(document.getElementById('sellBuyPrice')?.value || 0);
  const cashReceived = parseFloat(document.getElementById('sellTotalReceived')?.value || 0);
  const costBasis = qty * buyPrice;
  const profit = cashReceived - costBasis;

  const profitEl = document.getElementById('sellLiveProfitDisplay');
  const formulaEl = document.getElementById('sellProfitFormula');
  if (profitEl) {
    if (profit >= 0) {
      profitEl.textContent = `+₹${profit.toFixed(2)}`;
      profitEl.className = 'text-xl font-black text-emerald-300';
    } else {
      profitEl.textContent = `-₹${Math.abs(profit).toFixed(2)}`;
      profitEl.className = 'text-xl font-black text-red-400';
    }
  }
  if (formulaEl) {
    formulaEl.textContent = `(Cash ₹${cashReceived.toFixed(1)} - Kharid ₹${costBasis.toFixed(1)})`;
  }
}

function updateAddItemProfitPreview() {
  const buy = parseFloat(document.getElementById('newItemBuyPrice')?.value || 0);
  const sell = parseFloat(document.getElementById('newItemSellPrice')?.value || 0);
  const diff = sell - buy;
  const valEl = document.getElementById('addItemProfitValue');
  if (valEl) {
    valEl.textContent = `${diff >= 0 ? '+' : ''}₹${diff.toFixed(2)}`;
    valEl.className = diff >= 0 ? 'font-extrabold text-emerald-400' : 'font-extrabold text-red-400';
  }
}

function openRestockModal(itemId, itemName) {
  document.getElementById('restockItemId').value = itemId;
  document.getElementById('restockModalTitle').textContent = `Restock: ${itemName}`;
  document.getElementById('restockAmount').value = 12;
  document.getElementById('restockCost').value = '';
  populateUserSelects();
  openModal('restockModal');
}

async function deleteItemConfirm(itemId, itemName) {
  if (!confirm(`Kya sach mein "${itemName}" ko stock se delete karna hai?`)) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`"${itemName}" deleted from stock`, 'info');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to delete item', 'error');
  }
}

async function toggleShoppingItem(itemId) {
  try {
    await fetch(`/api/shopping/${itemId}/toggle`, { method: 'POST' });
    await loadShopping();
  } catch (err) {
    console.error(err);
  }
}

async function deleteShoppingItem(itemId) {
  try {
    await fetch(`/api/shopping/${itemId}`, { method: 'DELETE' });
    await loadShopping();
  } catch (err) {
    console.error(err);
  }
}

// ------------------------------------------------------------------------------
// Navigation & Event Listeners
// ------------------------------------------------------------------------------
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.querySelectorAll('.mobile-nav-btn').forEach(b => {
    if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
    else b.classList.remove('active');
  });

  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  const activeContent = document.getElementById(tabId);
  if (activeContent) activeContent.classList.remove('hidden');
  state.activeTab = tabId;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
  // Tabs switching
  document.querySelectorAll('.tab-btn, .mobile-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Partner stock filter pills
  document.querySelectorAll('.owner-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const owner = pill.getAttribute('data-owner');
      filterByOwner(owner);
    });
  });

  // Partner dropdown toggle
  const userBtn = document.getElementById('userDropdownBtn');
  if (userBtn) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUserDropdown();
    });
  }
  document.addEventListener('click', () => toggleUserDropdown(false));

  // Add Item Open Button (Name, Kharid & Bikri Rate with Profit Preview, Quantity)
  document.getElementById('openAddItemBtn')?.addEventListener('click', () => {
    document.getElementById('newItemName').value = '';
    const buyInput = document.getElementById('newItemBuyPrice');
    const sellInput = document.getElementById('newItemSellPrice');
    if (buyInput) buyInput.value = '';
    if (sellInput) sellInput.value = '';
    document.getElementById('newItemQuantity').value = '';
    updateAddItemProfitPreview();
    const badge = document.getElementById('addItemOwnerBadge');
    if (badge && state.activeUser) {
      badge.textContent = `Adding to: ${state.activeUser.avatar} ${state.activeUser.name} Ka Stock`;
    }
    openModal('addItemModal');
  });

  // Live profit calculation listeners for Add Item Form
  document.getElementById('newItemBuyPrice')?.addEventListener('input', updateAddItemProfitPreview);
  document.getElementById('newItemSellPrice')?.addEventListener('input', updateAddItemProfitPreview);

  // Search & Category Filters
  document.getElementById('inventorySearch')?.addEventListener('input', debounce(loadItems, 300));
  document.getElementById('categoryFilter')?.addEventListener('change', loadItems);

  // Modals Close
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Form: Add Custom Item (Name, Buy & Sell Price, Quantity)
  document.getElementById('addItemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newItemName').value.trim();
    const buyPrice = parseFloat(document.getElementById('newItemBuyPrice')?.value || 0);
    const sellPrice = parseFloat(document.getElementById('newItemSellPrice')?.value || buyPrice);
    const quantity = parseInt(document.getElementById('newItemQuantity').value, 10);

    const owner_name = state.activeUser ? state.activeUser.name : 'Aryan';
    const owner_id = state.activeUser ? state.activeUser.id : 1;

    // Smart category auto-detection
    const nameLower = name.toLowerCase();
    let category = "Extra Snacks";
    if (nameLower.includes("maggi") || nameLower.includes("yippee") || nameLower.includes("noodles") || nameLower.includes("wai wai")) {
      category = "Maggi & Noodles";
    } else if (nameLower.includes("kurkure") || nameLower.includes("chips") || nameLower.includes("lays") || nameLower.includes("bingo")) {
      category = "Kurkure & Chips";
    } else if (nameLower.includes("biscuit") || nameLower.includes("bourbon") || nameLower.includes("parle") || nameLower.includes("oreo") || nameLower.includes("toast")) {
      category = "Biscuits & Bakery";
    } else if (nameLower.includes("sting") || nameLower.includes("frooti") || nameLower.includes("coke") || nameLower.includes("drink") || nameLower.includes("juice")) {
      category = "Cold Drinks & Juices";
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          unit: 'packets',
          quantity,
          owner_name,
          owner_id,
          buy_price: buyPrice,
          sell_price: sellPrice,
          notes: `${owner_name} ka stock`,
          low_stock_threshold: 3
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item');

      closeAllModals();
      const perPktProfit = sellPrice - buyPrice;
      showToast(`🎉 "${name}" (${quantity} pkts @ Kharid: ₹${buyPrice}, Bikri: ₹${sellPrice}, Profit: +₹${perPktProfit.toFixed(1)}) added to ${owner_name}'s stock!`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Sell Item (Bikri with Custom Cash Received & Live Profit Calculation)
  document.getElementById('sellAmount')?.addEventListener('input', updateAutoSellCash);
  document.getElementById('sellPricePerUnit')?.addEventListener('input', updateAutoSellCash);
  document.getElementById('sellBuyPrice')?.addEventListener('input', updateSellProfitDisplay);
  document.getElementById('sellTotalReceived')?.addEventListener('input', updateSellProfitDisplay);

  document.querySelectorAll('#sellModal .qty-btn-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('sellAmount');
      if (input && parseInt(input.value, 10) > 1) {
        input.value = parseInt(input.value, 10) - 1;
        updateAutoSellCash();
      }
    });
  });

  document.querySelectorAll('#sellModal .qty-btn-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('sellAmount');
      if (input) {
        input.value = parseInt(input.value, 10) + 1;
        updateAutoSellCash();
      }
    });
  });

  document.getElementById('sellForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('sellItemId').value;
    const amount = parseInt(document.getElementById('sellAmount').value, 10);
    const sellPrice = parseFloat(document.getElementById('sellPricePerUnit').value || 0);
    const buyPrice = parseFloat(document.getElementById('sellBuyPrice')?.value || 0);
    const totalCashReceived = parseFloat(document.getElementById('sellTotalReceived').value || 0);
    const userSel = document.getElementById('sellUserSelect');
    const sellerId = parseInt(userSel.value, 10);
    const sellerName = userSel.options[userSel.selectedIndex].text.replace(/^[^\s]+\s+/, '');
    const notes = document.getElementById('sellNotes').value.trim();

    try {
      const res = await fetch(`/api/items/${itemId}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          sell_price: sellPrice,
          buy_price: buyPrice,
          total_cash_received: totalCashReceived,
          seller_id: sellerId,
          seller_name: sellerName,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale');

      closeAllModals();
      const earnedProfit = data.profit !== undefined ? data.profit : (totalCashReceived - (amount * buyPrice));
      showToast(`💵 Sale Recorded! Cash: ₹${totalCashReceived.toFixed(2)} | Profit: +₹${earnedProfit.toFixed(2)} added to ${sellerName}! 🎉`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Restock Item
  document.getElementById('restockForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const itemId = document.getElementById('restockItemId').value;
    const amount = parseInt(document.getElementById('restockAmount').value, 10);
    const cost = parseFloat(document.getElementById('restockCost').value || 0);
    const userSel = document.getElementById('restockUserSelect');
    const userId = parseInt(userSel.value, 10);
    const userName = userSel.options[userSel.selectedIndex].text.replace(/^[^\s]+\s+/, '');

    try {
      const res = await fetch(`/api/items/${itemId}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, cost, user_id: userId, user_name: userName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restock');

      closeAllModals();
      showToast(`🛒 Restocked! New quantity: ${data.new_quantity}`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Add Expense / Dukaan Bill
  document.getElementById('addExpenseBtn')?.addEventListener('click', () => {
    populateUserSelects();
    openModal('addExpenseModal');
  });

  document.getElementById('addExpenseForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('expenseTitle').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const userSel = document.getElementById('expensePayerSelect');
    const payerId = parseInt(userSel.value, 10);
    const payerName = userSel.options[userSel.selectedIndex].text.replace(/^[^\s]+\s+/, '');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, amount, payer_id: payerId, payer_name: payerName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bill');

      closeAllModals();
      showToast(`Kharid Bill Recorded: ₹${amount.toFixed(2)}`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Shopping / Dukaan List
  document.getElementById('addShoppingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('shoppingInput');
    const itemName = input.value.trim();
    if (!itemName) return;

    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: itemName,
          category: 'Snacks',
          quantity: 12,
          unit: 'packet',
          added_by: state.activeUser?.name || 'Partner'
        })
      });
      if (res.ok) {
        input.value = '';
        showToast(`Added to Dukaan List: "${itemName}"`, 'info');
        await loadShopping();
      }
    } catch (err) {
      showToast('Failed to add to shopping list', 'error');
    }
  });

  // Wi-Fi / Phone Share
  document.getElementById('wifiShareBtn')?.addEventListener('click', () => {
    openModal('wifiModal');
  });
  document.getElementById('copyWifiLinkBtn')?.addEventListener('click', () => {
    const url = document.getElementById('wifiShareUrl')?.textContent;
    if (url) {
      navigator.clipboard.writeText(url);
      showToast('Link copied! WhatsApp group pe share karo.', 'success');
    }
  });
}

// ------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------
function toggleUserDropdown(forceState) {
  const menu = document.getElementById('userDropdownMenu');
  if (!menu) return;
  if (typeof forceState === 'boolean') {
    if (forceState) menu.classList.remove('hidden');
    else menu.classList.add('hidden');
  } else {
    menu.classList.toggle('hidden');
  }
}

function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const bgColors = {
    success: 'bg-emerald-600 text-white shadow-emerald-500/20',
    error: 'bg-red-600 text-white shadow-red-500/20',
    info: 'bg-zinc-800 text-amber-300 border border-amber-500/40 shadow-black/50'
  };

  const toast = document.createElement('div');
  toast.className = `px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
