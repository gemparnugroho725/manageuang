let wallets = [];
let titles = JSON.parse(localStorage.getItem("titles") || '[]');
let categories = JSON.parse(localStorage.getItem("categories") || '["Makan", "Transport", "Belanja", "Pendidikan", "Hiburan"]');
let allTransactions = [];
let reportChart = null;
let selectedHeaderDate = new Date().toISOString().slice(0, 10);
let selectedPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'

function formatIDR(amount) {
  const n = Number(amount) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function fmtDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeek(date) {
  // Monday as start of week
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0..6 with Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}

function endOfWeek(date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23,59,59,999);
  return e;
}

function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function stepSelectedDate(dir) {
  // dir: -1 for prev, +1 for next
  const base = parseISO(selectedHeaderDate);
  if (selectedPeriod === 'daily') {
    base.setDate(base.getDate() + dir);
    selectedHeaderDate = fmtDateISO(base);
  } else if (selectedPeriod === 'weekly') {
    base.setDate(base.getDate() + (7 * dir));
    selectedHeaderDate = fmtDateISO(base);
  } else if (selectedPeriod === 'monthly') {
    const y = base.getFullYear();
    const m = base.getMonth();
    const d = new Date(y, m + dir, 1);
    selectedHeaderDate = fmtDateISO(d);
  }
  renderHeaderPeriodValue();
  renderTransaksi();
}

function renderHeaderPeriodValue() {
  const container = document.getElementById('header-period-value');
  if (!container) return;
  if (selectedPeriod === 'daily') {
    container.innerHTML = '<input type="date" id="header-date">';
    const inp = document.getElementById('header-date');
    inp.value = selectedHeaderDate;
    inp.addEventListener('change', (e) => {
      selectedHeaderDate = e.target.value || selectedHeaderDate;
      renderTransaksi();
    });
  } else if (selectedPeriod === 'weekly') {
    container.innerHTML = '<input type="date" id="header-week" title="Tanggal dalam minggu">';
    const inp = document.getElementById('header-week');
    inp.value = selectedHeaderDate;
    inp.addEventListener('change', (e) => {
      selectedHeaderDate = e.target.value || selectedHeaderDate;
      renderTransaksi();
    });
  } else if (selectedPeriod === 'monthly') {
    container.innerHTML = '<input type="month" id="header-month">';
    const inp = document.getElementById('header-month');
    const d = parseISO(selectedHeaderDate);
    inp.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    inp.addEventListener('change', (e) => {
      const val = e.target.value; // YYYY-MM
      if (val) {
        const [y, m] = val.split('-').map(Number);
        selectedHeaderDate = fmtDateISO(new Date(y, (m || 1) - 1, 1));
        renderTransaksi();
      }
    });
  }
}

async function loadWallets() {
  const res = await fetch("/api/wallets");
  wallets = await res.json();
  renderWallets();
}

function renderWallets() {
  const el = document.getElementById("wallet-list");
  el.innerHTML = "";

  wallets.forEach(w => {
    el.innerHTML += `
      <div class="wallet-item">
        <strong>${w.name}</strong>
        <div>Saldo: ${formatIDR(w.balance)}</div>
        <button class="icon-button" onclick="editWallet(${w.id}, '${w.name.replace(/'/g, "\'")}', ${w.balance})">
          <span class="material-symbols-outlined">edit</span>
          Edit
        </button>
        <button class="icon-button" style="color:#f44336" onclick="deleteWallet(${w.id})">
          <span class="material-symbols-outlined">delete</span>
          Hapus
        </button>
      </div>
    `;
  });
}

async function addWallet() {
  const name = prompt("Nama wallet:");
  const balance = Number(prompt("Saldo awal:")) || 0;
  if (!name) return;

  await fetch("/api/wallets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, balance })
  });

  loadWallets();
}

async function editWallet(id, name, balance) {
  const newName = prompt("Nama wallet:", name);
  const newBalance = Number(prompt("Saldo:", balance));
  if (!newName) return;

  await fetch(`/api/wallets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName, balance: newBalance })
  });

  loadWallets();
}

async function deleteWallet(id) {
  if (!confirm('Hapus wallet ini? Semua transaksi terkait mungkin memblokir penghapusan.')) return;
  const res = await fetch(`/api/wallets/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    alert(j.error || 'Gagal menghapus wallet');
    return;
  }
  loadWallets();
}

/* LOAD DATA */
async function load() {
  const res = await fetch("/api/transactions");
  allTransactions = await res.json();

  renderTransaksi();
}

