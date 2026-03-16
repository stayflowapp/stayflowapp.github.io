const ACTIVATION_CODE = 'STAYFLOW-4921';
const STORAGE_KEY = 'stayflow_v2_data';
const app = document.getElementById('app');

const defaultData = {
  activated: false,
  setup: {
    propertyName: '', ownerName: '', propertyType: 'Guest House', language: 'English', currency: 'TZS', theme: 'Light'
  },
  currentView: 'dashboard',
  rooms: [
    { id: uid(), name: 'Room 101', type: 'Standard', price: 50000, status: 'Available', notes: '' },
    { id: uid(), name: 'Room 102', type: 'Deluxe', price: 75000, status: 'Occupied', notes: 'Late checkout' }
  ],
  guests: [
    { id: uid(), name: 'John Mushi', phone: '0712345678', idNumber: 'TZ123456', nationality: 'Tanzanian', origin: 'Dar es Salaam', notes: '' }
  ],
  bookings: [
    { id: uid(), guestId: null, guestName: 'Walk-in Guest', roomId: null, roomName: 'Room 102', checkIn: today(), checkOut: tomorrow(), guests: 2, status: 'Checked In', total: 75000, paid: 30000, paymentMethod: 'Cash', notes: '' }
  ],
  inventory: [
    { id: uid(), name: 'Towels', category: 'Linen', quantity: 18, unit: 'pcs', minStock: 10, notes: '' },
    { id: uid(), name: 'Soap', category: 'Toiletries', quantity: 6, unit: 'bars', minStock: 10, notes: '' }
  ]
};

let state = load();
applyTheme();
render();
registerSW();

function uid() { return Math.random().toString(36).slice(2, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function money(n) { return `${state.setup.currency || 'TZS'} ${Number(n || 0).toLocaleString()}`; }
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw ? { ...defaultData, ...raw } : structuredClone(defaultData);
  } catch { return structuredClone(defaultData); }
}
function applyTheme() { document.body.classList.toggle('dark', state.setup.theme === 'Dark'); }

function render() {
  app.innerHTML = state.activated ? renderApp() : renderSetup();
  bindCommon();
  if (state.activated) bindApp(); else bindSetup();
}

function renderSetup() {
  return `<div class="shell">
    <div class="card hero">
      <div class="logo">S</div>
      <h1 class="h1">StayFlow V2</h1>
      <div class="sub">Mobile property manager for guest houses and Airbnb hosts</div>
    </div>
    <div class="card section stack" style="margin-top:14px;">
      <div>
        <div class="title">Set up your property</div>
        <div class="muted">Complete setup once, then the dashboard opens. This fixes the earlier bug where setup and dashboard appeared together.</div>
      </div>
      <div class="field"><label>Property Name</label><input id="propertyName" placeholder="Ocean Breeze Apartments" value="${esc(state.setup.propertyName)}"></div>
      <div class="field"><label>Owner Name</label><input id="ownerName" placeholder="Jeremy Makundi" value="${esc(state.setup.ownerName)}"></div>
      <div class="row-2">
        <div class="field"><label>Property Type</label><select id="propertyType"><option ${sel('Guest House', state.setup.propertyType)}>Guest House</option><option ${sel('Airbnb', state.setup.propertyType)}>Airbnb</option></select></div>
        <div class="field"><label>Language</label><select id="language"><option ${sel('English', state.setup.language)}>English</option><option ${sel('Swahili', state.setup.language)}>Swahili</option></select></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Currency</label><select id="currency"><option ${sel('TZS', state.setup.currency)}>TZS</option><option ${sel('USD', state.setup.currency)}>USD</option></select></div>
        <div class="field"><label>Theme</label><select id="theme"><option ${sel('Light', state.setup.theme)}>Light</option><option ${sel('Dark', state.setup.theme)}>Dark</option></select></div>
      </div>
      <div class="field"><label>Activation Code</label><input id="activationCode" placeholder="Enter code"></div>
      <button class="btn btn-primary" id="activateBtn">Activate & Continue</button>
      <div class="muted">Use code: <span class="kbd">${ACTIVATION_CODE}</span></div>
    </div>
  </div>`;
}

