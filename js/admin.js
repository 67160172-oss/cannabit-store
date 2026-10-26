/* =========================================================
   ใบเขียว Admin Portal Application Logic
   Interactive Dashboard, Product & Inventory, Orders, Users, Articles
   ========================================================= */

// Global State
let currentTab = 'overview';
let activeFilters = {
  productSearch: '',
  productCategory: 'all',
  productStrain: 'all',
  productStock: 'all',
  orderStatus: 'all',
  orderSearch: ''
};

// Utilities & Formatting
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const thDate = d => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
const thDateTime = d => new Date(d).toLocaleString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const CAT_LABELS = { flower: 'ช่อดอก', oil: 'น้ำมันสกัด', edible: 'อาหาร/ขนม', accessory: 'อุปกรณ์' };
const STRAIN_LABELS = { indica: 'Indica', sativa: 'Sativa', hybrid: 'Hybrid' };
const TOPIC_LABELS = { strains: 'สายพันธุ์', compounds: 'สาร THC/CBD', safety: 'ความปลอดภัย', law: 'กฎหมาย' };
const STATUS_LABELS = { Pending: 'รอดำเนินการ', Paid: 'ชำระแล้ว', Shipped: 'จัดส่งแล้ว', Cancelled: 'ยกเลิก' };

const tintOf = p => ({ indica: '#6A4F8C', sativa: '#7C8B23', hybrid: '#2F7A5E' }[p.strain_type] || '#4A6B5D');

function artSvg(p) {
  const c = tintOf(p);
  let g = '';
  if (p.category === 'flower') {
    const L = [18, 26, 32, 38, 32, 26, 18];
    g = `<g transform="translate(60,86)" fill="${c}"><rect x="-1.6" y="0" width="3.2" height="20" rx="1.6"/>${[-78, -52, -26, 0, 26, 52, 78].map((a, i) => `<ellipse cx="0" cy="${-L[i]}" rx="6.5" ry="${L[i]}" transform="rotate(${a})"/>`).join('')}</g>`;
  } else if (p.category === 'oil') {
    g = `<g fill="${c}"><rect x="53" y="10" width="14" height="14" rx="7"/><rect x="47" y="22" width="26" height="10" rx="3"/><rect x="40" y="32" width="40" height="64" rx="9"/><rect x="47" y="52" width="26" height="24" rx="3" fill="#ffffff" opacity=".35"/></g>`;
  } else if (p.category === 'edible') {
    g = `<circle cx="60" cy="60" r="36" fill="${c}"/><g fill="#ffffff" opacity=".4"><circle cx="48" cy="48" r="4"/><circle cx="70" cy="52" r="3.5"/><circle cx="56" cy="70" r="4.5"/><circle cx="74" cy="72" r="3"/><circle cx="44" cy="66" r="3"/></g>`;
  } else {
    g = `<g fill="${c}"><rect x="28" y="30" width="64" height="18" rx="6"/><rect x="28" y="52" width="64" height="18" rx="4" opacity=".8"/><rect x="28" y="74" width="64" height="18" rx="6" opacity=".65"/></g>`;
  }
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${g}</svg>`;
}

const renderProductThumb = p => p.cover_image_url && p.cover_image_url.startsWith('data:image/')
  ? `<img src="${p.cover_image_url}" alt="${esc(p.name)}">`
  : artSvg(p);

function getAge(d) {
  const b = new Date(d);
  if (isNaN(b)) return -1;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = $('#adminToast');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    <span>${esc(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// Current User Session
const getCurrentUser = () => {
  const id = load(SESSION_KEY);
  return db?.users?.find(u => u.id === id) || null;
};

// Modal helpers
function openModal(title, contentHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = contentHtml;
  const dlg = $('#adminModal');
  if (!dlg.open) dlg.showModal();
}

function closeModal() {
  const dlg = $('#adminModal');
  if (dlg && dlg.open) dlg.close();
}

// Check & Update User Status in Topbar & Sidebar
function updateAuthUI() {
  const u = getCurrentUser();
  const banner = $('#authBanner');
  const userCard = $('#adminUserCard');

  if (!u || u.role !== 'admin') {
    if (banner) banner.style.display = 'flex';
    if (userCard) {
      userCard.innerHTML = `
        <div class="user-avatar" style="background:var(--accent-gold-soft);color:var(--accent-gold)">?</div>
        <div class="user-meta">
          <div class="user-name">ยังไม่ได้ล็อกอิน Admin</div>
          <div class="user-sub">โหมดผู้เยี่ยมชม</div>
        </div>
        <button class="btn btn-primary btn-sm" id="cardLoginBtn" style="padding:4px 8px;font-size:0.75rem">ล็อกอิน</button>
      `;
      $('#cardLoginBtn')?.addEventListener('click', quickAdminLogin);
    }
  } else {
    if (banner) banner.style.display = 'none';
    if (userCard) {
      userCard.innerHTML = `
        <div class="user-avatar">${esc(u.name.slice(0, 1))}</div>
        <div class="user-meta">
          <div class="user-name">${esc(u.name)}</div>
          <div class="user-sub">${esc(u.email)}</div>
        </div>
        <button class="btn-logout" id="logoutBtn" title="ออกจากระบบ" aria-label="ออกจากระบบ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      `;
      $('#logoutBtn')?.addEventListener('click', handleLogout);
    }
  }

  // Update Badge Counts
  const pendingOrders = db.orders.filter(o => o.status === 'Pending').length;
  $('#productCountBadge').textContent = db.products.length;
  $('#pendingOrderBadge').textContent = pendingOrders;
  $('#userCountBadge').textContent = db.users.length;
}

function quickAdminLogin() {
  const adminUser = db.users.find(u => u.role === 'admin') || db.users[0];
  if (adminUser) {
    store(SESSION_KEY, adminUser.id);
    showToast(`เข้าสู่ระบบในฐานะ ${adminUser.name} สำเร็จ`);
    updateAuthUI();
    renderCurrentTab();
  }
}

function handleLogout() {
  drop(SESSION_KEY);
  showToast('ออกจากระบบเรียบร้อย');
  updateAuthUI();
  renderCurrentTab();
}

/* =========================================================
   1. OVERVIEW TAB (Dashboard & Analytics)
   ========================================================= */
