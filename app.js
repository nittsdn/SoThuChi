/*
  APP SỔ THU CHI – LOGIC
  VERSION: v1.1.0 (Merged UI/UX + Fixed CSV Parsing)
  BUILD: 2026-02-02-002
  CHANGELOG v1.1.0:
  - Fixed CSV parsing with regex (handle quotes and commas)
  - Loop backward to find last valid row
  - Improved data cleaning (remove quotes, dots, commas)
  - Native date picker (no modal)
  - Gradient buttons design
  - Auto-focus after add temp
  - Loading states with text change
  - Auto-hide messages after 3s
  - Better error handling with fallback
*/

/***********************
 * CONFIG
 ***********************/
const APP_VERSION = 'v1.1.0';
const APP_BUILD = '2026-02-02-002';
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
document.getElementById('app-version').innerText = `${APP_VERSION}`;
document.body.classList.toggle('dark', state.darkMode);

init();

async function init() {
  console.log('📦 Init: Loading data...');
  
  // Set today's date for both pickers
  initDates();
  
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
  setupDateControls();
  setupChiFlow();
  setupThuFlow();
  setupTkFlow();
  setupSettings();
  setupModals();
  
  console.log('✅ Init complete');
}

/***********************
 * DATE MANAGEMENT
 ***********************/
function initDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('chi-date').value = today;
  document.getElementById('thu-date').value = today;
  console.log('📅 Set dates to today:', today);
}

function setupDateControls() {
  // Chi date controls
  document.getElementById('chi-date').addEventListener('change', e => {
    state.selectedDateChi = new Date(e.target.value);
    console.log('📅 Chi date changed:', formatDate(state.selectedDateChi));
  });
  
  document.getElementById('chi-prev-day').onclick = () => changeDate('chi', -1);
  document.getElementById('chi-next-day').onclick = () => changeDate('chi', 1);
  
  // Thu date controls
  document.getElementById('thu-date').addEventListener('change', e => {
    state.selectedDateThu = new Date(e.target.value);
    console.log('📅 Thu date changed:', formatDate(state.selectedDateThu));
  });
  
  document.getElementById('thu-prev-day').onclick = () => changeDate('thu', -1);
  document.getElementById('thu-next-day').onclick = () => changeDate('thu', 1);
}

function changeDate(type, delta) {
  const input = document.getElementById(`${type}-date`);
  const date = new Date(input.value);
  date.setDate(date.getDate() + delta);
  input.value = date.toISOString().split('T')[0];
  
  if (type === 'chi') {
    state.selectedDateChi = date;
  } else {
    state.selectedDateThu = date;
  }
  
  console.log(`📅 ${type} date changed to:`, formatDate(date));
}

/***********************
 * LOAD DATA FROM SHEET
 ***********************/
function parseCSVWithQuotes(text) {
  // Split CSV handling quoted values with commas inside
  return text.split('\n').map(row => 
    row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
  );
}

