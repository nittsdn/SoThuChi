/*
  APP SỔ THU CHI – LOGIC
  VERSION: v1.0.1 (Fixed gid + date picker + validation)
  BUILD: 2026-02-02
  CHANGELOG:
  - v1.0.1: Fix gid mapping (Chi=0, loai_chi=4, nguon_tien=5)
  - v1.0.1: Remove auto date picker popup, show current date on button
  - v1.0.1: Add version console debug
  - v1.0.1: Fix CSV parsing with validation
  - v1.0.1: Fix serialToDate and date display
*/

/***********************
 * CONFIG
 ***********************/
const APP_VERSION = 'v1.0.1';
const APP_BUILD = '2026-02-02-001';
const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub';
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// Sheet GID mapping
const SHEET_GID = {
  CHI_TIEU_2026: 0,
  THU_2026: 1,
  TK_DETAIL: 2,
  TK_SESSION: 3,
  LOAI_CHI: 4,
  NGUON_TIEN: 5
};

const LOCAL_STORAGE_KEYS = {
  quickChi: 'quickMoTaChi',
  quickThu: 'quickMoTaThu',
  quickLoaiThu: 'quickLoaiThu',
  darkMode: 'darkMode'
};

/***********************
 * STATE
 ***********************/
const state = {
  tempListChi: [],
  selectedMoTaChi: null,
  selectedNguonChi: null,
  selectedDateChi: new Date(),
  tempThu: 0,
  selectedMoTaThu: null,
  selectedLoaiThu: null,
  selectedNguonThu: null,
  selectedDateThu: new Date(),
  tkInputs: {},
  loaiChi: [],
  nguonTien: [],
  quickChi: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickChi)) || [],
  quickThu: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickThu)) || [],
  quickLoaiThu: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickLoaiThu)) || [],
  darkMode: localStorage.getItem(LOCAL_STORAGE_KEYS.darkMode) === 'true',
  lastChi: null,
  lastThu: null,
  lastTkDate: null,
  soDuLT: 0
};

/***********************
 * INIT
 ***********************/
console.log(`%c🚀 APP START - ${APP_VERSION} (${APP_BUILD})`, 'color: #007aff; font-size: 16px; font-weight: bold;');
document.getElementById('app-version').innerText = `${APP_VERSION} (${APP_BUILD})`;
document.body.classList.toggle('dark', state.darkMode);

init();

async function init() {
  console.log('📦 Init: Loading data...');
  
  try {
    await loadLoaiChi();
    console.log('✅ Loaded loai_chi:', state.loaiChi.length, 'items');
  } catch (e) {
    console.error('❌ Failed to load loai_chi:', e);
  }
  
  try {
    await loadNguonTien();
    console.log('✅ Loaded nguon_tien:', state.nguonTien.length, 'items');
  } catch (e) {
    console.error('❌ Failed to load nguon_tien:', e);
  }
  
  try {
    await loadLastChi();
    console.log('✅ Loaded last chi:', state.lastChi);
  } catch (e) {
    console.error('❌ Failed to load last chi:', e);
    document.getElementById('last-expense').innerText = 'Chưa có chi tiêu nào';
  }
  
  try {
    await loadLastThu();
    console.log('✅ Loaded last thu:', state.lastThu);
  } catch (e) {
    console.error('❌ Failed to load last thu:', e);
    document.getElementById('last-income').innerText = 'Chưa có thu nhập nào';
  }
  
  try {
    await loadTkSummary();
    console.log('✅ Loaded TK summary:', state.soDuLT);
  } catch (e) {
    console.error('❌ Failed to load TK summary:', e);
  }
  
  renderQuickChi();
  renderQuickThu();
  renderQuickLoaiThu();
  setupTabNavigation();
  setupDateSelectors();
  setupSettings();
  setupModals();
  setupSwipeGestures();
  
  console.log('✅ Init complete');
}

/***********************
 * LOAD DATA FROM SHEET
 ***********************/