/* RENDER TRANSAKSI */
function renderTransaksi() {
  let income = 0, expense = 0;
  const list = document.getElementById("list");
  list.innerHTML = "";

  let filtered = allTransactions;
  if (selectedPeriod === 'daily') {
    filtered = allTransactions.filter(t => t.date === selectedHeaderDate);
  } else if (selectedPeriod === 'weekly') {
    const s = startOfWeek(parseISO(selectedHeaderDate));
    const e = endOfWeek(parseISO(selectedHeaderDate));
    filtered = allTransactions.filter(t => {
      const d = parseISO(t.date);
      return d >= s && d <= e;
    });
  } else if (selectedPeriod === 'monthly') {
    const s = startOfMonth(parseISO(selectedHeaderDate));
    const e = endOfMonth(parseISO(selectedHeaderDate));
    filtered = allTransactions.filter(t => {
      const d = parseISO(t.date);
      return d >= s && d <= e;
    });
  }

  filtered.forEach(t => {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense" || t.type === "transfer") expense += t.amount;

    const sign = t.type === "income" ? "+" : t.type === "transfer" ? "~" : "-";
    const amountCls = t.type === 'income' ? 'income' : t.type === 'transfer' ? 'transfer' : 'expense';
    const amountStr = `${sign} ${formatIDR(t.amount)}`;
    let cat = 'Lainnya', ttl = t.note || '';
    if (t.note && t.note.includes(':')) {
      const parts = t.note.split(':');
      cat = parts[0] || 'Lainnya';
      ttl = parts.slice(1).join(':') || '';
    }

    list.innerHTML += `
      <div class="tx" onclick='beginEditTx(${JSON.stringify(t).replace(/'/g, "&apos;")})' style="cursor:pointer">
        <div class="tx-top">
          <span class="tx-title">${ttl || '(Tanpa Judul)'}</span>
          <span class="tx-amount ${amountCls}">${amountStr}</span>
        </div>
        <div class="tx-bottom">
          <span class="tx-cat">${cat}</span>
          <span class="tx-date">${t.date}</span>
        </div>
      </div>
    `;
  });

  document.getElementById("income").textContent = formatIDR(income);
  document.getElementById("expense").textContent = formatIDR(expense);
  document.getElementById("balance").textContent = formatIDR(income - expense);
}

let editingTxId = null;
function beginEditTx(t) {
  editingTxId = t.id;
  selectedTxType = t.type;
  document.getElementById("add-tx-title").textContent = "Edit Transaksi";
  const delBtn = document.getElementById('btn-delete-tx');
  if (delBtn) {
    delBtn.style.display = 'inline-block';
    delBtn.onclick = async () => {
      if (!confirm('Hapus transaksi ini?')) return;
      await fetch(`/api/transactions/${editingTxId}`, { method: 'DELETE' });
      editingTxId = null;
      document.getElementById("form-add-tx").reset();
      document.getElementById("add-tx-title").textContent = "Add Transaction";
      delBtn.style.display = 'none';
      closeModal();
      load();
    };
  }
  // ensure selects populated
  populateTitleSelect();
  populateCategorySelect();
  populateWalletSelect();
  // split note into category:title
  let cat = '';
  let ttl = '';
  if (t.note && t.note.includes(':')) {
    const parts = t.note.split(':');
    cat = parts[0] || '';
    ttl = parts.slice(1).join(':') || '';
  } else {
    ttl = t.note || '';
  }
  if (ttl && !titles.includes(ttl)) {
    titles.push(ttl);
    localStorage.setItem("titles", JSON.stringify(titles));
    populateTitleSelect();
  }
  if (cat && !categories.includes(cat)) {
    categories.push(cat);
    localStorage.setItem("categories", JSON.stringify(categories));
    populateCategorySelect();
  }
  document.getElementById("tx-date").value = t.date;
  document.getElementById("tx-wallet").value = t.wallet_id || '';
  document.getElementById("tx-amount").value = t.amount;
  document.getElementById("tx-title").value = ttl;
  document.getElementById("tx-category").value = cat || '';
  document.getElementById("tx-description").value = t.description || '';
  // jump to form
  openTxModal();
}

/* WALLET */
function renderWallet() {
  const balance = allTransactions.reduce((sum, t) => {
    return t.type === "income" ? sum + t.amount : sum - t.amount;
  }, 0);

  document.getElementById("wallet-balance").textContent = "Rp " + balance;
}