function cleanValue(value) {
  if (!value) return '';
  return value.replace(/["'\s]/g, '');
}

function cleanNumber(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/[,.\s"]/g, '')) || 0;
}

async function loadLoaiChi() {
  console.log('📡 Fetching loai_chi (gid=' + SHEET_GID.LOAI_CHI + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.LOAI_CHI}&single=true&output=csv`);
  const text = await res.text();
  const rows = parseCSVWithQuotes(text);
  
  state.loaiChi = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 6) continue;
    
    const moTa = cleanValue(row[1]);
    const active = cleanValue(row[5]) === 'TRUE';
    
    if (active && moTa) {
      state.loaiChi.push({ moTa });
    }
  }

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
  const rows = parseCSVWithQuotes(text);
  
  state.nguonTien = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;
    
    const ten = cleanValue(row[0]);
    const active = cleanValue(row[4]) === 'TRUE';
    
    if (active && ten) {
      state.nguonTien.push({ ten });
    }
  }

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
  const rows = parseCSVWithQuotes(text);
  
  // Loop backward from end to find last valid chi
  for (let i = rows.length - 1; i > 0; i--) {
    const row = rows[i];
    if (row.length < 7) continue;
    
    // Chi_Tieu_2026 structure:
    // 0=IDChi, 1=mo_ta_chi, 2=Nguồn tiền, 3=Nghìn VND, 4=Số tiền vnđ, 5=Ngày, 6=Số dư lý thuyết
    const vnd = cleanNumber(row[4]);
    
    if (vnd > 0) {
      state.lastChi = {
        moTa: cleanValue(row[1]) || 'N/A',
        ngaySerial: cleanValue(row[5]) || '0',
        nghin: cleanValue(row[3]) || '0',
        vnd: vnd,
        soDu: cleanNumber(row[6])
      };
      
      const ngay = serialToDate(state.lastChi.ngaySerial);
      const thu = getThuFromDate(ngay);
      
      document.getElementById('last-expense').innerText = 
        `Chi cuối: ${state.lastChi.moTa} - Thứ ${thu} ngày ${formatDate(ngay)} - ${state.lastChi.nghin} = ${formatNumber(state.lastChi.vnd)}, số dư ${formatNumber(state.lastChi.soDu)}`;
      
      console.log('✅ Found last chi at row', i, ':', state.lastChi);
      return;
    }
  }
  
  console.warn('⚠️ No valid chi data found');
  document.getElementById('last-expense').innerText = 'Chưa có chi tiêu nào';
}

async function loadLastThu() {
  console.log('📡 Fetching last thu (gid=' + SHEET_GID.THU_2026 + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.THU_2026}&single=true&output=csv`);
  const text = await res.text();
  const rows = parseCSVWithQuotes(text);
  
  // Loop backward from end to find last valid thu
  for (let i = rows.length - 1; i > 0; i--) {
    const row = rows[i];
    if (row.length < 3) continue;
    
    // Thu_2026 structure:
    // 0=Thu, 1=Ngày, 2=Mô tả, 3=Nguồn tiền, 4=Loại thu, 5=Tổng thu, 6=IDThu
    const vnd = cleanNumber(row[0]);
    
    if (vnd > 0) {
      state.lastThu = {
        moTa: cleanValue(row[2]) || 'N/A',
        ngaySerial: cleanValue(row[1]) || '0',
        vnd: vnd
      };
      
      const ngay = serialToDate(state.lastThu.ngaySerial);
      const thu = getThuFromDate(ngay);
      
      document.getElementById('last-income').innerText = 
        `Thu cuối: ${state.lastThu.moTa} - Thứ ${thu} ngày ${formatDate(ngay)} - ${formatNumber(state.lastThu.vnd)}`;
      
      console.log('✅ Found last thu at row', i, ':', state.lastThu);
      return;
    }
  }
  
  console.warn('⚠️ No valid thu data found');
  document.getElementById('last-income').innerText = 'Chưa có thu nhập nào';
}

async function loadTkSummary() {
  console.log('📡 Fetching TK summary (gid=' + SHEET_GID.TK_SESSION + ')...');
  const res = await fetch(`${SHEET_BASE}?gid=${SHEET_GID.TK_SESSION}&single=true&output=csv`);
  const text = await res.text();
  const rows = parseCSVWithQuotes(text);
  
  if (rows.length <= 1) {
    console.warn('⚠️ No TK session data, using defaults');
    state.lastTkDate = new Date();
    state.soDuLT = 0;
  } else {
    const last = rows[rows.length - 1];
    state.lastTkDate = serialToDate(cleanValue(last[1]) || '0');
    state.soDuLT = cleanNumber(last[2]);
  }

  document.getElementById('tk-summary').innerText = `Số dư LT: ${formatNumber(state.soDuLT)}`;

  // Populate TK inputs
  const box = document.getElementById('tk-inputs');
  box.innerHTML = '';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.className = 'input-row';
    
    const label = document.createElement('label');
    label.textContent = n.ten + ': ';
    label.style.flex = '1';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.dataset.nguon = n.ten;
    input.placeholder = 'Số dư TT';
    input.style.flex = '1';
    input.addEventListener('input', e => {
      state.tkInputs[n.ten] = parseFloat(e.target.value) || 0;
      validateTk();
    });
    
    label.appendChild(input);
    div.appendChild(label);
    box.appendChild(div);
  });
}