async function loadLoaiChi() {
  console.log('📡 Fetching loai_chi (gid=' + SHEET_GID.LOAI_CHI + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.LOAI_CHI}&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
  
  state.loaiChi = rows.map(r => {
    const cols = r.split(',');
    return { 
      moTa: cols[1] || '',
      active: cols[5] === 'TRUE' 
    };
  }).filter(c => c.active && c.moTa);

  // Populate dropdown
  const select = document.getElementById('chi-mota-select');
  select.innerHTML = '<option value="">Chọn mô tả chi khác</option>';
  state.loaiChi.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.moTa;
    opt.textContent = c.moTa;
    select.appendChild(opt);
  });
}

async function loadNguonTien() {
  console.log('📡 Fetching nguon_tien (gid=' + SHEET_GID.NGUON_TIEN + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.NGUON_TIEN}&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
  
  state.nguonTien = rows.map(r => {
    const cols = r.split(',');
    return { 
      ten: cols[0] || '',
      active: cols[4] === 'TRUE' 
    };
  }).filter(n => n.active && n.ten);

  // Populate selects
  ['nguon-tien-chi', 'nguon-tien-thu'].forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">Chọn nguồn tiền</option>';
    state.nguonTien.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.ten;
      opt.textContent = n.ten;
      select.appendChild(opt);
    });
  });
}

async function loadLastChi() {
  console.log('📡 Fetching last chi (gid=' + SHEET_GID.CHI_TIEU_2026 + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.CHI_TIEU_2026}&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
  
  if (rows.length === 0) {
    throw new Error('No data in Chi sheet');
  }
  
  const last = rows[rows.length - 1].split(',');
  
  // Validate data
  if (last.length < 7) {
    throw new Error('Invalid Chi row structure');
  }
  
  state.lastChi = {
    moTa: last[1] || 'N/A',
    ngaySerial: last[5] || '0',
    nghin: last[3] || '0',
    vnd: last[4] || '0',
    soDu: last[6] || '0'
  };
  
  const ngay = serialToDate(state.lastChi.ngaySerial);
  const thu = getThuFromDate(ngay);
  
  document.getElementById('last-expense').innerText = 
    `Chi cuối ${state.lastChi.moTa} Thứ ${thu} ngày ${formatDate(ngay)} tổng ${state.lastChi.nghin} = ${formatNumber(state.lastChi.vnd)}, số dư ${formatNumber(state.lastChi.soDu)}`;
}

async function loadLastThu() {
  console.log('📡 Fetching last thu (gid=' + SHEET_GID.THU_2026 + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.THU_2026}&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
  
  if (rows.length === 0) {
    throw new Error('No data in Thu sheet');
  }
  
  const last = rows[rows.length - 1].split(',');
  
  if (last.length < 3) {
    throw new Error('Invalid Thu row structure');
  }
  
  state.lastThu = {
    moTa: last[2] || 'N/A',
    ngaySerial: last[1] || '0',
    vnd: last[0] || '0'
  };
  
  const ngay = serialToDate(state.lastThu.ngaySerial);
  const thu = getThuFromDate(ngay);
  
  document.getElementById('last-income').innerText = 
    `Thu cuối ${state.lastThu.moTa} Thứ ${thu} ngày ${formatDate(ngay)} tổng ${formatNumber(state.lastThu.vnd)}`;
}

async function loadTkSummary() {
  console.log('📡 Fetching TK summary (gid=' + SHEET_GID.TK_SESSION + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.TK_SESSION}&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
  
  if (rows.length === 0) {
    console.warn('⚠️ No TK session data, using defaults');
    state.lastTkDate = new Date();
    state.soDuLT = 0;
  } else {
    const last = rows[rows.length - 1].split(',');
    state.lastTkDate = serialToDate(last[1] || '0');
    state.soDuLT = parseFloat(last[2]) || 0;
  }

  document.getElementById('tk-summary').innerText = `Số dư LT: ${formatNumber(state.soDuLT)}`;

  // Populate TK inputs
  const box = document.getElementById('tk-inputs');
  box.innerHTML = '';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.className = 'row';
    const input = document.createElement('input');
    input.type = 'number';
    input.dataset.nguon = n.ten;
    input.placeholder = 'Số dư TT';
    input.addEventListener('input', e => {
      state.tkInputs[n.ten] = parseFloat(e.target.value) || 0;
      validateTk();
    });
    
    const label = document.createElement('label');
    label.textContent = n.ten + ': ';
    label.appendChild(input);
    div.appendChild(label);
    box.appendChild(div);
  });
}

