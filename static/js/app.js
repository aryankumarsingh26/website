// ==============================================================================
// SnackVault - Aryan, Vinay & Divyan Stock Tracker
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
  initTheme();
  setupEventListeners();
  await loadDbStatus();
  await loadUsers();
  await loadCategories();
  await loadNetworkInfo();
  await refreshAllData();
});

// ------------------------------------------------------------------------------
// Theme Management (Light Mode & Dark Mode)
// ------------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('snack_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = saved ? saved : (prefersDark ? 'dark' : 'dark');
  applyTheme(initialTheme);

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

function applyTheme(theme) {
  const html = document.documentElement;
  const icon = document.getElementById('themeToggleIcon');
  const btn = document.getElementById('themeToggleBtn');
  const dropdownLabel = document.getElementById('dropdownThemeLabel');

  if (theme === 'light') {
    html.classList.remove('dark');
    if (icon) {
      icon.className = 'fa-solid fa-moon text-indigo-500 text-sm transition-transform duration-300 rotate-12';
    }
    if (btn) {
      btn.title = 'Switch to Dark Mode 🌙';
      btn.classList.add('bg-slate-100', 'border-slate-300');
    }
    if (dropdownLabel) {
      dropdownLabel.textContent = 'Light ☀️';
    }
  } else {
    html.classList.add('dark');
    if (icon) {
      icon.className = 'fa-solid fa-sun text-amber-400 text-sm transition-transform duration-300 rotate-0';
    }
    if (btn) {
      btn.title = 'Switch to Light Mode ☀️';
      btn.classList.remove('bg-slate-100', 'border-slate-300');
    }
    if (dropdownLabel) {
      dropdownLabel.textContent = 'Dark 🌙';
    }
  }
  localStorage.setItem('snack_theme', theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    icon.style.transform = 'scale(0.5) rotate(180deg)';
    setTimeout(() => {
      icon.style.transform = '';
    }, 220);
  }

  applyTheme(newTheme);
  showToast(newTheme === 'light' ? 'Light Mode On ☀️' : 'Dark Mode On 🌙', 'info');
}

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
        ${u.avatar} ${escapeHtml(u.name)}'s Stock
      </option>
    `).join('');
  }
}

function populateCategoryDropdowns() {
  const filterSel = document.getElementById('categoryFilter');
  const addSel = document.getElementById('newItemCategory');

  if (filterSel) {
    filterSel.innerHTML = `
      <option value="all">All Categories</option>
      ${state.categories.map(c => `<option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.name)}</option>`).join('')}
    `;
  }

  if (addSel) {
    addSel.innerHTML = state.categories.map(c => `
      <option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.name)}</option>
    `).join('');
  }
}

// ------------------------------------------------------------------------------
// Animated Number Counter & Floating Badge Effects
// ------------------------------------------------------------------------------
function animateCounter(elementId, targetValue, prefix = '', suffix = '') {
  const el = document.getElementById(elementId);
  if (!el) return;

  const currentStr = el.textContent.replace(/[^0-9.-]/g, '');
  const startVal = parseFloat(currentStr) || 0;
  const targetVal = parseFloat(targetValue) || 0;

  if (startVal === targetVal && el.textContent.trim() !== '--') {
    return;
  }

  // Trigger quantity spring punch effect
  el.classList.remove('qty-punch');
  void el.offsetWidth;
  el.classList.add('qty-punch');

  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (targetVal - startVal) * ease);
    el.textContent = `${prefix}${current}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = `${prefix}${targetVal}${suffix}`;
    }
  }
  requestAnimationFrame(step);
}

function triggerFloatingBadge(event, text, isPositive) {
  try {
    const badge = document.createElement('div');
    badge.className = `floating-delta-badge ${isPositive ? 'bg-emerald-500 text-black border border-emerald-300' : 'bg-red-500 text-white border border-red-300'}`;
    badge.innerHTML = `<span>${isPositive ? '▲' : '▼'}</span> <span>${text}</span> <span>📦</span>`;
    
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (event && event.clientX && event.clientY && event.clientX > 0 && event.clientY > 0) {
      x = event.clientX;
      y = event.clientY;
    } else if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top;
    }

    x = Math.max(50, Math.min(window.innerWidth - 50, x));
    y = Math.max(40, y);

    badge.style.left = `${x}px`;
    badge.style.top = `${y}px`;
    document.body.appendChild(badge);

    setTimeout(() => {
      if (badge && badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }, 850);
  } catch (e) {
    console.error('Badge effect error:', e);
  }
}