/***********************
 * HELPERS
 ***********************/
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
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
  const days = ['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
  return days[date.getDay()];
}

function serialToDate(serial) {
  const s = parseFloat(serial);
  if (isNaN(s) || s <= 0) {
    console.warn('⚠️ Invalid serial date:', serial);
    return new Date();
  }
  const base = new Date(1899, 11, 30);
  base.setDate(base.getDate() + Math.floor(s));
  return base;
}

function dateToISO(date) {
  return date.toISOString().split('T')[0];
}

function showMessage(type, text, duration = 3000) {
  const msg = document.getElementById(`${type}-message`);
  msg.textContent = text;
  msg.className = 'status-message show success';
  
  setTimeout(() => {
    msg.className = 'status-message';
  }, duration);
}

function showError(type, text) {
  const msg = document.getElementById(`${type}-message`);
  msg.textContent = text;
  msg.className = 'status-message show error';
}

/***********************
 * CHI FLOW
 ***********************/
function setupChiFlow() {
  const chiInput = document.getElementById('chi-input');
  
  // Enter or + key to add
  chiInput.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === 'Enter') {
      e.preventDefault();
      addTempChi();
    }
  });
  
  document.getElementById('add-temp').onclick = addTempChi;
  document.getElementById('clear-last').onclick = clearLastChi;
  document.getElementById('clear-all').onclick = clearAllChi;
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
  document.getElementById('btn-add-chi').onclick = submitChi;
  
  renderChiChips();
}

function addTempChi() {
  const chiInput = document.getElementById('chi-input');
  const v = parseFloat(chiInput.value.replace(',', '.'));
  
  if (!isNaN(v) && v > 0) {
    state.tempListChi.push(v);
    chiInput.value = '';
    chiInput.focus(); // Auto focus for next input
    renderChiPreview();
    validateChi();
    console.log('➕ Added to chi stack:', v, '→', state.tempListChi);
  }
}

function clearLastChi() {
  state.tempListChi.pop();
  renderChiPreview();
  validateChi();
  console.log('🗑️ Removed last from chi stack');
}

function clearAllChi() {
  state.tempListChi = [];
  state.selectedMoTaChi = null;
  renderChiPreview();
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  document.getElementById('chi-mota-select').value = '';
  validateChi();
  console.log('🗑️ Cleared all chi');
}

function renderChiPreview() {
  const preview = document.getElementById('chi-preview');
  if (state.tempListChi.length === 0) {
    preview.textContent = '';
    return;
  }
  
  const total = state.tempListChi.reduce((a, b) => a + b, 0);
  preview.textContent = `Đang cộng: ${state.tempListChi.join(' + ')} = ${formatNumber(total)}.000 đ`;
}

function renderChiChips() {
  const box = document.getElementById('chi-chips');
  box.innerHTML = '';
  
  state.quickChi.forEach(moTa => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = moTa;
    chip.onclick = () => selectMoTaChi(moTa, chip);
    box.appendChild(chip);
  });
}

function selectMoTaChi(moTa, chipEl) {
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  state.selectedMoTaChi = moTa;
  document.getElementById('chi-mota-select').value = '';
  validateChi();
  console.log('✅ Selected chi mô tả:', moTa);
}

function validateChi() {
  const ok = state.tempListChi.length > 0 && state.selectedMoTaChi && state.selectedNguonChi;
  document.getElementById('btn-add-chi').disabled = !ok;
}