/***********************
 * HELPERS
 ***********************/
function parseCSVRows(text) {
  return text.split('\n').filter(row => row.trim() !== '');
}

function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return '0';
  const [int, dec] = n.toString().split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
}

function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'N/A';
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getThuFromDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'N/A';
  }
  const days = ['Chủ nhật', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
  return days[date.getDay()];
}

function serialToDate(serial) {
  const s = parseFloat(serial);
  if (isNaN(s) || s <= 0) {
    console.warn('⚠️ Invalid serial date:', serial);
    return new Date(); // fallback to today
  }
  const base = new Date(1899, 11, 30);
  base.setDate(base.getDate() + Math.floor(s));
  return base;
}

function dateToISO(date) {
  return date.toISOString().slice(0, 10);
}

/***********************
 * CHI FLOW
 ***********************/
const chiInput = document.getElementById('chi-input');
chiInput.addEventListener('keydown', e => {
  if (e.key === '+') {
    e.preventDefault();
    addTempChi();
  }
});

document.getElementById('add-temp').onclick = addTempChi;

function addTempChi() {
  const v = parseFloat(chiInput.value.replace(',', '.'));
  if (!isNaN(v) && v > 0) {
    state.tempListChi.push(v);
    chiInput.value = '';
    renderChiPreview();
    validateChi();
  }
}

function renderChiPreview() {
  const total = state.tempListChi.reduce((a, b) => a + b, 0);
  document.getElementById('chi-preview').innerText =
    state.tempListChi.map(v => formatNumber(v) + '.000').join(' + ') + 
    (state.tempListChi.length > 0 ? ` = ${formatNumber(total)}.000` : '');
}

document.getElementById('clear-last').onclick = () => {
  state.tempListChi.pop();
  renderChiPreview();
  validateChi();
};

document.getElementById('clear-all').onclick = () => {
  state.tempListChi = [];
  state.selectedMoTaChi = null;
  renderChiPreview();
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  validateChi();
};

function renderQuickChi() {
  const box = document.getElementById('chi-chips');
  box.innerHTML = '';
  state.quickChi.forEach(moTa => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = moTa;
    chip.onclick = () => selectMoTaChi(moTa);
    box.appendChild(chip);
  });
}

function selectMoTaChi(moTa) {
  document.querySelectorAll('#chi-chips .chip').forEach(c => {
    c.classList.toggle('active', c.textContent === moTa);
  });
  state.selectedMoTaChi = moTa;
  validateChi();
}

document.getElementById('chi-mota-select').onchange = e => {
  if (e.target.value) {
    state.selectedMoTaChi = e.target.value;
    document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
    validateChi();
  }
};

document.getElementById('nguon-tien-chi').onchange = e => {
  state.selectedNguonChi = e.target.value;
  validateChi();
};

function validateChi() {
  const ok = state.tempListChi.length > 0 && state.selectedMoTaChi && state.selectedNguonChi;
  document.getElementById('btn-add-chi').disabled = !ok;
}

document.getElementById('btn-add-chi').onclick = async () => {
  const formula = '=' + state.tempListChi.join('+');
  const payload = {
    type: 'chi',
    payload: {
      ngay: dateToISO(state.selectedDateChi),
      soTienNghinVND: formula,
      moTa: state.selectedMoTaChi,
      nguon: state.selectedNguonChi
    }
  };
  
  console.log('📤 Sending chi:', payload);
  await sendToGAS(payload);
  
  alert(`Đã thêm chi tiêu ${state.selectedMoTaChi} ${state.tempListChi.map(v => formatNumber(v) + '.000').join(' + ')} = ${formatNumber(state.tempListChi.reduce((a,b)=>a+b,0))}.000 nguồn ${state.selectedNguonChi} Thứ ${getThuFromDate(state.selectedDateChi)} ngày ${formatDate(state.selectedDateChi)} thành công.`);
  
  resetChiForm();
  await loadLastChi();
};