function renderApp() {
  return `<div class="shell">
    <div class="topbar">
      <div>
        <h1 class="title">${esc(state.setup.propertyName || 'StayFlow')}</h1>
        <div class="muted">${esc(state.setup.propertyType)} • Owner: ${esc(state.setup.ownerName || '—')}</div>
      </div>
      <button class="btn btn-secondary" id="themeToggle">${state.setup.theme === 'Dark' ? 'Light' : 'Dark'} mode</button>
    </div>
    ${renderContent()}
    <nav class="bottom-nav">
      ${navBtn('dashboard','Dashboard','⌂')}
      ${navBtn('rooms','Rooms','▣')}
      ${navBtn('bookings','Bookings','☰')}
      ${navBtn('inventory','Inventory','◫')}
      ${navBtn('settings','Settings','⚙')}
    </nav>
  </div>`;
}

function renderContent() {
  switch (state.currentView) {
    case 'rooms': return renderRooms();
    case 'bookings': return renderBookings();
    case 'inventory': return renderInventory();
    case 'settings': return renderSettings();
    default: return renderDashboard();
  }
}

function renderDashboard() {
  const occupied = state.rooms.filter(r => r.status === 'Occupied').length;
  const available = state.rooms.filter(r => r.status === 'Available').length;
  const cleaning = state.rooms.filter(r => r.status === 'Cleaning').length;
  const todaysIn = state.bookings.filter(b => b.checkIn === today()).length;
  const todaysOut = state.bookings.filter(b => b.checkOut === today()).length;
  const pending = state.bookings.filter(b => Number(b.paid) < Number(b.total)).length;
  const lowStock = state.inventory.filter(i => Number(i.quantity) <= Number(i.minStock)).length;
  const revenue = state.bookings.reduce((s,b)=>s+Number(b.paid||0),0);
  return `<div class="stack">
    <div class="badge">Activated • ${esc(state.setup.language)} • ${esc(state.setup.currency)}</div>
    <div class="stats">
      ${stat('Total Rooms', state.rooms.length)}
      ${stat('Occupied', occupied)}
      ${stat('Available', available)}
      ${stat('Cleaning', cleaning)}
      ${stat("Today's Check-ins", todaysIn)}
      ${stat("Today's Check-outs", todaysOut)}
      ${stat('Pending Payments', pending)}
      ${stat('Low Stock', lowStock)}
    </div>
    <div class="card section">
      <div class="title" style="font-size:18px;">Quick actions</div>
      <div class="grid-actions" style="margin-top:12px;">
        <button class="btn btn-primary" data-quick="add-room">Add Room</button>
        <button class="btn btn-primary" data-quick="add-booking">Add Booking</button>
        <button class="btn btn-secondary" data-quick="add-guest">Add Guest</button>
        <button class="btn btn-secondary" data-quick="add-stock">Add Stock</button>
      </div>
    </div>
    <div class="summary-grid">
      <div class="card section"><div class="muted">Collected Revenue</div><div class="title">${money(revenue)}</div></div>
      <div class="card section"><div class="muted">Outstanding</div><div class="title">${money(state.bookings.reduce((s,b)=>s+(Number(b.total||0)-Number(b.paid||0)),0))}</div></div>
    </div>
    <div class="card section">
      <div class="title" style="font-size:18px;">Recent bookings</div>
      <div class="list" style="margin-top:10px;">
        ${state.bookings.slice(-3).reverse().map(b=>`<div class="item card"><div class="item-head"><div><div class="item-title">${esc(b.guestName)}</div><div class="item-meta">${esc(b.roomName || 'No room')} • ${esc(b.checkIn)} to ${esc(b.checkOut)}</div></div><span class="pill ${statusClass(b.status)}">${esc(b.status)}</span></div></div>`).join('') || '<div class="empty">No bookings yet.</div>'}
      </div>
    </div>
  </div>`;
}