/* REPORT */
function renderReport() {
  const report = {};
  const el = document.getElementById("report-list");
  el.innerHTML = "";

  allTransactions.forEach(t => {
    report[t.date] ??= { income: 0, expense: 0 };
    report[t.date][t.type] += t.amount;
  });

  Object.keys(report).forEach(date => {
    el.innerHTML += `
      <div class="tx">
        <span>${date}</span>
        <strong>
          +${report[date].income || 0} / -${report[date].expense || 0}
        </strong>
      </div>
    `;
  });
}

/* TOGGLE TX OPTIONS */
function toggleTxOptions() {
  const mini = document.getElementById("tx-options-mini");
  mini.classList.toggle("show");
}

/* HANDLE FAB CLICK */
function handleFabClick() {
  const activePage = document.querySelector(".page.active").id;
  if (activePage === "page-transaksi") {
    toggleTxOptions();
  } else if (activePage === "page-wallet") {
    openWalletModal();
  }
}

/* SELECT TX TYPE */
let selectedTxType = "";
function selectTxType(type) {
  selectedTxType = type;
  document.getElementById("add-tx-title").textContent = 
    type === "income" ? "Add Pemasukan" : type === "expense" ? "Add Pengeluaran" : "Add Transfer";
  document.getElementById("tx-date").value = selectedHeaderDate;
  populateTitleSelect();
  populateCategorySelect();
  populateWalletSelect();
  toggleTxOptions();
  openTxModal();
}

/* POPULATE TITLE SELECT */
function populateTitleSelect() {
  const select = document.getElementById("tx-title");
  select.innerHTML = '<option value="">Pilih Judul</option>';
  titles.forEach(t => {
    select.innerHTML += `<option value="${t}">${t}</option>`;
  });
  select.innerHTML += '<option value="add-new">+ Add New</option>';
}

/* POPULATE CATEGORY SELECT */
function populateCategorySelect() {
  const select = document.getElementById("tx-category");
  select.innerHTML = '<option value="">Pilih Kategori</option>';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c}">${c}</option>`;
  });
  select.innerHTML += '<option value="add-new-cat">+ Add New</option>';
}

/* POPULATE WALLET SELECT */
function populateWalletSelect() {
  const select = document.getElementById("tx-wallet");
  select.innerHTML = '<option value="">Pilih Wallet</option>';
  if (wallets.length === 0) {
    select.innerHTML += '<option disabled>Loading...</option>';
    return;
  }
  wallets.forEach(w => {
    select.innerHTML += `<option value="${w.id}">${w.name}</option>`;
  });
}