function resetChiForm() {
  state.tempListChi = [];
  state.selectedMoTaChi = null;
  state.selectedNguonChi = null;
  chiInput.value = '';
  renderChiPreview();
  document.getElementById('chi-mota-select').value = '';
  document.getElementById('nguon-tien-chi').value = '';
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  validateChi();
}

/***********************
 * THU FLOW
 ***********************/
const thuInput = document.getElementById('thu-input');
thuInput.addEventListener('input', () => {
  state.tempThu = parseFloat(thuInput.value) || 0;
  validateThu();
});

function renderQuickThu() {
  const box = document.getElementById('thu-chips');
  box.innerHTML = '';
  state.quickThu.forEach(moTa => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = moTa;
    chip.onclick = () => {
      document.getElementById('thu-mota-input').value = moTa;
      state.selectedMoTaThu = moTa;
      validateThu();
    };
    box.appendChild(chip);
  });
}

document.getElementById('thu-mota-input').addEventListener('input', e => {
  state.selectedMoTaThu = e.target.value;
  validateThu();
});

function renderQuickLoaiThu() {
  const box = document.getElementById('loai-thu-chips');
  box.innerHTML = '';
  state.quickLoaiThu.forEach(loai => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = loai;
    chip.onclick = () => {
      document.getElementById('loai-thu-input').value = loai;
      state.selectedLoaiThu = loai;
      validateThu();
    };
    box.appendChild(chip);
  });
}

document.getElementById('loai-thu-input').addEventListener('input', e => {
  state.selectedLoaiThu = e.target.value;
  validateThu();
});

document.getElementById('nguon-tien-thu').onchange = e => {
  state.selectedNguonThu = e.target.value;
  validateThu();
};

function validateThu() {
  const ok = state.tempThu > 0 && state.selectedMoTaThu && state.selectedLoaiThu && state.selectedNguonThu;
  document.getElementById('btn-add-thu').disabled = !ok;
}

document.getElementById('btn-add-thu').onclick = async () => {
  const payload = {
    type: 'thu',
    payload: {
      ngay: dateToISO(state.selectedDateThu),
      soTienVND: state.tempThu,
      moTa: state.selectedMoTaThu,
      loaiThu: state.selectedLoaiThu,
      nguon: state.selectedNguonThu
    }
  };
  
  console.log('📤 Sending thu:', payload);
  await sendToGAS(payload);
  
  alert(`Đã thêm thu ${state.selectedMoTaThu} ${formatNumber(state.tempThu)} nguồn ${state.selectedNguonThu} Thứ ${getThuFromDate(state.selectedDateThu)} ngày ${formatDate(state.selectedDateThu)} thành công.`);
  
  resetThuForm();
  await loadLastThu();
};

function resetThuForm() {
  state.tempThu = 0;
  state.selectedMoTaThu = null;
  state.selectedLoaiThu = null;
  state.selectedNguonThu = null;
  thuInput.value = '';
  document.getElementById('thu-mota-input').value = '';
  document.getElementById('loai-thu-input').value = '';
  document.getElementById('nguon-tien-thu').value = '';
  validateThu();
}

/***********************
 * TỔNG KẾT FLOW
 ***********************/
function validateTk() {
  const allFilled = state.nguonTien.every(n => 
    state.tkInputs[n.ten] !== undefined && state.tkInputs[n.ten] >= 0
  );
  document.getElementById('btn-check-tk').disabled = !allFilled;
}

document.getElementById('btn-check-tk').onclick = async () => {
  const soDuTT = Object.values(state.tkInputs).reduce((a, b) => a + b, 0);
  const chenhLech = state.soDuLT - soDuTT;
  
  const fromDate = new Date(state.lastTkDate.getTime() + 86400000);
  document.getElementById('tk-result').innerText = 
    `Từ ngày ${formatDate(fromDate)} đến ngày ${formatDate(new Date())}\nSố dư LT: ${formatNumber(state.soDuLT)}\nSố dư TT: ${formatNumber(soDuTT)}\nChênh lệch: ${formatNumber(Math.abs(chenhLech))} (${chenhLech < 0 ? 'Thừa' : 'Thiếu'})`;

  console.log('🧮 TK Check:', { soDuLT: state.soDuLT, soDuTT, chenhLech });

  const detailBox = document.getElementById('tk-detail-list');
  detailBox.innerHTML = '';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.innerText = `${n.ten}: ${formatNumber(state.tkInputs[n.ten])} `;
    const btn = document.createElement('button');
    btn.textContent = 'Xem chi tiết';
    btn.onclick = () => loadChiDetailForTk(n.ten);
    div.appendChild(btn);
    detailBox.appendChild(div);
  });

  document.getElementById('btn-confirm-tk').disabled = false;
};