function renderOverviewTab() {
  const validOrders = db.orders.filter(o => o.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrdersCount = db.orders.length;
  const pendingCount = db.orders.filter(o => o.status === 'Pending').length;
  const lowStockProducts = db.products.filter(p => p.stock_quantity < 3);
  const totalUsersCount = db.users.length;
  const recentOrders = [...db.orders].sort((a, b) => b.id - a.id).slice(0, 5);

  // Category sales breakdown
  const catSales = { flower: 0, oil: 0, edible: 0, accessory: 0 };
  validOrders.forEach(o => {
    const items = db.order_items.filter(i => i.order_id === o.id);
    items.forEach(i => {
      const p = db.products.find(x => x.id === i.product_id);
      if (p && catSales[p.category] !== undefined) {
        catSales[p.category] += (i.price * i.quantity);
      }
    });
  });

  const maxCatSale = Math.max(1, ...Object.values(catSales));

  return `
    <!-- Top KPI Stat Cards -->
    <div class="stat-cards-grid">
      <div class="stat-card" style="--card-accent: var(--primary);">
        <div class="stat-card-header">
          <span class="stat-title">ยอดขายสุทธิ</span>
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="stat-value">${baht(totalRevenue)}</div>
        <div class="stat-footer">
          <span class="stat-tag positive">+100%</span>
          <span>ไม่รวมคำสั่งซื้อที่ยกเลิก</span>
        </div>
      </div>

      <div class="stat-card" style="--card-accent: var(--info);">
        <div class="stat-card-header">
          <span class="stat-title">คำสั่งซื้อทั้งหมด</span>
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          </div>
        </div>
        <div class="stat-value">${totalOrdersCount} <small style="font-size:1rem;font-weight:400;color:var(--text-muted)">รายการ</small></div>
        <div class="stat-footer">
          <span class="stat-tag ${pendingCount ? 'warning' : 'positive'}">รอดำเนินการ ${pendingCount}</span>
          <span>ที่ต้องตรวจสอบและส่ง</span>
        </div>
      </div>

      <div class="stat-card" style="--card-accent: var(--danger);">
        <div class="stat-card-header">
          <span class="stat-title">สินค้าสต็อกต่ำ / หมด</span>
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        </div>
        <div class="stat-value" style="color:${lowStockProducts.length ? 'var(--danger)' : 'var(--text-main)'}">
          ${lowStockProducts.length} <small style="font-size:1rem;font-weight:400;color:var(--text-muted)">รายการ</small>
        </div>
        <div class="stat-footer">
          <span class="stat-tag ${lowStockProducts.length ? 'danger' : 'positive'}">${lowStockProducts.length ? 'ต้องเติมด่วน' : 'สต็อกพร้อม'}</span>
          <span>สต็อกน้อยกว่า 3 ชิ้น</span>
        </div>
      </div>

      <div class="stat-card" style="--card-accent: var(--accent-gold);">
        <div class="stat-card-header">
          <span class="stat-title">สมาชิกและลูกค้า</span>
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
        </div>
        <div class="stat-value">${totalUsersCount} <small style="font-size:1rem;font-weight:400;color:var(--text-muted)">คน</small></div>
        <div class="stat-footer">
          <span class="stat-tag positive">ผ่านการตรวจอายุ 20+</span>
          <span>ในระบบ LocalStorage</span>
        </div>
      </div>
    </div>

    <!-- Charts & Visual Analytics -->
    <div class="dashboard-grid-2">
      <!-- Sales Chart -->
      <div class="card-panel">
        <div class="card-panel-header">
          <div class="card-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>ยอดจำหน่ายแยกตามประเภทสินค้า</span>
          </div>
          <span style="font-size:0.8rem;color:var(--text-muted)">คำนวณจากยอดคำสั่งซื้อจริง</span>
        </div>

        <div class="category-bars">
          ${Object.entries(catSales).map(([cat, amount]) => {
            const pct = Math.round((amount / maxCatSale) * 100);
            return `
              <div class="cat-bar-item">
                <div class="cat-bar-header">
                  <span>${CAT_LABELS[cat] || cat}</span>
                  <span>${baht(amount)}</span>
                </div>
                <div class="cat-progress-track">
                  <div class="cat-progress-fill" style="width:${pct}%;background:${cat === 'flower' ? 'var(--primary)' : cat === 'oil' ? 'var(--accent-gold)' : cat === 'edible' ? '#B092D8' : '#38BDF8'}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Quick Low Stock Alert Panel -->
      <div class="card-panel">
        <div class="card-panel-header">
          <div class="card-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>แจ้งเตือนคลังสินค้า</span>
          </div>
          <button class="btn btn-primary-outline btn-sm" onclick="switchTab('products')">ไปที่คลังสต็อก</button>
        </div>

        ${lowStockProducts.length ? `
          <div style="display:flex;flex-direction:column;gap:10px">
            ${lowStockProducts.map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-surface-elevated);border-radius:var(--radius-md);border:1px solid var(--danger-soft)">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:var(--bg-surface);display:flex;align-items:center;justify-content:center;overflow:hidden">
                    ${renderProductThumb(p)}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:0.88rem">${esc(p.name)}</div>
                    <div style="font-size:0.75rem;color:var(--danger)">เหลือเพียง ${p.stock_quantity} ชิ้น</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-primary-outline btn-sm" onclick="quickRestock(${p.id}, 10)">+10 ชิ้น</button>
                  <button class="btn btn-secondary btn-sm" onclick="openProductModal(${p.id})">แก้ไข</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align:center;padding:36px 16px;color:var(--text-muted)">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" style="margin-bottom:8px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p style="font-weight:600;color:var(--text-main)">สต็อกสินค้าอยู่ในเกณฑ์ดี</p>
            <p style="font-size:0.82rem">ไม่มีสินค้าใดที่สต็อกต่ำกว่า 3 ชิ้น</p>
          </div>
        `}
      </div>
    </div>

    <!-- Recent Orders Section -->
    <div class="card-panel">
      <div class="card-panel-header">
        <div class="card-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
          <span>คำสั่งซื้อล่าสุด (5 รายการ)</span>
        </div>
        <button class="btn btn-primary-outline btn-sm" onclick="switchTab('orders')">ดูคำสั่งซื้อทั้งหมด</button>
      </div>

      ${recentOrders.length ? renderOrdersTable(recentOrders) : `
        <div style="text-align:center;padding:40px;color:var(--text-muted);border:1px dashed var(--border-subtle);border-radius:var(--radius-md)">
          <p style="margin-bottom:12px">ยังไม่มีคำสั่งซื้อในระบบ</p>
          <button class="btn btn-primary btn-sm" onclick="generateSampleOrders()">สร้างคำสั่งซื้อตัวอย่าง 3 รายการเพื่อทดสอบ</button>
        </div>
      `}
    </div>
  `;
}

/* =========================================================
   2. PRODUCTS TAB (Inventory Management)
   ========================================================= */
function renderProductsTab() {
  const q = activeFilters.productSearch.trim().toLowerCase();
  const cat = activeFilters.productCategory;
  const strain = activeFilters.productStrain;
  const stock = activeFilters.productStock;

  const filtered = db.products.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || (CAT_LABELS[p.category] || '').includes(q);
    const matchCat = cat === 'all' || p.category === cat;
    const matchStrain = strain === 'all' || p.strain_type === strain;
    let matchStock = true;
    if (stock === 'low') matchStock = p.stock_quantity > 0 && p.stock_quantity < 3;
    else if (stock === 'out') matchStock = p.stock_quantity <= 0;
    else if (stock === 'instock') matchStock = p.stock_quantity >= 3;
    return matchQ && matchCat && matchStrain && matchStock;
  });

  return `
    <div class="filter-bar">
      <div class="search-input-group">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="productSearchInput" placeholder="ค้นหาชื่อสินค้า..." value="${esc(activeFilters.productSearch)}">
      </div>

      <div class="filter-selects">
        <select class="admin-select" id="productCatFilter">
          <option value="all" ${cat === 'all' ? 'selected' : ''}>หมวดหมู่ทั้งหมด</option>
          ${Object.entries(CAT_LABELS).map(([k, l]) => `<option value="${k}" ${cat === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>

        <select class="admin-select" id="productStrainFilter">
          <option value="all" ${strain === 'all' ? 'selected' : ''}>สายพันธุ์ทั้งหมด</option>
          ${Object.entries(STRAIN_LABELS).map(([k, l]) => `<option value="${k}" ${strain === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>

        <select class="admin-select" id="productStockFilter">
          <option value="all" ${stock === 'all' ? 'selected' : ''}>สถานะสต็อกทั้งหมด</option>
          <option value="instock" ${stock === 'instock' ? 'selected' : ''}>พร้อมขาย (>= 3)</option>
          <option value="low" ${stock === 'low' ? 'selected' : ''}>สต็อกต่ำ (< 3)</option>
          <option value="out" ${stock === 'out' ? 'selected' : ''}>สินค้าหมด (0)</option>
        </select>

        <button class="btn btn-primary" onclick="openProductModal(0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>เพิ่มสินค้าใหม่</span>
        </button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>สินค้า</th>
            <th>หมวดหมู่</th>
            <th>สายพันธุ์</th>
            <th class="text-right">THC</th>
            <th class="text-right">CBD</th>
            <th class="text-right">ราคา</th>
            <th>คงเหลือ (ชิ้น)</th>
            <th>สถานะ</th>
            <th class="text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(p => {
            const isLow = p.stock_quantity < 3 && p.stock_quantity > 0;
            const isOut = p.stock_quantity <= 0;
            return `
              <tr class="${isOut ? 'row-danger' : isLow ? 'row-warning' : ''}">
                <td>
                  <div class="product-cell">
                    <div class="product-thumb">
                      ${renderProductThumb(p)}
                    </div>
                    <div class="product-name-wrap">
                      <b>${esc(p.name)}</b>
                      <small>${esc(p.unit_size)}</small>
                    </div>
                  </div>
                </td>
                <td><span class="pill pill-category">${CAT_LABELS[p.category] || p.category}</span></td>
                <td>
                  ${p.strain_type ? `<span class="pill pill-strain-${p.strain_type}">${STRAIN_LABELS[p.strain_type]}</span>` : '<span style="color:var(--text-dim)">-</span>'}
                </td>
                <td class="text-right font-numeric">${p.thc_percent != null ? `${p.thc_percent}%` : '-'}</td>
                <td class="text-right font-numeric">${p.cbd_percent != null ? `${p.cbd_percent}%` : '-'}</td>
                <td class="text-right font-numeric" style="font-weight:600">${baht(p.price)}</td>
                <td>
                  <div class="stock-adjuster">
                    <button onclick="quickStockChange(${p.id}, -1)" title="ลด 1 ชิ้น">−</button>
                    <span>${p.stock_quantity}</span>
                    <button onclick="quickStockChange(${p.id}, 1)" title="เพิ่ม 1 ชิ้น">+</button>
                  </div>
                </td>
                <td>
                  ${isOut ? '<span class="pill pill-stock-out">หมด</span>' : isLow ? `<span class="pill pill-stock-low">ต่ำ (${p.stock_quantity})</span>` : '<span class="pill pill-stock-ok">พร้อมขาย</span>'}
                </td>
                <td class="text-right">
                  <div style="display:inline-flex;gap:6px">
                    <button class="btn-icon-sm" onclick="openProductModal(${p.id})" title="แก้ไขสินค้า">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon-sm" onclick="confirmDeleteProduct(${p.id})" title="ลบสินค้า" style="color:var(--danger)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') : `
            <tr>
              <td colspan="9" style="text-align:center;padding:36px;color:var(--text-muted)">
                ไม่พบสินค้าที่ตรงกับเงื่อนไขการค้นหา
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

// Quick Inline Restock
function quickStockChange(productId, delta) {
  const p = db.products.find(x => x.id === productId);
  if (!p) return;
  const newQty = Math.max(0, p.stock_quantity + delta);
  p.stock_quantity = newQty;
  save();
  showToast(`อัปเดตสต็อก ${p.name}: ${newQty} ชิ้น`);
  renderCurrentTab();
  updateAuthUI();
}

function quickRestock(productId, amount) {
  quickStockChange(productId, amount);
}

// Product Form Modal (Add / Edit)
function openProductModal(productId = 0) {
  const p = db.products.find(x => x.id === productId) || {
    name: '',
    category: 'flower',
    strain_type: 'hybrid',
    thc_percent: '',
    cbd_percent: '',
    unit_size: '1 กรัม',
    price: 350,
    stock_quantity: 10,
    cover_image_url: ''
  };

  const isEdit = Boolean(productId);
  const title = isEdit ? `แก้ไขสินค้า #${productId}` : 'เพิ่มสินค้าใหม่';

  const html = `
    <form class="admin-form" id="productForm" onsubmit="handleProductSubmit(event, ${productId})">
      <div class="form-group">
        <label for="pName">ชื่อสินค้า *</label>
        <input type="text" id="pName" required value="${esc(p.name)}" placeholder="เช่น Super Lemon Haze">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="pCategory">หมวดหมู่สินค้า *</label>
          <select id="pCategory">
            ${Object.entries(CAT_LABELS).map(([k, l]) => `<option value="${k}" ${p.category === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="pStrain">สายพันธุ์ (ถ้ามี)</label>
          <select id="pStrain">
            <option value="" ${!p.strain_type ? 'selected' : ''}>ไม่ระบุ (เช่น อุปกรณ์)</option>
            ${Object.entries(STRAIN_LABELS).map(([k, l]) => `<option value="${k}" ${p.strain_type === k ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="pThc">THC (%)</label>
          <input type="number" id="pThc" step="0.01" min="0" max="100" value="${p.thc_percent ?? ''}" placeholder="เช่น 20.5">
          <span class="form-hint">เว้นว่างได้หากเป็นอุปกรณ์</span>
        </div>
        <div class="form-group">
          <label for="pCbd">CBD (%)</label>
          <input type="number" id="pCbd" step="0.01" min="0" max="100" value="${p.cbd_percent ?? ''}" placeholder="เช่น 0.5">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="pUnit">ขนาดบรรจุ / หน่วย *</label>
          <input type="text" id="pUnit" required value="${esc(p.unit_size)}" placeholder="เช่น 1 กรัม หรือ 10 มล.">
        </div>
        <div class="form-group">
          <label for="pPrice">ราคาขาย (บาท) *</label>
          <input type="number" id="pPrice" required min="0" step="1" value="${p.price}">
        </div>
      </div>

      <div class="form-group">
        <label for="pStock">จำนวนสต็อกตั้งต้น *</label>
        <input type="number" id="pStock" required min="0" step="1" value="${p.stock_quantity}">
      </div>

      <div class="form-group">
        <label>รูปภาพปกสินค้า (ไม่บังคับ)</label>
        <input type="file" id="pImageInput" accept="image/*" onchange="previewImageUpload(this)">
        <input type="hidden" id="pImageUrl" value="${esc(p.cover_image_url || '')}">
        <div class="image-preview-box" id="imagePreviewBox" style="margin-top:8px">
          ${p.cover_image_url ? `<img src="${p.cover_image_url}" alt="Preview">` : '<span style="color:var(--text-dim);font-size:0.85rem">ระบบจะใช้ SVG Art อัตโนมัติหากไม่มีรูปถ่าย</span>'}
        </div>
        ${p.cover_image_url ? `<button type="button" class="btn btn-secondary btn-sm" style="margin-top:6px;width:fit-content" onclick="clearProductImage()">ลบรูปภาพ</button>` : ''}
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้าลงระบบ'}</button>
      </div>
    </form>
  `;

  openModal(title, html);
}

function previewImageUpload(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);

        $('#pImageUrl').value = base64;
        $('#imagePreviewBox').innerHTML = `<img src="${base64}" alt="Uploaded Preview">`;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function clearProductImage() {
  $('#pImageUrl').value = '';
  $('#imagePreviewBox').innerHTML = '<span style="color:var(--text-dim);font-size:0.85rem">ใช้ภาพประกอบอัตโนมัติ</span>';
}

function handleProductSubmit(e, productId) {
  e.preventDefault();
  const name = $('#pName').value.trim();
  const category = $('#pCategory').value;
  const strain_type = $('#pStrain').value;
  const thc_percent = $('#pThc').value === '' ? null : Number($('#pThc').value);
  const cbd_percent = $('#pCbd').value === '' ? null : Number($('#pCbd').value);
  const unit_size = $('#pUnit').value.trim();
  const price = Number($('#pPrice').value);
  const stock_quantity = parseInt($('#pStock').value, 10);
  const cover_image_url = $('#pImageUrl').value;

  if (!name || !unit_size) {
    showToast('กรุณากรอกชื่อสินค้าและขนาดบรรจุ', 'error');
    return;
  }

  if (productId) {
    const existing = db.products.find(x => x.id === productId);
    if (existing) {
      Object.assign(existing, { name, category, strain_type, thc_percent, cbd_percent, unit_size, price, stock_quantity, cover_image_url });
      showToast(`แก้ไขข้อมูล ${name} สำเร็จ`);
    }
  } else {
    const newId = nextId('products');
    db.products.push({ id: newId, name, category, strain_type, thc_percent, cbd_percent, unit_size, price, stock_quantity, cover_image_url });
    showToast(`เพิ่มสินค้าใหม่ ${name} เรียบร้อยแล้ว`);
  }

  save();
  closeModal();
  renderCurrentTab();
  updateAuthUI();
}

function confirmDeleteProduct(id) {
  const p = db.products.find(x => x.id === id);
  if (!p) return;

  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <p>คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า <b>${esc(p.name)}</b> ออกจากร้านค้า?</p>
      <p style="font-size:0.85rem;color:var(--text-muted)">คำสั่งซื้อเดิมที่เคยมีสินค้านี้จะไม่หายไป แต่จะแสดงเป็น "(สินค้าถูกลบ)"</p>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
        <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button class="btn btn-danger" onclick="deleteProduct(${p.id})">ยืนยันการลบ</button>
      </div>
    </div>
  `;
  openModal('ยืนยันการลบสินค้า', html);
}

function deleteProduct(id) {
  db.products = db.products.filter(x => x.id !== id);
  save();
  closeModal();
  showToast('ลบสินค้าออกจากระบบแล้ว');
  renderCurrentTab();
  updateAuthUI();
}

/* =========================================================
   3. ORDERS TAB (Orders, Status, Receipt & Shipping)
   ========================================================= */
function renderOrdersTab() {
  const q = activeFilters.orderSearch.trim().toLowerCase();
  const st = activeFilters.orderStatus;

  const filtered = db.orders.filter(o => {
    const user = db.users.find(u => u.id === o.user_id);
    const matchStatus = st === 'all' || o.status === st;
    const matchSearch = !q || String(o.id).includes(q) || (user?.name || '').toLowerCase().includes(q) || o.shipping_address.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }).sort((a, b) => b.id - a.id);

  return `
    <div class="filter-bar">
      <div class="search-input-group">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="orderSearchInput" placeholder="ค้นหาเลขออเดอร์, ชื่อลูกค้า, หรือที่อยู่..." value="${esc(activeFilters.orderSearch)}">
      </div>

      <div class="filter-selects">
        <select class="admin-select" id="orderStatusFilter">
          <option value="all" ${st === 'all' ? 'selected' : ''}>สถานะทั้งหมด (${db.orders.length})</option>
          <option value="Pending" ${st === 'Pending' ? 'selected' : ''}>รอดำเนินการ (${db.orders.filter(o => o.status === 'Pending').length})</option>
          <option value="Paid" ${st === 'Paid' ? 'selected' : ''}>ชำระแล้ว (${db.orders.filter(o => o.status === 'Paid').length})</option>
          <option value="Shipped" ${st === 'Shipped' ? 'selected' : ''}>จัดส่งแล้ว (${db.orders.filter(o => o.status === 'Shipped').length})</option>
          <option value="Cancelled" ${st === 'Cancelled' ? 'selected' : ''}>ยกเลิกแล้ว (${db.orders.filter(o => o.status === 'Cancelled').length})</option>
        </select>

        <button class="btn btn-secondary" onclick="generateSampleOrders()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <span>สร้างออเดอร์จำลอง</span>
        </button>
      </div>
    </div>

    ${filtered.length ? renderOrdersTable(filtered) : `
      <div class="card-panel" style="text-align:center;padding:48px 20px">
        <p style="font-size:1.1rem;color:var(--text-muted);margin-bottom:12px">ไม่พบรายการคำสั่งซื้อที่ค้นหา</p>
        <button class="btn btn-primary btn-sm" onclick="generateSampleOrders()">สร้างคำสั่งซื้อตัวอย่าง 3 รายการเพื่อทดสอบ</button>
      </div>
    `}
  `;
}

function renderOrdersTable(orderList) {
  return `
    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>เลขออเดอร์</th>
            <th>ลูกค้าและที่อยู่จัดส่ง</th>
            <th>วัน-เวลาที่สั่ง</th>
            <th>รายการสินค้า</th>
            <th class="text-right">ยอดรวม</th>
            <th>สถานะคำสั่งซื้อ</th>
            <th class="text-right">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${orderList.map(o => {
            const customer = db.users.find(u => u.id === o.user_id);
            const items = db.order_items.filter(i => i.order_id === o.id);
            const itemsSummary = items.map(i => {
              const p = db.products.find(x => x.id === i.product_id);
              return `${esc(p ? p.name : '(สินค้าถูกลบ)')} × ${i.quantity}`;
            }).join('<br>');

            return `
              <tr>
                <td style="font-family:var(--font-numeric);font-weight:700">#${o.id}</td>
                <td>
                  <div style="font-weight:600">${esc(customer?.name || 'ลูกค้าทั่วไป')}</div>
                  <small style="color:var(--text-muted);white-space:pre-line">${esc(o.shipping_address)}</small>
                </td>
                <td style="white-space:nowrap;font-size:0.84rem;color:var(--text-muted)">
                  ${thDateTime(o.created_at)}
                </td>
                <td style="font-size:0.84rem">${itemsSummary}</td>
                <td class="text-right font-numeric" style="font-weight:700;font-size:0.95rem">${baht(o.total_amount)}</td>
                <td>
                  ${o.status === 'Cancelled' ? `
                    <span class="pill pill-status-cancelled">ยกเลิกแล้ว (คืนสต็อกแล้ว)</span>
                  ` : `
                    <select class="admin-select" style="padding:4px 8px;font-size:0.8rem" onchange="updateOrderStatus(${o.id}, this.value)">
                      <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>รอดำเนินการ</option>
                      <option value="Paid" ${o.status === 'Paid' ? 'selected' : ''}>ชำระแล้ว</option>
                      <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>จัดส่งแล้ว</option>
                      <option value="Cancelled">ยกเลิกออเดอร์</option>
                    </select>
                  `}
                </td>
                <td class="text-right">
                  <button class="btn btn-primary-outline btn-sm" onclick="viewOrderReceipt(${o.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>ใบเสร็จ / ใบส่งของ</span>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateOrderStatus(orderId, newStatus) {
  const o = db.orders.find(x => x.id === orderId);
  if (!o || o.status === 'Cancelled') return;

  if (newStatus === 'Cancelled') {
    const html = `
      <div style="display:flex;flex-direction:column;gap:14px">
        <p>ยืนยันการยกเลิกคำสั่งซื้อ <b>#${orderId}</b> หรือไม่?</p>
        <p style="font-size:0.85rem;color:var(--danger)">ระบบจะทำการคืนสต็อกสินค้าทั้งหมดในคำสั่งซื้อนี้กลับเข้าสู่คลังโดยอัตโนมัติ และจะไม่สามารถเปลี่ยนสถานะกลับได้</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
          <button class="btn btn-secondary" onclick="closeModal()">ไม่ยกเลิก</button>
          <button class="btn btn-danger" onclick="executeCancelOrder(${orderId})">ยืนยันยกเลิกและคืนสต็อก</button>
        </div>
      </div>
    `;
    openModal('ยืนยันยกเลิกคำสั่งซื้อ', html);
    return;
  }

  o.status = newStatus;
  save();
  showToast(`อัปเดตคำสั่งซื้อ #${orderId} เป็น "${STATUS_LABELS[newStatus]}"`);
  renderCurrentTab();
  updateAuthUI();
}

function executeCancelOrder(orderId) {
  const o = db.orders.find(x => x.id === orderId);
  if (!o) return;

  // Restore inventory
  const items = db.order_items.filter(i => i.order_id === orderId);
  items.forEach(item => {
    const p = db.products.find(x => x.id === item.product_id);
    if (p) p.stock_quantity += item.quantity;
  });

  o.status = 'Cancelled';
  save();
  closeModal();
  showToast(`ยกเลิกคำสั่งซื้อ #${orderId} และคืนสต็อกสินค้าเรียบร้อย`);
  renderCurrentTab();
  updateAuthUI();
}

// Printable Invoice / Shipping Label Modal
function viewOrderReceipt(orderId) {
  const o = db.orders.find(x => x.id === orderId);
  if (!o) return;
  const customer = db.users.find(u => u.id === o.user_id);
  const items = db.order_items.filter(i => i.order_id === o.id);

  const html = `
    <div class="invoice-container" id="printableInvoice">
      <div class="invoice-header">
        <div class="invoice-brand">
          <h2>ใบเขียว: ร้านกัญชาและคลังความรู้</h2>
          <p style="font-size:0.8rem;color:#4B5563">ระบบต้นแบบร้านค้าเพื่อการศึกษา (จำลองข้อมูล)</p>
        </div>
        <div class="invoice-meta">
          <h3 style="font-size:1.15rem;color:#111827">ใบเสร็จรับเงิน / ใบจัดส่ง</h3>
          <p><b>เลขที่:</b> #${o.id}</p>
          <p><b>วันที่:</b> ${thDateTime(o.created_at)}</p>
          <p><b>สถานะ:</b> ${STATUS_LABELS[o.status] || o.status}</p>
        </div>
      </div>

      <div class="invoice-details-grid">
        <div>
          <b style="color:#064E3B;display:block;margin-bottom:4px">ข้อมูลผู้รับสินค้า:</b>
          <p><b>ชื่อ:</b> ${esc(customer?.name || 'ลูกค้าทั่วไป')}</p>
          <p><b>อีเมล:</b> ${esc(customer?.email || '-')}</p>
          <p><b>ที่อยู่จัดส่ง:</b><br><span style="white-space:pre-line">${esc(o.shipping_address)}</span></p>
        </div>
        <div>
          <b style="color:#064E3B;display:block;margin-bottom:4px">ข้อมูลร้านค้าผู้จัดส่ง:</b>
          <p>ร้านใบเขียว (Cannabis Dispensary)</p>
          <p>ระบบต้นแบบเพื่อการศึกษา</p>
          <p>จัดทำโดย นาย พชรพล พรหมมา 67160172</p>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รายการสินค้า</th>
            <th style="text-align:right">ราคาต่อหน่วย</th>
            <th style="text-align:center">จำนวน</th>
            <th style="text-align:right">รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => {
            const p = db.products.find(x => x.id === item.product_id);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td><b>${esc(p ? p.name : '(สินค้าถูกลบ)')}</b> ${p ? `<small style="color:#6B7280">(${esc(p.unit_size)})</small>` : ''}</td>
                <td style="text-align:right">${baht(item.price)}</td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right"><b>${baht(item.price * item.quantity)}</b></td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr class="invoice-total-row">
            <td colspan="4" style="text-align:right;padding-top:14px">ยอดรวมทั้งสิ้น:</td>
            <td style="text-align:right;padding-top:14px">${baht(o.total_amount)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size:0.78rem;color:#6B7280;border-top:1px dashed #D1D5DB;padding-top:12px;margin-top:16px">
        * หมายเหตุ: เอกสารนี้เป็นเอกสารจำลองเพื่อการศึกษา ไม่มีการจำหน่ายหรือจัดส่งสินค้าจริง
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px" class="no-print">
      <button class="btn btn-secondary" onclick="closeModal()">ปิดหน้าต่าง</button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>พิมพ์ใบเสร็จ / ใบปะหน้ากล่อง</span>
      </button>
    </div>
  `;

  openModal(`รายละเอียดคำสั่งซื้อ #${orderId}`, html);
}

/* =========================================================
   4. CUSTOMERS TAB (Users, Age Verification, Roles)
   ========================================================= */
function renderCustomersTab() {
  return `
    <div class="card-panel" style="margin-bottom:20px">
      <div class="card-panel-header">
        <div class="card-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <span>สมาชิกและลูกค้าในระบบ (${db.users.length} คน)</span>
        </div>
        <span style="font-size:0.82rem;color:var(--text-muted)">สมาชิกทุกคนต้องผ่านการตรวจสอบอายุ 20 ปีขึ้นไปตามเกณฑ์กฎหมาย</span>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>รหัสผู้ใช้</th>
              <th>ชื่อ-นามสกุล</th>
              <th>อีเมล</th>
              <th>บทบาท (Role)</th>
              <th>อายุ / วันเกิด</th>
              <th>สถานะอายุ 20+</th>
              <th>ที่อยู่จัดส่ง</th>
              <th class="text-right">จำนวนออเดอร์</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${db.users.map(u => {
              const age = getAge(u.date_of_birth);
              const userOrders = db.orders.filter(o => o.user_id === u.id);
              const totalSpent = userOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total_amount, 0);

              return `
                <tr>
                  <td style="font-family:var(--font-numeric);font-weight:600">USR-${u.id}</td>
                  <td><b>${esc(u.name)}</b></td>
                  <td>${esc(u.email)}</td>
                  <td>
                    ${u.role === 'admin'
                      ? '<span class="pill" style="background:var(--primary-soft);color:var(--primary)">ผู้ดูแลระบบ (Admin)</span>'
                      : '<span class="pill" style="background:var(--bg-surface-elevated);color:var(--text-muted)">ลูกค้าทั่วไป</span>'}
                  </td>
                  <td>
                    <b>${age >= 0 ? `${age} ปี` : '-'}</b>
                    <br><small style="color:var(--text-dim)">${esc(u.date_of_birth || '-')}</small>
                  </td>
                  <td>
                    ${age >= 20 || u.age_verified
                      ? '<span class="pill pill-stock-ok">ยืนยันแล้ว (>= 20)</span>'
                      : '<span class="pill pill-stock-low">ไม่ผ่านเกณฑ์</span>'}
                  </td>
                  <td><small style="color:var(--text-muted);white-space:pre-line">${esc(u.address || 'ยังไม่ระบุ')}</small></td>
                  <td class="text-right font-numeric">
                    <b>${userOrders.length}</b> ออเดอร์
                    <br><small style="color:var(--text-muted)">(${baht(totalSpent)})</small>
                  </td>
                  <td class="text-right">
                    ${u.role !== 'admin' ? `
                      <button class="btn btn-secondary btn-sm" onclick="toggleUserRole(${u.id}, 'admin')">ตั้งเป็นแอดมิน</button>
                    ` : `
                      <button class="btn btn-secondary btn-sm" onclick="toggleUserRole(${u.id}, 'customer')">ปลดสิทธิ์</button>
                    `}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function toggleUserRole(userId, newRole) {
  const u = db.users.find(x => x.id === userId);
  if (!u) return;
  u.role = newRole;
  save();
  showToast(`ปรับสิทธิ์ ${u.name} เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ลูกค้าทั่วไป'} เรียบร้อย`);
  renderCurrentTab();
  updateAuthUI();
}

/* =========================================================
   5. ARTICLES TAB (Knowledge CMS)
   ========================================================= */
function renderArticlesTab() {
  return `
    <div class="card-panel">
      <div class="card-panel-header">
        <div class="card-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>คลังความรู้และบทความวิชาการ (${db.articles.length} เรื่อง)</span>
        </div>
        <button class="btn btn-primary" onclick="openArticleModal(0)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>เขียนบทความใหม่</span>
        </button>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>หัวข้อบทความ</th>
              <th>หมวดหมู่ความรู้</th>
              <th>วันที่เผยแพร่</th>
              <th>ตัวอย่างเนื้อหา</th>
              <th class="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            ${db.articles.map(a => `
              <tr>
                <td><b>${esc(a.title)}</b></td>
                <td><span class="pill" style="background:var(--accent-gold-soft);color:var(--accent-gold)">${TOPIC_LABELS[a.topic] || a.topic}</span></td>
                <td style="font-size:0.84rem;color:var(--text-muted);white-space:nowrap">${thDate(a.created_at)}</td>
                <td style="font-size:0.82rem;color:var(--text-dim);max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.content.slice(0, 75))}...</td>
                <td class="text-right">
                  <div style="display:inline-flex;gap:6px">
                    <button class="btn-icon-sm" onclick="openArticleModal(${a.id})" title="แก้ไขบทความ">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon-sm" onclick="confirmDeleteArticle(${a.id})" title="ลบบทความ" style="color:var(--danger)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openArticleModal(articleId = 0) {
  const a = db.articles.find(x => x.id === articleId) || {
    title: '',
    topic: 'strains',
    content: '',
    cover_image_url: ''
  };
  const isEdit = Boolean(articleId);

  const html = `
    <form class="admin-form" onsubmit="handleArticleSubmit(event, ${articleId})">
      <div class="form-group">
        <label for="aTitle">หัวข้อบทความ *</label>
        <input type="text" id="aTitle" required value="${esc(a.title)}" placeholder="เช่น ข้อควรระวังและวิธีใช้อย่างรับผิดชอบ">
      </div>

      <div class="form-group">
        <label for="aTopic">หมวดหมู่หัวข้อ *</label>
        <select id="aTopic">
          ${Object.entries(TOPIC_LABELS).map(([k, l]) => `<option value="${k}" ${a.topic === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label for="aContent">เนื้อหาบทความ (รองรับ Markdown อย่างง่าย) *</label>
        <textarea id="aContent" required style="min-height:180px">${esc(a.content)}</textarea>
        <span class="form-hint">ใส่ '## ' สำหรับหัวข้อย่อย และ '- ' สำหรับรายการสัญลักษณ์</span>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'บันทึกการแก้ไข' : 'เผยแพร่บทความ'}</button>
      </div>
    </form>
  `;

  openModal(isEdit ? 'แก้ไขบทความ' : 'เขียนบทความความรู้ใหม่', html);
}

function handleArticleSubmit(e, articleId) {
  e.preventDefault();
  const title = $('#aTitle').value.trim();
  const topic = $('#aTopic').value;
  const content = $('#aContent').value.trim();

  if (!title || !content) {
    showToast('กรุณากรอกหัวข้อและเนื้อหาบทความ', 'error');
    return;
  }

  if (articleId) {
    const existing = db.articles.find(x => x.id === articleId);
    if (existing) {
      Object.assign(existing, { title, topic, content });
      showToast(`บันทึกบทความ "${title}" เรียบร้อย`);
    }
  } else {
    const newId = nextId('articles');
    db.articles.push({ id: newId, title, topic, content, cover_image_url: '', created_at: nowISO() });
    showToast(`เผยแพร่บทความ "${title}" สำเร็จ`);
  }

  save();
  closeModal();
  renderCurrentTab();
}

function confirmDeleteArticle(articleId) {
  const a = db.articles.find(x => x.id === articleId);
  if (!a) return;

  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <p>คุณแน่ใจหรือไม่ว่าต้องการลบบทความ <b>${esc(a.title)}</b>?</p>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
        <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button class="btn btn-danger" onclick="deleteArticle(${articleId})">ลบบทความ</button>
      </div>
    </div>
  `;
  openModal('ยืนยันการลบบทความ', html);
}

function deleteArticle(articleId) {
  db.articles = db.articles.filter(x => x.id !== articleId);
  save();
  closeModal();
  showToast('ลบบทความเรียบร้อย');
  renderCurrentTab();
}

/* =========================================================
   6. SETTINGS & BACKUP TAB
   ========================================================= */
function renderSettingsTab() {
  return `
    <div class="card-panel" style="margin-bottom:24px">
      <div class="card-panel-header">
        <div class="card-panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>เครื่องมือระบบและการจัดการข้อมูล (Database Utilities)</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:18px">
        <!-- Quick Demo Orders -->
        <div style="background:var(--bg-surface-elevated);border-radius:var(--radius-md);padding:18px;border:1px solid var(--border-subtle);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <h4 style="margin-bottom:6px">สร้างคำสั่งซื้อจำลอง 3 รายการ</h4>
            <p style="font-size:0.84rem;color:var(--text-muted)">เพิ่มคำสั่งซื้อแบบสุ่มสำหรับทดสอบการทำงานของแดชบอร์ด รายได้ และการพิมพ์ใบเสร็จ</p>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px;width:fit-content" onclick="generateSampleOrders()">สร้างคำสั่งซื้อจำลอง</button>
        </div>

        <!-- Export JSON -->
        <div style="background:var(--bg-surface-elevated);border-radius:var(--radius-md);padding:18px;border:1px solid var(--border-subtle);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <h4 style="margin-bottom:6px">ส่งออกข้อมูลสำรอง (Export JSON)</h4>
            <p style="font-size:0.84rem;color:var(--text-muted)">ดาวน์โหลดฐานข้อมูลร้านค้า สินค้า สต็อก และคำสั่งซื้อทั้งหมดเป็นไฟล์ .json</p>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:14px;width:fit-content" onclick="exportDataJSON()">ส่งออกไฟล์สำรอง</button>
        </div>

        <!-- Factory Reset -->
        <div style="background:var(--bg-surface-elevated);border-radius:var(--radius-md);padding:18px;border:1px solid var(--danger-soft);display:flex;flex-direction:column;justify-content:space-between">
          <div>
            <h4 style="margin-bottom:6px;color:var(--danger)">รีเซ็ตข้อมูลทั้งหมด (Factory Reset)</h4>
            <p style="font-size:0.84rem;color:var(--text-muted)">ล้างข้อมูลที่ถูกแก้ไขทั้งหมด และคืนค่ากลับเป็นชุดข้อมูลตัวอย่างเริ่มต้น</p>
          </div>
          <button class="btn btn-danger btn-sm" style="margin-top:14px;width:fit-content" onclick="confirmResetData()">รีเซ็ตกลับค่าเริ่มต้น</button>
        </div>
      </div>
    </div>
  `;
}

function generateSampleOrders() {
  if (!db.products.length) {
    showToast('ต้องมีสินค้าในระบบก่อนสร้างออเดอร์', 'error');
    return;
  }

  const customer = db.users.find(u => u.role === 'customer') || db.users[0];
  const p1 = db.products[0];
  const p2 = db.products[1] || db.products[0];
  const p3 = db.products[2] || db.products[0];

  const now = Date.now();
  const sampleOrdersData = [
    {
      items: [{ p: p1, qty: 2 }, { p: p2, qty: 1 }],
      status: 'Paid',
      createdOffset: 3600000 * 2
    },
    {
      items: [{ p: p3, qty: 1 }],
      status: 'Pending',
      createdOffset: 3600000 * 5
    },
    {
      items: [{ p: p1, qty: 1 }, { p: p3, qty: 2 }],
      status: 'Shipped',
      createdOffset: 3600000 * 24
    }
  ];

  sampleOrdersData.forEach(s => {
    const orderId = nextId('orders');
    const total = s.items.reduce((sum, item) => sum + (item.p.price * item.qty), 0);
    const order = {
      id: orderId,
      user_id: customer.id,
      total_amount: total,
      status: s.status,
      shipping_address: customer.address || '99/1 ถ.สุขุมวิท อ.บางละมุง จ.ชลบุรี 20150',
      created_at: new Date(now - s.createdOffset).toISOString()
    };
    db.orders.push(order);

    s.items.forEach(item => {
      db.order_items.push({
        id: nextId('order_items'),
        order_id: orderId,
        product_id: item.p.id,
        quantity: item.qty,
        price: item.p.price
      });
      // Deduct stock if not cancelled
      item.p.stock_quantity = Math.max(0, item.p.stock_quantity - item.qty);
    });
  });

  save();
  showToast('สร้างคำสั่งซื้อจำลอง 3 รายการสำเร็จแล้ว');
  renderCurrentTab();
  updateAuthUI();
}

function exportDataJSON() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `cannabis_store_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('ดาวน์โหลดไฟล์ข้อมูลสำรองสำเร็จ');
}

function confirmResetData() {
  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <p>คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดเริ่มต้น?</p>
      <p style="color:var(--danger);font-size:0.85rem">ข้อมูลคำสั่งซื้อ สต็อกที่ปรับแก้ และบทความใหม่ทั้งหมดจะถูกล้างกลับสู่ค่าตั้งต้น</p>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:10px">
        <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
        <button class="btn btn-danger" onclick="executeResetData()">ยืนยันรีเซ็ต</button>
      </div>
    </div>
  `;
  openModal('ยืนยันรีเซ็ตข้อมูลระบบ', html);
}

async function executeResetData() {
  db = await seed();
  save();
  drop(SESSION_KEY);
  closeModal();
  showToast('รีเซ็ตข้อมูลเริ่มต้นเรียบร้อยแล้ว');
  updateAuthUI();
  renderCurrentTab();
}

/* =========================================================
   Tab Switching & Event Setup
   ========================================================= */
const TAB_RENDERERS = {
  overview: { title: 'ภาพรวมระบบ (Overview)', subtitle: 'แดชบอร์ดสรุปยอดขาย สต็อกสินค้า และคำสั่งซื้อแบบเรียลไทม์', fn: renderOverviewTab },
  products: { title: 'จัดการสินค้าและสต็อก (Products & Stock)', subtitle: 'ตรวจสอบจำนวนคงเหลือ ปรับสต็อก เพิ่ม/แก้ไข/ลบสินค้า', fn: renderProductsTab },
  orders: { title: 'คำสั่งซื้อและการจัดส่ง (Orders & Fulfillment)', subtitle: 'เปลี่ยนสถานะออเดอร์ ตรวจสอบข้อมูลผู้รับ และพิมพ์ใบเสร็จ', fn: renderOrdersTab },
  customers: { title: 'ลูกค้าและสมาชิก (Users & Verification)', subtitle: 'รายชื่อสมาชิก การตรวจสอบอายุ 20+ และประวัติการซื้อ', fn: renderCustomersTab },
  articles: { title: 'จัดการคลังความรู้ (Knowledge CMS)', subtitle: 'เพิ่ม แก้ไข และลบบทความวิชาการเรื่องกัญชา', fn: renderArticlesTab },
  settings: { title: 'เครื่องมือและสำรองข้อมูล (Settings)', subtitle: 'สำรองไฟล์ JSON สร้างข้อมูลทดสอบ และคืนค่าเริ่มต้น', fn: renderSettingsTab }
};

function switchTab(tabKey) {
  if (!TAB_RENDERERS[tabKey]) return;
  currentTab = tabKey;

  $$('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });

  const tabInfo = TAB_RENDERERS[tabKey];
  $('#pageTitle').textContent = tabInfo.title;
  $('#pageSubtitle').textContent = tabInfo.subtitle;

  renderCurrentTab();

  // Close mobile sidebar
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentTab() {
  const container = $('#adminContent');
  if (container && TAB_RENDERERS[currentTab]) {
    container.innerHTML = TAB_RENDERERS[currentTab].fn();
    bindTabEvents();
  }
}

function bindTabEvents() {
  // Product Search & Filter Events
  if (currentTab === 'products') {
    $('#productSearchInput')?.addEventListener('input', e => {
      activeFilters.productSearch = e.target.value;
      renderCurrentTab();
    });
    $('#productCatFilter')?.addEventListener('change', e => {
      activeFilters.productCategory = e.target.value;
      renderCurrentTab();
    });
    $('#productStrainFilter')?.addEventListener('change', e => {
      activeFilters.productStrain = e.target.value;
      renderCurrentTab();
    });
    $('#productStockFilter')?.addEventListener('change', e => {
      activeFilters.productStock = e.target.value;
      renderCurrentTab();
    });
  }

  // Order Search & Filter Events
  if (currentTab === 'orders') {
    $('#orderSearchInput')?.addEventListener('input', e => {
      activeFilters.orderSearch = e.target.value;
      renderCurrentTab();
    });
    $('#orderStatusFilter')?.addEventListener('change', e => {
      activeFilters.orderStatus = e.target.value;
      renderCurrentTab();
    });
  }
}

/* =========================================================
   Initial Application Boot
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // Load Database
  db = load(DB_KEY);
  if (!db || !db.users) {
    db = await seed();
    save();
  }

  // Set up theme toggle
  const currentTheme = localStorage.getItem('admin_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  $('#themeToggleBtn')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('admin_theme', nextTheme);
  });

  // Sidebar navigation click
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Mobile menu open / close
  $('#openSidebarBtn')?.addEventListener('click', () => {
    $('#sidebar')?.classList.add('open');
  });

  $('#closeSidebarBtn')?.addEventListener('click', () => {
    $('#sidebar')?.classList.remove('open');
  });

  // Modal close button
  $('#closeModalBtn')?.addEventListener('click', closeModal);

  // Quick Login button on banner
  $('#quickLoginAdminBtn')?.addEventListener('click', quickAdminLogin);

  // Check URL hash for direct tab
  const hash = location.hash.replace('#', '');
  if (TAB_RENDERERS[hash]) {
    switchTab(hash);
  } else {
    switchTab('overview');
  }

  updateAuthUI();
});