function renderStats() {
  const total = state.stats.total_stock ?? 0;
  const aryan = state.stats.aryan_stock ?? 0;
  const vinay = state.stats.vinay_stock ?? 0;
  const divyan = state.stats.divyan_stock ?? 0;

  animateCounter('statTotalStock', total);
  animateCounter('statAryanStock', aryan);
  animateCounter('statVinayStock', vinay);
  animateCounter('statDivyanStock', divyan);

  // Update Lively Stock Distribution Bar
  const totalStockNum = Math.max(total, 0);
  const barAryan = document.getElementById('barAryanStock');
  const barVinay = document.getElementById('barVinayStock');
  const barDivyan = document.getElementById('barDivyanStock');
  const distAryanPct = document.getElementById('distAryanPct');
  const distVinayPct = document.getElementById('distVinayPct');
  const distDivyanPct = document.getElementById('distDivyanPct');

  if (totalStockNum > 0) {
    const aryanPct = Math.round((aryan / totalStockNum) * 100);
    const vinayPct = Math.round((vinay / totalStockNum) * 100);
    const divyanPct = Math.max(0, 100 - aryanPct - vinayPct);

    if (barAryan) barAryan.style.width = `${Math.max(aryanPct, aryan > 0 ? 6 : 0)}%`;
    if (barVinay) barVinay.style.width = `${Math.max(vinayPct, vinay > 0 ? 6 : 0)}%`;
    if (barDivyan) barDivyan.style.width = `${Math.max(divyanPct, divyan > 0 ? 6 : 0)}%`;

    if (distAryanPct) distAryanPct.textContent = `${aryanPct}% (${aryan} pkts)`;
    if (distVinayPct) distVinayPct.textContent = `${vinayPct}% (${vinay} pkts)`;
    if (distDivyanPct) distDivyanPct.textContent = `${divyanPct}% (${divyan} pkts)`;
  } else {
    if (barAryan) barAryan.style.width = '33.3%';
    if (barVinay) barVinay.style.width = '33.3%';
    if (barDivyan) barDivyan.style.width = '33.4%';
    if (distAryanPct) distAryanPct.textContent = '0%';
    if (distVinayPct) distVinayPct.textContent = '0%';
    if (distDivyanPct) distDivyanPct.textContent = '0%';
  }

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

// Helper to get lively category icon
function getCategoryIcon(catName) {
  const lower = (catName || '').toLowerCase();
  if (lower.includes('maggi') || lower.includes('noodle') || lower.includes('yippee') || lower.includes('wai wai')) return '🍜';
  if (lower.includes('biscuit') || lower.includes('bourbon') || lower.includes('bakery') || lower.includes('cookie')) return '🍪';
  if (lower.includes('chips') || lower.includes('kurkure') || lower.includes('tedhe')) return '🍟';
  if (lower.includes('drink') || lower.includes('coke') || lower.includes('pepsi') || lower.includes('juice')) return '🥤';
  if (lower.includes('snack') || lower.includes('namkeen')) return '🍿';
  return '📦';
}

function openAddItemForPartner(partnerName) {
  document.getElementById('newItemName').value = '';
  const buyInput = document.getElementById('newItemBuyPrice');
  if (buyInput) buyInput.value = '';
  document.getElementById('newItemQuantity').value = '';
  
  const ownerSel = document.getElementById('newItemOwnerSelect');
  if (ownerSel) {
    ownerSel.value = partnerName;
  }
  const badge = document.getElementById('addItemOwnerBadge');
  if (badge) {
    badge.textContent = `Adding to: ${partnerName}'s Stock`;
  }
  openModal('addItemModal');
}

function handleItemClick(itemId, itemName, buyPrice, ownerName, quantity) {
  if (quantity <= 0) {
    showToast(`"${itemName}" is out of stock! Please restock 🛒`, 'error');
    openRestockModal(itemId, itemName);
    return;
  }
  openSellModal(itemId, itemName, buyPrice, ownerName);
}

function toggleItemMenu(event, itemId) {
  if (event) event.stopPropagation();
  const menu = document.getElementById(`itemMenu-${itemId}`);
  const isHidden = menu?.classList.contains('hidden');
  document.querySelectorAll('[id^="itemMenu-"]').forEach(m => m.classList.add('hidden'));
  if (menu && isHidden) {
    menu.classList.remove('hidden');
  }
}

// ------------------------------------------------------------------------------
// Render Items Grid: 3 Dedicated Partner Cards with Compact Stock Lists
// ------------------------------------------------------------------------------
function renderItemsGrid() {
  const container = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('itemsEmptyState');
  if (!container) return;

  const searchTerm = (document.getElementById('inventorySearch')?.value || '').trim().toLowerCase();
  const categoryTerm = document.getElementById('categoryFilter')?.value || 'all';

  // Filter items by search & category
  let filtered = state.items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm) || 
      (item.category && item.category.toLowerCase().includes(searchTerm)) ||
      (item.owner_name && item.owner_name.toLowerCase().includes(searchTerm));
    const matchesCategory = categoryTerm === 'all' || item.category === categoryTerm;
    return matchesSearch && matchesCategory;
  });

  if (state.items.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  // Define the 3 Partners with their distinct styles
  const partnerConfig = [
    {
      name: 'Aryan',
      avatar: '🦁',
      cardClass: 'card-border-aryan',
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
      headerGradient: 'from-red-500/15 via-zinc-900 to-zinc-900',
      accentColor: 'text-red-400',
      topStripe: 'from-red-500 to-rose-600'
    },
    {
      name: 'Vinay',
      avatar: '💼',
      cardClass: 'card-border-vinay',
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      headerGradient: 'from-blue-500/15 via-zinc-900 to-zinc-900',
      accentColor: 'text-blue-400',
      topStripe: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Divyan',
      avatar: '🚀',
      cardClass: 'card-border-divyan',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      headerGradient: 'from-emerald-500/15 via-zinc-900 to-zinc-900',
      accentColor: 'text-emerald-400',
      topStripe: 'from-emerald-500 to-teal-400'
    }
  ];

  // Filter visible partner cards based on activeOwnerFilter
  let visiblePartners = partnerConfig;
  if (state.activeOwnerFilter === 'my' && state.activeUser) {
    visiblePartners = partnerConfig.filter(p => p.name.toLowerCase() === state.activeUser.name.toLowerCase());
  } else if (state.activeOwnerFilter !== 'all') {
    visiblePartners = partnerConfig.filter(p => p.name.toLowerCase() === state.activeOwnerFilter.toLowerCase());
  }
  if (visiblePartners.length === 0) {
    visiblePartners = partnerConfig;
  }

  // Adjust responsive grid columns based on number of visible partner cards
  if (visiblePartners.length === 1) {
    container.className = 'grid grid-cols-1 max-w-2xl mx-auto gap-4 items-start';
  } else if (visiblePartners.length === 2) {
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start';
  } else {
    container.className = 'grid grid-cols-1 lg:grid-cols-3 gap-4 items-start';
  }

  container.innerHTML = visiblePartners.map(partner => {
    const partnerItems = filtered.filter(i => (i.owner_name || '').toLowerCase() === partner.name.toLowerCase());
    const totalPackets = partnerItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const isCurrentUser = state.activeUser && state.activeUser.name.toLowerCase() === partner.name.toLowerCase();

    const itemsHtml = partnerItems.length > 0 
      ? partnerItems.map(item => renderCompactItemRow(item)).join('')
      : `
        <div class="text-center py-8 px-3 text-zinc-500 bg-zinc-800/20 rounded-xl border border-dashed border-zinc-800 my-2">
          <p class="text-xs font-semibold">${searchTerm ? `No items found for "${escapeHtml(searchTerm)}"` : 'No items in stock'}</p>
          <button onclick="openAddItemForPartner('${partner.name}')" class="mt-2 text-xs font-bold text-amber-400 hover:underline">
            + Add item to ${partner.name}'s stock
          </button>
        </div>
      `;

    return `
      <div class="partner-stock-card ${partner.cardClass} flex flex-col justify-between card-entry transition relative">
        <!-- Partner Top Accent Line -->
        <div class="h-1 w-full absolute top-0 left-0 bg-gradient-to-r ${partner.topStripe}"></div>

        <!-- Partner Card Header -->
        <div class="bg-gradient-to-r ${partner.headerGradient} p-3 sm:p-3.5 border-b border-zinc-800 flex items-center justify-between gap-2 pt-3.5">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-2xl sm:text-3xl shrink-0">${partner.avatar}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm sm:text-base font-black text-white truncate">
                  ${partner.name}'s Stock
                </h3>
                ${isCurrentUser ? `<span class="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-black uppercase tracking-wider shrink-0">Yours</span>` : ''}
              </div>
              <p class="text-[11px] text-zinc-400 font-semibold mt-0.5 flex items-center gap-1.5">
                <span>${partnerItems.length} items</span>
                <span>•</span>
                <span class="font-extrabold ${partner.accentColor}">${totalPackets} pkts</span>
              </p>
            </div>
          </div>

          <!-- Quick Add Button for this Partner -->
          <button onclick="openAddItemForPartner('${partner.name}')" class="px-2.5 py-1 text-xs font-bold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1 active:scale-95 shrink-0 shadow-sm" title="Add item to ${partner.name}'s stock">
            <i class="fa-solid fa-plus text-[10px] text-amber-400"></i>
            <span class="text-[11px] font-bold">Item</span>
          </button>
        </div>

        <!-- Items Compact List -->
        <div class="p-2.5 sm:p-3 space-y-2 max-h-[560px] overflow-y-auto custom-scrollbar">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');
}

// ------------------------------------------------------------------------------
// Compact Item Row Component (Saves ~70% Screen Space & Supports Click-to-Sell)
// ------------------------------------------------------------------------------
function renderCompactItemRow(item) {
  const isOut = item.quantity === 0;
  const isLow = item.quantity > 0 && item.quantity <= item.low_stock_threshold;
  const categoryIcon = getCategoryIcon(item.category);

  let qtyBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let qtyText = `${item.quantity} ${item.unit || 'pkts'}`;
  
  if (isOut) {
    qtyBadgeClass = 'bg-red-500/15 text-red-400 border-red-500/40';
    qtyText = 'Out of Stock';
  } else if (isLow) {
    qtyBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    qtyText = `${item.quantity} left`;
  }

  return `
    <div 
      class="compact-item-row group rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${isOut ? 'opacity-60' : ''}"
      onclick="handleItemClick(${item.id}, '${escapeHtml(item.name)}', ${item.buy_price || 0}, '${escapeHtml(item.owner_name || 'Aryan')}', ${item.quantity})"
      title="Click to sell"
    >
      <!-- Left: Category Icon, Name, Cost Price -->
      <div class="flex items-center gap-2 min-w-0 pr-1">
        <span class="text-base sm:text-lg shrink-0">${categoryIcon}</span>
        <div class="min-w-0">
          <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
            ${escapeHtml(item.name)}
          </h4>
          <div class="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
            <span class="font-bold text-amber-400/90">₹${item.buy_price || 0}/pkt</span>
            <span class="text-zinc-600 hidden sm:inline">•</span>
            <span class="truncate max-w-[90px] text-zinc-400 hidden sm:inline">${escapeHtml(item.category)}</span>
          </div>
        </div>
      </div>

      <!-- Right: Quantity Pill, Sell Button, Quick Adjust Controls -->
      <div class="flex items-center gap-1 shrink-0" onclick="event.stopPropagation()">
        <!-- Compact Quantity Pill -->
        <span id="itemQty-${item.id}" class="px-2 py-0.5 rounded-lg text-[11px] font-black border ${qtyBadgeClass} shrink-0 transition-transform">
          ${qtyText}
        </span>

        <!-- Sell Button -->
        <button 
          onclick="openSellModal(${item.id}, '${escapeHtml(item.name)}', ${item.buy_price || 0}, '${escapeHtml(item.owner_name || 'Aryan')}')" 
          class="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] transition shadow-sm active:scale-95 flex items-center gap-1 shrink-0 ${isOut ? 'opacity-30 cursor-not-allowed' : ''}"
          ${isOut ? 'disabled' : ''}
          title="Sell this item"
        >
          <span>💰</span>
          <span>Sell</span>
        </button>

        <!-- Micro Quick Stock Adjust: -1 & +1 -->
        <button 
          onclick="quickAdjustStock(${item.id}, -1, '${escapeHtml(item.name)}', event)" 
          class="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 text-zinc-300 text-xs font-black transition flex items-center justify-center active:scale-90 shrink-0 ${isOut ? 'opacity-30 cursor-not-allowed' : ''}" 
          ${isOut ? 'disabled' : ''} 
          title="Decrease 1 packet"
        >
          -
        </button>
        <button 
          onclick="quickAdjustStock(${item.id}, 1, '${escapeHtml(item.name)}', event)" 
          class="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 border border-zinc-700 text-zinc-300 text-xs font-black transition flex items-center justify-center active:scale-90 shrink-0" 
          title="Increase 1 packet"
        >
          +
        </button>

        <!-- Dropdown Menu for Restock & Delete -->
        <div class="relative shrink-0">
          <button onclick="toggleItemMenu(event, ${item.id})" class="w-6 h-6 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/60 flex items-center justify-center text-xs transition" title="Options">
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          <div id="itemMenu-${item.id}" class="hidden absolute right-0 top-full mt-1 w-28 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-1 z-30">
            <button onclick="openRestockModal(${item.id}, '${escapeHtml(item.name)}'); toggleItemMenu(null, ${item.id})" class="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5">
              <span>🛒</span> Restock
            </button>
            <button onclick="deleteItemConfirm(${item.id}, '${escapeHtml(item.name)}'); toggleItemMenu(null, ${item.id})" class="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-500/20 flex items-center gap-1.5">
              <i class="fa-regular fa-trash-can text-[10px]"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Quick Stock Adjustment (+1 or -1) with Lively Bubble Pop
async function quickAdjustStock(itemId, delta, itemName, event) {
  const userName = state.activeUser ? state.activeUser.name : 'Partner';
  const userId = state.activeUser ? state.activeUser.id : 1;

  // Instant tactile visual feedback: trigger floating bubble badge
  triggerFloatingBadge(event, delta > 0 ? `+${delta}` : `${delta}`, delta > 0);

  // Trigger immediate spring punch on the item quantity span
  const qtyEl = document.getElementById(`itemQty-${itemId}`);
  if (qtyEl) {
    qtyEl.classList.remove('qty-punch');
    void qtyEl.offsetWidth;
    qtyEl.classList.add('qty-punch');
  }

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

    const actionText = delta > 0 ? `+${delta} packet added` : `${Math.abs(delta)} packet removed`;
    showToast(`${userName} ${actionText} for "${itemName}" (${data.new_quantity} left) 📦`, 'info');
    await refreshAllData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterByOwner(owner) {
  state.activeOwnerFilter = owner;
  
  // Highlight Filter Pills
  document.querySelectorAll('.owner-pill').forEach(pill => {
    const pillOwner = pill.getAttribute('data-owner');
    if (pillOwner === owner) {
      pill.classList.remove('bg-zinc-800', 'text-zinc-300', 'border');
      pill.classList.add('bg-amber-500', 'text-black', 'active');
    } else {
      pill.classList.add('bg-zinc-800', 'text-zinc-300', 'border');
      pill.classList.remove('bg-amber-500', 'text-black', 'active');
    }
  });

  // Highlight Top Stock Cards with lively halo
  const cardAryan = document.getElementById('stockCardAryan');
  const cardVinay = document.getElementById('stockCardVinay');
  const cardDivyan = document.getElementById('stockCardDivyan');

  if (cardAryan) cardAryan.classList.toggle('active-stock-card', owner === 'Aryan');
  if (cardVinay) cardVinay.classList.toggle('active-stock-card', owner === 'Vinay');
  if (cardDivyan) cardDivyan.classList.toggle('active-stock-card', owner === 'Divyan');

  renderItemsGrid();
}

// ------------------------------------------------------------------------------
// Activity Log Render
// ------------------------------------------------------------------------------
function renderActivity() {
  const container = document.getElementById('activityTimeline');
  if (!container) return;

  if (state.activity.length === 0) {
    container.innerHTML = `<div class="text-center py-6 text-zinc-500 text-xs">No activity recorded yet.</div>`;
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
        No pending items to restock! 🎉
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
              <span>Added by: ${escapeHtml(s.added_by)}</span>
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
          🎉 All 3 roommates are settled up!
        </div>
      `;
    } else {
      settContainer.innerHTML = settlements.map(s => `
        <div class="p-2.5 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-red-400">${escapeHtml(s.from)}</span>
            <span class="text-[11px] text-zinc-400">&rarr; owes &rarr;</span>
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
        ? `<span class="text-emerald-400 font-bold">+₹${b.net_balance.toFixed(2)} (To Receive)</span>`
        : `<span class="text-red-400 font-bold">-₹${Math.abs(b.net_balance).toFixed(2)} (To Pay)</span>`;

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
function openSellModal(itemId, itemName, buyPrice = 0, ownerName = 'Aryan') {
  document.getElementById('sellItemId').value = itemId;
  document.getElementById('sellModalTitle').textContent = `Sell: ${itemName}`;
  document.getElementById('sellAmount').value = 1;
  
  // Set Cost Price reference
  const buyPriceEl = document.getElementById('sellBuyPrice');
  if (buyPriceEl) buyPriceEl.value = buyPrice;

  // Clear Selling Price so user enters how much it was sold for
  const sellPriceInput = document.getElementById('sellPricePerUnit');
  if (sellPriceInput) {
    sellPriceInput.value = '';
    sellPriceInput.placeholder = buyPrice > 0 ? `Selling price (Cost: ₹${buyPrice})` : 'Selling price (₹/pkt)';
  }

  // Clear typed cash received
  const totalInput = document.getElementById('sellTotalReceived');
  if (totalInput) {
    totalInput.value = '';
    totalInput.placeholder = '0.00';
  }

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
  setTimeout(() => sellPriceInput?.focus(), 150);
}

function updateAutoSellCash() {
  const qty = parseInt(document.getElementById('sellAmount')?.value || 1, 10);
  const price = parseFloat(document.getElementById('sellPricePerUnit')?.value || 0);
  const totalInput = document.getElementById('sellTotalReceived');
  if (totalInput && price > 0) {
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
    if (cashReceived > 0) {
      if (profit >= 0) {
        profitEl.textContent = `+₹${profit.toFixed(2)}`;
        profitEl.className = 'text-xl font-black text-emerald-300';
      } else {
        profitEl.textContent = `-₹${Math.abs(profit).toFixed(2)}`;
        profitEl.className = 'text-xl font-black text-red-400';
      }
    } else {
      profitEl.textContent = '₹0.00';
      profitEl.className = 'text-xl font-black text-zinc-400';
    }
  }
  if (formulaEl) {
    if (cashReceived > 0) {
      formulaEl.textContent = `(Cash ₹${cashReceived.toFixed(1)} - Cost ₹${costBasis.toFixed(1)})`;
    } else {
      formulaEl.textContent = `(Cost price: ₹${costBasis.toFixed(1)})`;
    }
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
  if (!confirm(`Are you sure you want to delete "${itemName}" from stock?`)) return;
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

  // Add Item Open Button (Name, Cost Price, Quantity only)
  document.getElementById('openAddItemBtn')?.addEventListener('click', () => {
    document.getElementById('newItemName').value = '';
    const buyInput = document.getElementById('newItemBuyPrice');
    if (buyInput) buyInput.value = '';
    document.getElementById('newItemQuantity').value = '';
    const ownerSelect = document.getElementById('newItemOwnerSelect');
    if (ownerSelect && state.activeUser) {
      ownerSelect.value = state.activeUser.name;
    }
    const badge = document.getElementById('addItemOwnerBadge');
    if (badge && state.activeUser) {
      badge.textContent = `Adding to: ${state.activeUser.avatar} ${state.activeUser.name}'s Stock`;
    }
    openModal('addItemModal');
  });

  // Search & Category Filters (Instant Live Filtering Across 3 Partner Cards)
  document.getElementById('inventorySearch')?.addEventListener('input', () => {
    renderItemsGrid();
  });
  document.getElementById('categoryFilter')?.addEventListener('change', () => {
    renderItemsGrid();
  });

  // Modals Close
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => closeAllModals());
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Form: Add Custom Item (Only Name, Cost Price, Quantity & Partner)
  document.getElementById('addItemForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newItemName').value.trim();
    const buyPrice = parseFloat(document.getElementById('newItemBuyPrice')?.value || 0);
    const quantity = parseInt(document.getElementById('newItemQuantity').value, 10);

    const ownerSelect = document.getElementById('newItemOwnerSelect');
    const owner_name = (ownerSelect ? ownerSelect.value : (state.activeUser ? state.activeUser.name : 'Aryan')) || 'Aryan';
    const owner_id = state.users.find(u => u.name.toLowerCase() === owner_name.toLowerCase())?.id || 1;

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
          sell_price: buyPrice,
          notes: `${owner_name}'s stock`,
          low_stock_threshold: 3
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item');

      closeAllModals();
      showToast(`🎉 "${name}" (${quantity} pkts @ Cost: ₹${buyPrice}) added to ${owner_name}'s stock!`, 'success');
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#fbbf24', '#10b981', '#3b82f6']
        });
      }
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Sell Item (Sales with Custom Cash Received & Live Profit Calculation)
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
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#3b82f6', '#ec4899', '#a855f7', '#fbbf24']
        });
      }
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

  // Form: Add Expense / Store Bill
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
      showToast(`Bill Recorded: ₹${amount.toFixed(2)}`, 'success');
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Form: Shopping / Restock List
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
        showToast(`Added to Restock List: "${itemName}"`, 'info');
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
      showToast('Link copied! Share it on WhatsApp.', 'success');
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
  toast.className = `toast-notification px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
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