async function loadChiDetailForTk(nguon) {
  console.log('📋 Loading chi detail for:', nguon);
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '<h4>Chi tiết chi từ ' + nguon + '</h4><p>Tính năng đang phát triển...</p>';
  showModal();
}

document.getElementById('btn-confirm-tk').onclick = async () => {
  const soDuTT = Object.values(state.tkInputs).reduce((a, b) => a + b, 0);
  const payload = {
    type: 'tk',
    payload: {
      ngay_tk: dateToISO(new Date()),
      so_du_lt: state.soDuLT,
      chi_tiet: state.nguonTien.map(n => ({ 
        nguon_tien: n.ten, 
        so_tien: state.tkInputs[n.ten] 
      }))
    }
  };
  
  console.log('📤 Sending TK:', payload);
  await sendToGAS(payload);
  
  alert(`Đã tổng kết thành công kỳ từ ngày ${formatDate(state.lastTkDate)} - ${formatDate(new Date())} số dư LT: ${formatNumber(state.soDuLT)} TT: ${formatNumber(soDuTT)} chênh lệch: ${formatNumber(Math.abs(state.soDuLT - soDuTT))}`);
  
  resetTkForm();
  await loadTkSummary();
};

function resetTkForm() {
  state.tkInputs = {};
  document.querySelectorAll('#tk-inputs input').forEach(inp => inp.value = '');
  document.getElementById('tk-result').innerText = '';
  document.getElementById('tk-detail-list').innerHTML = '';
  document.getElementById('btn-check-tk').disabled = true;
  document.getElementById('btn-confirm-tk').disabled = false;
}

/***********************
 * SETTINGS FLOW
 ***********************/
function setupSettings() {
  document.getElementById('dark-mode').checked = state.darkMode;
  document.getElementById('dark-mode').onchange = e => {
    state.darkMode = e.target.checked;
    localStorage.setItem(LOCAL_STORAGE_KEYS.darkMode, state.darkMode);
    document.body.classList.toggle('dark', state.darkMode);
    console.log('🌙 Dark mode:', state.darkMode);
  };

  document.getElementById('manage-quick-chi').onclick = () => manageQuick('chi');
  document.getElementById('manage-quick-thu').onclick = () => manageQuick('thu');
  document.getElementById('manage-quick-loai-thu').onclick = () => manageQuick('loaiThu');

  document.getElementById('reset-settings').onclick = () => {
    if (confirm('Xóa toàn bộ cài đặt và tải lại trang?')) {
      console.log('🔄 Reset settings');
      localStorage.clear();
      location.reload();
    }
  };
  
  renderQuickChi();
  renderQuickThu();
  renderQuickLoaiThu();
}

function manageQuick(type) {
  console.log('⚙️ Manage quick:', type);
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '<h4>Quản lý quick ' + type + '</h4><p>Tính năng đang phát triển...</p>';
  showModal();
}

function renderQuickChi() {
  const box = document.getElementById('quick-chi-list');
  box.innerHTML = state.quickChi.join(', ') || 'Chưa thiết lập';
}

function renderQuickThu() {
  const box = document.getElementById('quick-thu-list');
  box.innerHTML = state.quickThu.join(', ') || 'Chưa thiết lập';
}

function renderQuickLoaiThu() {
  const box = document.getElementById('quick-loai-thu-list');
  box.innerHTML = state.quickLoaiThu.join(', ') || 'Chưa thiết lập';
}

/***********************
 * DATE SELECTORS & SWIPE
 ***********************/