/* FORM SUBMIT ADD TX */
document.getElementById("form-add-tx").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("tx-date").value;
  const walletId = document.getElementById("tx-wallet").value;
  const amount = Number(document.getElementById("tx-amount").value);
  let title = document.getElementById("tx-title").value;
  let category = document.getElementById("tx-category").value;
  const description = document.getElementById("tx-description").value;

  if (title === "add-new") {
    title = prompt("Masukkan judul baru:");
    if (!title) return;
    // Add to titles array
    titles.push(title);
    localStorage.setItem("titles", JSON.stringify(titles));
    // Add to select options
    const select = document.getElementById("tx-title");
    const option = document.createElement("option");
    option.value = title;
    option.text = title;
    select.add(option, select.options[select.options.length - 1]);
    select.value = title;
  }

  if (category === "add-new-cat") {
    category = prompt("Masukkan kategori baru:");
    if (!category) return;
    // Add to categories array
    categories.push(category);
    localStorage.setItem("categories", JSON.stringify(categories));
    // Add to select options
    const select = document.getElementById("tx-category");
    const option = document.createElement("option");
    option.value = category;
    option.text = category;
    select.add(option, select.options[select.options.length - 1]);
    select.value = category;
  }

  if (!date || !walletId || !amount || !title || !category) return;

  const payload = {
    date,
    wallet_id: walletId,
    amount,
    note: `${category}:${title}`,
    type: selectedTxType,
    description
  };

  if (editingTxId) {
    await fetch(`/api/transactions/${editingTxId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  load();
  closeModal();
  document.getElementById("form-add-tx").reset();
  editingTxId = null;
  document.getElementById("add-tx-title").textContent = "Add Transaction";
  const delBtn = document.getElementById('btn-delete-tx');
  if (delBtn) delBtn.style.display = 'none';
});

/* NAVIGATION */
function switchTab(name, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // Hide mini if switching away from transaksi
  if (name !== "transaksi") {
    document.getElementById("tx-options-mini").classList.remove("show");
    document.getElementById("tx-options-mini").style.display = "none";
  }

  if (name === "setting") {
    // No render here
  }

  if (name === "manage-categories") renderCategoriesList();
  if (name === "manage-titles") renderTitlesList();

  if (name === "transaksi") load();
  if (name === "report") setReportPeriod('daily');
}

/* RENDER TITLES LIST */
function renderTitlesList() {
  const container = document.getElementById("titles-container");
  container.innerHTML = "";
  titles.forEach((t, i) => {
    container.innerHTML += `
      <div class="manage-item">
        <span>${t}</span>
        <button onclick="deleteTitle(${i})">Delete</button>
      </div>
    `;
  });
}

/* ADD TITLE */
function addTitle() {
  const newTitle = prompt("Masukkan judul baru:");
  if (!newTitle) return;
  titles.push(newTitle);
  localStorage.setItem("titles", JSON.stringify(titles));
  renderTitlesList();
  populateTitleSelect();
}

/* DELETE TITLE */
function deleteTitle(index) {
  if (confirm("Hapus judul ini?")) {
    titles.splice(index, 1);
    localStorage.setItem("titles", JSON.stringify(titles));
    renderTitlesList();
    populateTitleSelect();
  }
}

/* RENDER CATEGORIES LIST */
function renderCategoriesList() {
  const container = document.getElementById("categories-container");
  container.innerHTML = "";
  categories.forEach((c, i) => {
    container.innerHTML += `
      <div class="manage-item">
        <span>${c}</span>
        <button onclick="deleteCategory(${i})">Delete</button>
      </div>
    `;
  });
}

/* ADD CATEGORY */
function addCategory() {
  const newCat = prompt("Masukkan kategori baru:");
  if (!newCat) return;
  categories.push(newCat);
  localStorage.setItem("categories", JSON.stringify(categories));
  renderCategoriesList();
  populateCategorySelect();
}

/* DELETE CATEGORY */
function deleteCategory(index) {
  if (confirm("Hapus kategori ini?")) {
    categories.splice(index, 1);
    localStorage.setItem("categories", JSON.stringify(categories));
    renderCategoriesList();
    populateCategorySelect();
  }
}

/* SWITCH REPORT */
function switchReport(period, btn) {
  document.querySelectorAll(".report-tab").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  setReportPeriod(period);
}

/* SET REPORT PERIOD */
function setReportPeriod(period) {
  // Update period selector
  const selector = document.getElementById('period-selector');
  const now = new Date();
  if (period === 'daily') {
    selector.innerHTML = `<input type="date" id="daily-date" value="${now.toISOString().slice(0, 10)}">`;
  } else if (period === 'monthly') {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthOptions = months.map((m, i) => `<option value="${i+1}" ${i+1 === now.getMonth()+1 ? 'selected' : ''}>${m}</option>`).join('');
    const yearOptions = Array.from({length: 10}, (_, i) => now.getFullYear() - 5 + i).map(y => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('');
    selector.innerHTML = `
      <select id="monthly-month">${monthOptions}</select>
      <select id="monthly-year">${yearOptions}</select>
    `;
  } else if (period === 'yearly') {
    const yearOptions = Array.from({length: 10}, (_, i) => now.getFullYear() - 5 + i).map(y => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`).join('');
    selector.innerHTML = `<select id="yearly-year">${yearOptions}</select>`;
  }
  
  updateReport();
}

/* UPDATE REPORT */
function updateReport() {
  const basis = document.getElementById('report-basis').value;
  const type = (document.getElementById('report-type')?.value) || 'pie';
  const activeTab = document.querySelector('.report-tab.active');
  if (!activeTab) return;
  const period = activeTab.textContent === 'Harian' ? 'daily' : activeTab.textContent === 'Bulanan' ? 'monthly' : 'yearly';
  
  let periodValue;
  if (period === 'daily') {
    periodValue = document.getElementById('daily-date').value;
  } else if (period === 'monthly') {
    const month = document.getElementById('monthly-month').value;
    const year = document.getElementById('monthly-year').value;
    periodValue = `${year}-${month.padStart(2, '0')}`;
  } else if (period === 'yearly') {
    periodValue = document.getElementById('yearly-year').value;
  }
  
  generateReport(period, basis, periodValue, type);
}