async function submitChi() {
  const btn = document.getElementById('btn-add-chi');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'ĐANG GỬI...';
  
  try {
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
    
    const total = state.tempListChi.reduce((a,b)=>a+b,0);
    showMessage('chi', `✅ Đã lưu chi ${state.selectedMoTaChi}: ${formatNumber(total)}.000 đ`);
    
    resetChiForm();
    
    // Reload last chi after 1s
    setTimeout(() => loadLastChi(), 1000);
    
  } catch (e) {
    console.error('❌ Submit chi failed:', e);
    showError('chi', '❌ Lỗi: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function resetChiForm() {
  state.tempListChi = [];
  state.selectedMoTaChi = null;
  state.selectedNguonChi = null;
  document.getElementById('chi-input').value = '';
  document.getElementById('chi-mota-select').value = '';
  document.getElementById('nguon-tien-chi').value = '';
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  renderChiPreview();
  validateChi();
}

/***********************
 * THU FLOW
 ***********************/
function setupThuFlow() {
  const thuInput = document.getElementById('thu-input');
  
  thuInput.addEventListener('input', () => {
    state.tempThu = parseFloat(thuInput.value) || 0;
    validateThu();
  });
  
  document.getElementById('thu-mota-input').addEventListener('input', e => {
    state.selectedMoTaThu = e.target.value;
    validateThu();
  });
  
  document.getElementById('loai-thu-input').addEventListener('input', e => {
    state.selectedLoaiThu = e.target.value;
    validateThu();
  });
  
  document.getElementById('nguon-tien-thu').onchange = e => {
    state.selectedNguonThu = e.target.value;
    validateThu();
  };
  
  document.getElementById('btn-add-thu').onclick = submitThu;
  document.getElementById('add-new-mota-thu').onclick = () => {
    const moTa = document.getElementById('thu-mota-input').value.trim();
    if (moTa && !state.quickThu.includes(moTa) && state.quickThu.length < 8) {
      state.quickThu.push(moTa);
      localStorage.setItem(LOCAL_STORAGE_KEYS.quickThu, JSON.stringify(state.quickThu));
      renderQuickThu();
      showMessage('thu', `✅ Đã thêm "${moTa}" vào danh sách nhanh`);
    }
  };
  
  renderThuChips();
  renderLoaiThuChips();
}

function renderThuChips() {
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

function renderLoaiThuChips() {
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

function validateThu() {
  const ok = state.tempThu > 0 && state.selectedMoTaThu && state.selectedLoaiThu && state.selectedNguonThu;
  document.getElementById('btn-add-thu').disabled = !ok;
}

async function submitThu() {
  const btn = document.getElementById('btn-add-thu');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'ĐANG GỬI...';
  
  try {
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
    
    showMessage('thu', `✅ Đã lưu thu ${state.selectedMoTaThu}: ${formatNumber(state.tempThu)} đ`);
    
    resetThuForm();
    
    // Reload last thu after 1s
    setTimeout(() => loadLastThu(), 1000);
    
  } catch (e) {
    console.error('❌ Submit thu failed:', e);
    showError('thu', '❌ Lỗi: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function resetThuForm() {
  state.tempThu = 0;
  state.selectedMoTaThu = null;
  state.selectedLoaiThu = null;
  state.selectedNguonThu = null;
  document.getElementById('thu-input').value = '';
  document.getElementById('thu-mota-input').value = '';
  document.getElementById('loai-thu-input').value = '';
  document.getElementById('nguon-tien-thu').value = '';
  validateThu();
}

/***********************
 * TỔNG KẾT FLOW
 ***********************/
function setupTkFlow() {
  document.getElementById('btn-check-tk').onclick = checkTk;
  document.getElementById('btn-confirm-tk').onclick = confirmTk;
}

function validateTk() {
  const allFilled = state.nguonTien.every(n => 
    state.tkInputs[n.ten] !== undefined && state.tkInputs[n.ten] >= 0
  );
  document.getElementById('btn-check-tk').disabled = !allFilled;
}

async function checkTk() {
  const soDuTT = Object.values(state.tkInputs).reduce((a, b) => a + b, 0);
  const chenhLech = state.soDuLT - soDuTT;
  
  const fromDate = new Date(state.lastTkDate.getTime() + 86400000);
  document.getElementById('tk-result').innerText = 
    `Từ ngày ${formatDate(fromDate)} đến ngày ${formatDate(new Date())}\n\nSố dư LT: ${formatNumber(state.soDuLT)} đ\nSố dư TT: ${formatNumber(soDuTT)} đ\n\nChênh lệch: ${formatNumber(Math.abs(chenhLech))} đ (${chenhLech < 0 ? 'Thừa' : 'Thiếu'})`;

  console.log('🧮 TK Check:', { soDuLT: state.soDuLT, soDuTT, chenhLech });

  const detailBox = document.getElementById('tk-detail-list');
  detailBox.innerHTML = '<h4 style="margin: 16px 0 8px 0; font-size: 14px;">Chi tiết từng nguồn:</h4>';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    div.innerHTML = `<strong>${n.ten}:</strong> ${formatNumber(state.tkInputs[n.ten])} đ`;
    detailBox.appendChild(div);
  });

  document.getElementById('btn-confirm-tk').disabled = false;
}

async function confirmTk() {
  const btn = document.getElementById('btn-confirm-tk');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'ĐANG GỬI...';
  
  try {
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
    
    alert(`✅ Đã tổng kết thành công!\n\nKỳ: ${formatDate(state.lastTkDate)} - ${formatDate(new Date())}\nSố dư LT: ${formatNumber(state.soDuLT)} đ\nSố dư TT: ${formatNumber(soDuTT)} đ\nChênh lệch: ${formatNumber(Math.abs(state.soDuLT - soDuTT))} đ`);
    
    resetTkForm();
    
    // Reload summary after 1s
    setTimeout(() => loadTkSummary(), 1000);
    
  } catch (e) {
    console.error('❌ Confirm TK failed:', e);
    alert('❌ Lỗi: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function resetTkForm() {
  state.tkInputs = {};
  document.querySelectorAll('#tk-inputs input').forEach(inp => inp.value = '');
  document.getElementById('tk-result').innerText = '';
  document.getElementById('tk-detail-list').innerHTML = '';
  document.getElementById('btn-check-tk').disabled = true;
  document.getElementById('btn-confirm-tk').disabled = true;
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
  
  updateSettingsDisplay();
}

function updateSettingsDisplay() {
  document.getElementById('quick-chi-list').textContent = state.quickChi.join(', ') || 'Chưa thiết lập';
  document.getElementById('quick-thu-list').textContent = state.quickThu.join(', ') || 'Chưa thiết lập';
  document.getElementById('quick-loai-thu-list').textContent = state.quickLoaiThu.join(', ') || 'Chưa thiết lập';
}

function renderQuickChi() {
  updateSettingsDisplay();
  renderChiChips();
}

function renderQuickThu() {
  updateSettingsDisplay();
  renderThuChips();
}

function renderQuickLoaiThu() {
  updateSettingsDisplay();
  renderLoaiThuChips();
}

function manageQuick(type) {
  console.log('⚙️ Manage quick:', type);
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '<h4>Quản lý danh sách nhanh</h4><p>Tính năng đang phát triển...</p>';
  showModal();
}

/***********************
 * TAB NAVIGATION
 ***********************/
function setupTabNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      const targetScreen = btn.dataset.tab;
      
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(targetScreen).classList.add('active');
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      console.log('🔀 Switched to tab:', targetScreen);
    };
  });
  
  // Default to Chi
  document.querySelector('.tab-btn[data-tab="chi-screen"]').click();
}

/***********************
 * MODALS
 ***********************/
function setupModals() {
  document.querySelector('.close').onclick = hideModal;
  
  window.onclick = e => {
    const modal = document.getElementById('modal');
    if (e.target === modal) {
      hideModal();
    }
  };
}

function showModal() {
  document.getElementById('modal').style.display = 'block';
}

function hideModal() {
  document.getElementById('modal').style.display = 'none';
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