function setupDateSelectors() {
  // Chi
  document.getElementById('prev-day').onclick = () => changeDate('chi', -1);
  document.getElementById('next-day').onclick = () => changeDate('chi', 1);
  document.getElementById('current-day').onclick = () => showDatePicker('chi');
  updateDateDisplay('chi');

  // Thu
  document.getElementById('prev-day-thu').onclick = () => changeDate('thu', -1);
  document.getElementById('next-day-thu').onclick = () => changeDate('thu', 1);
  document.getElementById('current-day-thu').onclick = () => showDatePicker('thu');
  updateDateDisplay('thu');
}

function changeDate(type, delta) {
  const key = type === 'chi' ? 'selectedDateChi' : 'selectedDateThu';
  state[key].setDate(state[key].getDate() + delta);
  updateDateDisplay(type);
  console.log(`📅 Date ${type}:`, formatDate(state[key]));
}

function updateDateDisplay(type) {
  const date = state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu'];
  const btn = document.getElementById(`current-day${type === 'thu' ? '-thu' : ''}`);
  btn.textContent = formatDate(date);
}

function showDatePicker(type) {
  const modal = document.getElementById('date-picker-modal');
  modal.style.display = 'block';
  
  const picker = document.getElementById('date-picker');
  picker.value = dateToISO(state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu']);
  
  document.getElementById('confirm-date').onclick = () => {
    state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu'] = new Date(picker.value);
    updateDateDisplay(type);
    modal.style.display = 'none';
    console.log(`📅 Date picked (${type}):`, picker.value);
  };
}

function setupSwipeGestures() {
  let touchStartX = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });
  
  document.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(deltaX) > 100) {
      const activeTab = document.querySelector('.screen.active').id;
      if (activeTab === 'chi-screen') changeDate('chi', deltaX > 0 ? -1 : 1);
      if (activeTab === 'thu-screen') changeDate('thu', deltaX > 0 ? -1 : 1);
    }
  });
}

/***********************
 * MODALS
 ***********************/
function setupModals() {
  document.querySelector('.close').onclick = hideModal;
  document.querySelector('.close-date').onclick = () => {
    document.getElementById('date-picker-modal').style.display = 'none';
  };

  document.getElementById('add-new-mota-chi').onclick = () => {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <h4>Thêm mô tả chi mới</h4>
      <input id="new-mota" placeholder="Mô tả" style="width: 100%; margin-bottom: 8px;">
      <input id="new-phanloai" placeholder="Phân loại" style="width: 100%; margin-bottom: 8px;">
      <input id="new-nhom" placeholder="Nhóm" style="width: 100%; margin-bottom: 8px;">
      <button id="confirm-new-chi">Thêm</button>
    `;
    showModal();
    
    document.getElementById('confirm-new-chi').onclick = async () => {
      const payload = {
        type: 'insert_loai_chi',
        payload: {
          mo_ta_chi: document.getElementById('new-mota').value,
          phan_loai: document.getElementById('new-phanloai').value,
          nhom: document.getElementById('new-nhom').value,
          icon: '❓'
        }
      };
      
      console.log('📤 Sending new loai chi:', payload);
      await sendToGAS(payload);
      await loadLoaiChi();
      hideModal();
      alert('Đã thêm mô tả chi mới');
    };
  };

  document.getElementById('add-new-mota-thu').onclick = () => {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = '<h4>Thêm mô tả thu</h4><p>Nhập trực tiếp vào ô "Mô tả thu nhập"</p>';
    showModal();
  };
}

/***********************
 * TAB NAVIGATION
 ***********************/
function setupTabNavigation() {
  document.querySelectorAll('.tab-bar button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(btn.dataset.tab).classList.add('active');
      document.querySelectorAll('.tab-bar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      console.log('🔀 Tab:', btn.dataset.tab);
    };
  });
  
  // Default to Chi
  document.querySelector('.tab-bar button[data-tab="chi-screen"]').click();
}

/***********************
 * GAS INTEGRATION
 ***********************/
async function sendToGAS(payload) {
  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('✅ Sent to GAS:', payload.type);
  } catch (e) {
    console.error('❌ GAS error:', e);
    throw e;
  }
}

/***********************
 * UTILITY
 ***********************/
function showModal() {
  document.getElementById('modal').style.display = 'block';
}

function hideModal() {
  document.getElementById('modal').style.display = 'none';
}