/* GENERATE REPORT */
function generateReport(period, basis, periodValue, chartType = 'pie') {
  // Filter transactions based on period
  let filtered = allTransactions;

  if (period === 'daily') {
    filtered = allTransactions.filter(t => t.date === periodValue);
  } else if (period === 'monthly') {
    const [year, month] = periodValue.split('-');
    filtered = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() == year && (d.getMonth() + 1) == month;
    });
  } else if (period === 'yearly') {
    filtered = allTransactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() == periodValue;
    });
  }

  // Group by basis for expenses
  const sums = {};
  filtered.forEach(t => {
    if (t.type === 'expense' || t.type === 'transfer') {
      let key;
      if (basis === 'category') {
        key = t.note.split(':')[0] || 'Lainnya';
      } else {
        key = t.note.split(':')[1] || t.note || 'Tanpa Judul';
      }
      if (!sums[key]) sums[key] = 0;
      sums[key] += t.amount;
    }
  });

  const labels = Object.keys(sums);
  const data = Object.values(sums);

  // Update chart
  const ctx = document.getElementById('report-chart').getContext('2d');
  if (reportChart) {
    reportChart.destroy();
  }
  const palette = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8BC34A', '#FF7043', '#AB47BC', '#26C6DA'];

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,
    plugins: {
      legend: chartType === 'pie' ? { position: 'bottom' } : { display: false }
    }
  };

  const chartConfig = chartType === 'pie'
    ? {
        type: 'pie',
        data: {
          labels,
          datasets: [{ data, backgroundColor: palette }]
        },
        options: commonOptions
      }
    : {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Pengeluaran',
            data,
            backgroundColor: palette,
            borderWidth: 0
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) { return formatIDR(value); }
              }
            },
            x: { ticks: { autoSkip: false, maxRotation: 35, minRotation: 0 } }
          }
        }
      };

  reportChart = new Chart(ctx, chartConfig);

  // Update summary
  const total = data.reduce((a, b) => a + b, 0);
  document.getElementById('report-summary').innerHTML = `<p>Total: ${formatIDR(total)}</p>`;
}

// Initial load on page ready
window.addEventListener('DOMContentLoaded', () => {
  // Load wallets and transactions initially
  loadWallets();
  load();
  // Prepare report defaults
  setReportPeriod('daily');
  // Initialize header period controls
  const periodSel = document.getElementById('header-period');
  const prevBtn = document.getElementById('header-prev');
  const nextBtn = document.getElementById('header-next');
  if (periodSel) {
    periodSel.value = selectedPeriod;
    periodSel.addEventListener('change', (e) => {
      selectedPeriod = e.target.value || 'daily';
      renderHeaderPeriodValue();
      renderTransaksi();
    });
  }
  if (prevBtn) prevBtn.addEventListener('click', () => stepSelectedDate(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => stepSelectedDate(1));
  renderHeaderPeriodValue();

  // Modal close interactions
  const closeBtn = document.getElementById('modal-close');
  const modal = document.getElementById('app-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
});

// Keep modal helpers at file end to avoid hoisting surprises
let modalOriginalParent = null;
let modalOriginalNext = null;
let modalCurrentNode = null;

function openModalWith(node) {
  const modal = document.getElementById('app-modal');
  const container = document.getElementById('modal-container');
  if (!modal || !container || !node) return;
  modalOriginalParent = node.parentNode;
  modalOriginalNext = node.nextSibling;
  modalCurrentNode = node;
  container.appendChild(node);
  node.style.display = '';
  modal.classList.add('show');
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('app-modal');
  const container = document.getElementById('modal-container');
  if (modalCurrentNode && modalOriginalParent) {
    modalCurrentNode.style.display = 'none';
    if (modalOriginalNext) {
      modalOriginalParent.insertBefore(modalCurrentNode, modalOriginalNext);
    } else {
      modalOriginalParent.appendChild(modalCurrentNode);
    }
  }
  modalCurrentNode = null;
  modalOriginalParent = null;
  modalOriginalNext = null;
  if (container) container.innerHTML = '';
  if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; }
}

function openTxModal() {
  const section = document.getElementById('page-add-tx');
  if (section) openModalWith(section);
}

function openWalletModal() {
  const tmpl = document.getElementById('modal-add-wallet');
  if (!tmpl) return;
  openModalWith(tmpl);
  const n = document.getElementById('wallet-name');
  const b = document.getElementById('wallet-balance');
  if (n) n.value = '';
  if (b) b.value = '0';
}

// Intercept wallet add form
document.addEventListener('submit', async (e) => {
  const t = e.target;
  if (t && t.id === 'form-add-wallet') {
    e.preventDefault();
    const name = document.getElementById('wallet-name').value.trim();
    const balance = Number(document.getElementById('wallet-balance').value) || 0;
    if (!name) return;
    await fetch('/api/wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, balance }) });
    closeModal();
    loadWallets();
  }
});