function renderRooms() {
  return `<div class="stack">
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Add room</div>
      <div class="row-2">
        <div class="field"><label>Room Name</label><input id="roomName" placeholder="Room 201"></div>
        <div class="field"><label>Type</label><input id="roomType" placeholder="Standard"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Price per Night</label><input id="roomPrice" type="number" placeholder="50000"></div>
        <div class="field"><label>Status</label><select id="roomStatus">${statusOptions('Available')}</select></div>
      </div>
      <div class="field"><label>Notes</label><textarea id="roomNotes"></textarea></div>
      <button class="btn btn-primary" id="addRoomBtn">Save Room</button>
    </div>
    <div class="list">
      ${state.rooms.map(r => `<div class="item card">
        <div class="item-head"><div><div class="item-title">${esc(r.name)}</div><div class="item-meta">${esc(r.type)} • ${money(r.price)}</div></div><span class="pill ${statusClass(r.status)}">${esc(r.status)}</span></div>
        ${r.notes ? `<div class="item-meta">${esc(r.notes)}</div>` : ''}
        <div class="actions">
          ${['Available','Occupied','Cleaning','Maintenance','Reserved'].map(s=>`<button class="btn btn-secondary smallBtn" data-room-status="${r.id}|${s}">${s}</button>`).join('')}
          <button class="btn btn-danger" data-room-delete="${r.id}">Delete</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderBookings() {
  return `<div class="stack">
    <div class="tabs">
      <button class="tab active">Bookings</button>
      <button class="tab" data-booking-tab="guests">Guests</button>
      <button class="tab" data-booking-tab="payments">Payments</button>
    </div>
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Add booking</div>
      <div class="row-2">
        <div class="field"><label>Guest Name</label><input id="bookingGuest" placeholder="Guest full name"></div>
        <div class="field"><label>Room</label><select id="bookingRoom"><option value="">Select room</option>${state.rooms.map(r=>`<option>${esc(r.name)}</option>`).join('')}</select></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Check-in</label><input id="bookingIn" type="date" value="${today()}"></div>
        <div class="field"><label>Check-out</label><input id="bookingOut" type="date" value="${tomorrow()}"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Guests</label><input id="bookingGuests" type="number" value="1"></div>
        <div class="field"><label>Status</label><select id="bookingStatus"><option>Reserved</option><option>Checked In</option><option>Checked Out</option><option>Cancelled</option></select></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Total Charge</label><input id="bookingTotal" type="number" placeholder="75000"></div>
        <div class="field"><label>Amount Paid</label><input id="bookingPaid" type="number" placeholder="0"></div>
      </div>
      <div class="field"><label>Payment Method</label><select id="bookingPayment"><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Card</option></select></div>
      <button class="btn btn-primary" id="addBookingBtn">Save Booking</button>
    </div>
    <div class="list">
      ${state.bookings.map(b => `<div class="item card">
        <div class="item-head"><div><div class="item-title">${esc(b.guestName)}</div><div class="item-meta">${esc(b.roomName || 'No room')} • ${esc(b.checkIn)} to ${esc(b.checkOut)}</div></div><span class="pill ${statusClass(b.status)}">${esc(b.status)}</span></div>
        <div class="item-meta">Charge: ${money(b.total)} • Paid: ${money(b.paid)} • Balance: ${money(Number(b.total)-Number(b.paid))}</div>
        <div class="actions">
          ${['Reserved','Checked In','Checked Out','Cancelled'].map(s=>`<button class="btn btn-secondary" data-booking-status="${b.id}|${s}">${s}</button>`).join('')}
          <button class="btn btn-danger" data-booking-delete="${b.id}">Delete</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderInventory() {
  return `<div class="stack">
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Add inventory item</div>
      <div class="row-2">
        <div class="field"><label>Item Name</label><input id="itemName" placeholder="Towels"></div>
        <div class="field"><label>Category</label><input id="itemCategory" placeholder="Linen"></div>
      </div>
      <div class="row-2">
        <div class="field"><label>Quantity</label><input id="itemQuantity" type="number" placeholder="10"></div>
        <div class="field"><label>Unit</label><input id="itemUnit" placeholder="pcs"></div>
      </div>
      <div class="field"><label>Minimum Stock</label><input id="itemMin" type="number" placeholder="5"></div>
      <button class="btn btn-primary" id="addItemBtn">Save Item</button>
    </div>
    <div class="list">
      ${state.inventory.map(i => `<div class="item card">
        <div class="item-head"><div><div class="item-title">${esc(i.name)}</div><div class="item-meta">${esc(i.category)} • ${i.quantity} ${esc(i.unit)}</div></div><span class="pill ${Number(i.quantity)<=Number(i.minStock)?'cleaning':'available'}">${Number(i.quantity)<=Number(i.minStock)?'Low Stock':'In Stock'}</span></div>
        <div class="item-meta">Min level: ${i.minStock}</div>
        <div class="actions">
          <button class="btn btn-secondary" data-stock-adjust="${i.id}|1">+1</button>
          <button class="btn btn-secondary" data-stock-adjust="${i.id}|-1">-1</button>
          <button class="btn btn-danger" data-stock-delete="${i.id}">Delete</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderSettings() {
  const roomRevenue = state.bookings.reduce((sum,b)=>sum+Number(b.total||0),0);
  return `<div class="stack">
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Property settings</div>
      <div class="field"><label>Property Name</label><input id="setPropertyName" value="${esc(state.setup.propertyName)}"></div>
      <div class="field"><label>Owner Name</label><input id="setOwnerName" value="${esc(state.setup.ownerName)}"></div>
      <div class="row-2">
        <div class="field"><label>Property Type</label><select id="setPropertyType"><option ${sel('Guest House', state.setup.propertyType)}>Guest House</option><option ${sel('Airbnb', state.setup.propertyType)}>Airbnb</option></select></div>
        <div class="field"><label>Currency</label><select id="setCurrency"><option ${sel('TZS', state.setup.currency)}>TZS</option><option ${sel('USD', state.setup.currency)}>USD</option></select></div>
      </div>
      <button class="btn btn-primary" id="saveSettingsBtn">Save Settings</button>
    </div>
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Reports snapshot</div>
      <div class="muted">Rooms: ${state.rooms.length} • Bookings: ${state.bookings.length} • Inventory items: ${state.inventory.length}</div>
      <div class="muted">Projected sales: ${money(roomRevenue)}</div>
      <div class="muted">Collected: ${money(state.bookings.reduce((s,b)=>s+Number(b.paid||0),0))}</div>
    </div>
    <div class="card section stack">
      <div class="title" style="font-size:18px;">Backup & reset</div>
      <button class="btn btn-secondary" id="exportBtn">Export Data</button>
      <label class="btn btn-secondary" for="importFile" style="display:block;text-align:center;">Import Data</label>
      <input id="importFile" type="file" accept="application/json" class="hidden" />
      <button class="btn btn-danger" id="resetBtn">Factory Reset</button>
    </div>
  </div>`;
}

function bindCommon() {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.onclick = () => { state.currentView = btn.dataset.nav; save(); render(); });
}
function bindSetup() {
  const theme = document.getElementById('theme');
  theme?.addEventListener('change', e => { state.setup.theme = e.target.value; applyTheme(); });
  document.getElementById('activateBtn').onclick = () => {
    const code = document.getElementById('activationCode').value.trim();
    if (code !== ACTIVATION_CODE) return alert('Invalid activation code.');
    state.setup.propertyName = document.getElementById('propertyName').value.trim();
    state.setup.ownerName = document.getElementById('ownerName').value.trim();
    state.setup.propertyType = document.getElementById('propertyType').value;
    state.setup.language = document.getElementById('language').value;
    state.setup.currency = document.getElementById('currency').value;
    state.setup.theme = document.getElementById('theme').value;
    state.activated = true;
    applyTheme(); save(); render();
  };
}
function bindApp() {
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    state.setup.theme = state.setup.theme === 'Dark' ? 'Light' : 'Dark'; applyTheme(); save(); render();
  });
  document.querySelectorAll('[data-quick]').forEach(btn => btn.onclick = () => {
    const m = btn.dataset.quick;
    state.currentView = m.includes('room') ? 'rooms' : m.includes('booking') ? 'bookings' : m.includes('stock') ? 'inventory' : 'bookings';
    save(); render();
    setTimeout(() => {
      const target = m === 'add-room' ? 'roomName' : m === 'add-booking' ? 'bookingGuest' : m === 'add-stock' ? 'itemName' : 'bookingGuest';
      document.getElementById(target)?.focus();
    }, 50);
  });
  document.getElementById('addRoomBtn')?.addEventListener('click', addRoom);
  document.getElementById('addBookingBtn')?.addEventListener('click', addBooking);
  document.getElementById('addItemBtn')?.addEventListener('click', addItem);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('exportBtn')?.addEventListener('click', exportData);
  document.getElementById('importFile')?.addEventListener('change', importData);
  document.getElementById('resetBtn')?.addEventListener('click', resetApp);

  document.querySelectorAll('[data-room-status]').forEach(b => b.onclick = () => {
    const [id, status] = b.dataset.roomStatus.split('|');
    const room = state.rooms.find(r => r.id === id); if (!room) return; room.status = status; save(); render();
  });
  document.querySelectorAll('[data-room-delete]').forEach(b => b.onclick = () => {
    state.rooms = state.rooms.filter(r => r.id !== b.dataset.roomDelete); save(); render();
  });
  document.querySelectorAll('[data-booking-status]').forEach(b => b.onclick = () => {
    const [id, status] = b.dataset.bookingStatus.split('|');
    const booking = state.bookings.find(r => r.id === id); if (!booking) return; booking.status = status; save(); render();
  });
  document.querySelectorAll('[data-booking-delete]').forEach(b => b.onclick = () => {
    state.bookings = state.bookings.filter(r => r.id !== b.dataset.bookingDelete); save(); render();
  });
  document.querySelectorAll('[data-stock-adjust]').forEach(b => b.onclick = () => {
    const [id, amt] = b.dataset.stockAdjust.split('|');
    const item = state.inventory.find(r => r.id === id); if (!item) return; item.quantity = Math.max(0, Number(item.quantity)+Number(amt)); save(); render();
  });
  document.querySelectorAll('[data-stock-delete]').forEach(b => b.onclick = () => {
    state.inventory = state.inventory.filter(r => r.id !== b.dataset.stockDelete); save(); render();
  });
}
function addRoom() {
  const name = val('roomName'); if (!name) return alert('Enter room name.');
  state.rooms.unshift({ id: uid(), name, type: val('roomType') || 'Standard', price: Number(val('roomPrice') || 0), status: val('roomStatus') || 'Available', notes: val('roomNotes') });
  save(); render();
}
function addBooking() {
  const guestName = val('bookingGuest'); if (!guestName) return alert('Enter guest name.');
  state.bookings.unshift({ id: uid(), guestId: null, guestName, roomId: null, roomName: val('bookingRoom'), checkIn: val('bookingIn'), checkOut: val('bookingOut'), guests: Number(val('bookingGuests') || 1), status: val('bookingStatus'), total: Number(val('bookingTotal') || 0), paid: Number(val('bookingPaid') || 0), paymentMethod: val('bookingPayment'), notes: '' });
  save(); render();
}
function addItem() {
  const name = val('itemName'); if (!name) return alert('Enter item name.');
  state.inventory.unshift({ id: uid(), name, category: val('itemCategory') || 'General', quantity: Number(val('itemQuantity') || 0), unit: val('itemUnit') || 'pcs', minStock: Number(val('itemMin') || 0), notes: '' });
  save(); render();
}
function saveSettings() {
  state.setup.propertyName = val('setPropertyName');
  state.setup.ownerName = val('setOwnerName');
  state.setup.propertyType = val('setPropertyType');
  state.setup.currency = val('setCurrency');
  save(); render();
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'stayflow-backup.json'; a.click(); URL.revokeObjectURL(a.href);
}
function importData(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { state = JSON.parse(reader.result); applyTheme(); save(); render(); }
    catch { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
}
function resetApp() {
  if (!confirm('This will erase app data on this device. Continue?')) return;
  localStorage.removeItem(STORAGE_KEY); state = structuredClone(defaultData); applyTheme(); render();
}
function val(id){ return document.getElementById(id)?.value?.trim() || ''; }
function statusOptions(current){ return ['Available','Occupied','Cleaning','Maintenance','Reserved'].map(s=>`<option ${sel(s,current)}>${s}</option>`).join(''); }
function statusClass(status){ return String(status).toLowerCase().replace(/\s+/g,'-'); }
function navBtn(id, label, icon){ return `<button class="nav-btn ${state.currentView===id?'active':''}" data-nav="${id}"><span>${icon}</span><span>${label}</span></button>`; }
function stat(label, value){ return `<div class="card stat"><div class="label">${label}</div><div class="value">${value}</div></div>`; }
function sel(a,b){ return a===b ? 'selected' : ''; }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function registerSW(){ if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{}); }
