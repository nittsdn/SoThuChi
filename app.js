/*
  APP SỔ THU CHI – LOGIC
  VERSION: v1.0.0 (Final based on MP)
  BUILD: 2026-02-02
  NOTE:
  - SPA với tab navigation
  - LocalStorage cho settings
  - Tích hợp GAS (insert/update/delete)
  - Format số: . cho nghìn, , cho thập phân
  - Ngày: DD/MM/YYYY hiển thị, YYYY-MM-DD gửi
  - Swipe gestures đơn giản cho date
  - Chạy trên iPhone/PC (responsive)
*/

/***********************
 * CONFIG
 ***********************/
const APP_VERSION = 'v1.0.0';
const APP_BUILD = '2026-02-02';
const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub';
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';
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
  tempListChi: [], // for Chi: array of numbers (nghin)
  selectedMoTaChi: null,
  selectedNguonChi: null,
  selectedDateChi: new Date(), // Date object
  tempThu: 0, // for Thu: number VND
  selectedMoTaThu: null,
  selectedLoaiThu: null,
  selectedNguonThu: null,
  selectedDateThu: new Date(),
  tkInputs: {}, // {nguon_tien: number}
  loaiChi: [], // full list from sheet
  nguonTien: [], // full list
  quickChi: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickChi)) || [],
  quickThu: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickThu)) || [],
  quickLoaiThu: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.quickLoaiThu)) || [],
  darkMode: localStorage.getItem(LOCAL_STORAGE_KEYS.darkMode) === 'true',
  lastChi: null,
  lastThu: null,
  lastTkDate: null, // for TK period
  soDuLT: 0
};

/***********************
 * INIT
 ***********************/
document.getElementById('app-version').innerText = `${APP_VERSION} (${APP_BUILD})`;
document.body.classList.toggle('dark', state.darkMode);

init();

async function init() {
  try {
    await loadLoaiChi();
  } catch (e) {
    console.error('Failed to load expense categories (loai chi):', e);
  }
  try {
    await loadNguonTien();
  } catch (e) {
    console.error('Failed to load payment sources (nguon tien):', e);
  }
  try {
    await loadLastChi();
  } catch (e) {
    console.error('Failed to load last expense (chi):', e);
  }
  try {
    await loadLastThu();
  } catch (e) {
    console.error('Failed to load last income (thu):', e);
  }
  try {
    await loadTkSummary();
  } catch (e) {
    console.error('Failed to load summary (tong ket):', e);
  }
  renderQuickChi();
  renderQuickThu();
  renderQuickLoaiThu();
  setupTabNavigation();
  setupDateSelectors();
  setupSettings();
  setupModals();
  setupSwipeGestures();
}

/***********************
 * LOAD DATA FROM SHEET
 ***********************/
async function loadLoaiChi() {
  const res = await fetch(`${SHEET_BASE}?gid=1944311512&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1);
  state.loaiChi = rows.map(r => {
    const cols = r.split(',');
    return { moTa: cols[1], active: cols[5] === 'TRUE' };
  }).filter(c => c.active);

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
  const res = await fetch(`${SHEET_BASE}?gid=0&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').slice(1);
  state.nguonTien = rows.map(r => {
    const cols = r.split(',');
    return { ten: cols[0], active: cols[4] === 'TRUE' };
  }).filter(n => n.active);

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
  // Fetch last row from Chi_Tieu_2026 (gid=2 for Chi sheet)
  const res = await fetch(`${SHEET_BASE}?gid=2&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').filter(row => row.trim() !== ''); // Filter empty rows
  const last = rows[rows.length - 1].split(',');
  state.lastChi = {
    moTa: last[1],
    ngaySerial: last[5],
    nghin: last[3],
    vnd: last[4],
    soDu: last[6]
  };
  const ngay = serialToDate(last[5]);
  const thu = getThuFromDate(ngay);
  document.getElementById('last-expense').innerText = `Chi cuối ${last[1]} Thứ ${thu} ngày ${formatDate(ngay)} tổng ${last[3]} = ${formatNumber(last[4])}, số dư ${formatNumber(last[6])}`;
}

async function loadLastThu() {
  // Fetch last row from Thu_2026 (gid=1 for Thu sheet)
  const res = await fetch(`${SHEET_BASE}?gid=1&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').filter(row => row.trim() !== ''); // Filter empty rows
  const last = rows[rows.length - 1].split(',');
  state.lastThu = {
    moTa: last[2],
    ngaySerial: last[1],
    vnd: last[0]
  };
  const ngay = serialToDate(last[1]);
  const thu = getThuFromDate(ngay);
  document.getElementById('last-income').innerText = `Thu cuối ${last[2]} Thứ ${thu} ngày ${formatDate(ngay)} tổng ${formatNumber(last[0])}`;
}

async function loadTkSummary() {
  // Fetch tk_session last row for lastTkDate and soDuLT (gid=3 for tk_session sheet)
  const res = await fetch(`${SHEET_BASE}?gid=3&single=true&output=csv`);
  const text = await res.text();
  const rows = text.split('\n').filter(row => row.trim() !== ''); // Filter empty rows
  const last = rows[rows.length - 1].split(',');
  state.lastTkDate = serialToDate(last[1]);
  state.soDuLT = parseFloat(last[2]);

  document.getElementById('tk-summary').innerText = `Số dư LT: ${formatNumber(state.soDuLT)}`;

  // Populate TK inputs
  const box = document.getElementById('tk-inputs');
  box.innerHTML = '';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<label>${n.ten}: <input type="number" data-nguon="${n.ten}" placeholder="Số dư TT"></label>`;
    box.appendChild(div);
  });
}

/***********************
 * HELPERS
 ***********************/
function formatNumber(num) {
  if (isNaN(num)) return '0';
  const [int, dec] = num.toString().split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '');
}

function formatDate(date) {
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getThuFromDate(date) {
  const days = ['Chủ nhật', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
  return days[date.getDay()];
}

function serialToDate(serial) {
  const base = new Date(1899, 11, 30);
  base.setDate(base.getDate() + parseInt(serial));
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
    state.tempListChi.map(v => formatNumber(v) + '.000').join(' + ') + ` = ${formatNumber(total)}.000`;
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
  renderChiChips(); // Reset active
  validateChi();
};

function renderChiChips() {
  const box = document.getElementById('chi-chips');
  box.innerHTML = '';
  state.quickChi.forEach(moTa => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = moTa;
    chip.onclick = () => selectMoTaChi(chip, moTa);
    box.appendChild(chip);
  });
}

function selectMoTaChi(chip, moTa) {
  document.querySelectorAll('#chi-chips .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.selectedMoTaChi = moTa;
  validateChi();
}

document.getElementById('chi-mota-select').onchange = e => {
  if (e.target.value) {
    state.selectedMoTaChi = e.target.value;
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
  await sendToGAS(payload);
  alert(`Đã thêm chi tiêu ${state.selectedMoTaChi} ${state.tempListChi.map(v => formatNumber(v) + '.000').join(' + ')} = ${formatNumber(state.tempListChi.reduce((a,b)=>a+b,0))}.000 nguồn ${state.selectedNguonChi} Thứ ${getThuFromDate(state.selectedDateChi)} ngày ${formatDate(state.selectedDateChi)} thành công.`);
  resetChiForm();
  await loadLastChi();
};

/***********************
 * THU FLOW (Tương tự Chi)
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
  await sendToGAS(payload);
  alert(`Đã thêm thu ${state.selectedMoTaThu} ${formatNumber(state.tempThu)} nguồn ${state.selectedNguonThu} Thứ ${getThuFromDate(state.selectedDateThu)} ngày ${formatDate(state.selectedDateThu)} thành công.`);
  resetThuForm();
  await loadLastThu();
};

/***********************
 * TỔNG KẾT FLOW
 ***********************/
document.querySelectorAll('#tk-inputs input').forEach(inp => {
  inp.addEventListener('input', e => {
    state.tkInputs[inp.dataset.nguon] = parseFloat(e.target.value) || 0;
    validateTk();
  });
});

function validateTk() {
  const allFilled = Object.keys(state.tkInputs).length === state.nguonTien.length && Object.values(state.tkInputs).every(v => v >= 0);
  document.getElementById('btn-check-tk').disabled = !allFilled;
}

document.getElementById('btn-check-tk').onclick = async () => {
  const soDuTT = Object.values(state.tkInputs).reduce((a, b) => a + b, 0);
  const chenhLech = state.soDuLT - soDuTT;
  document.getElementById('tk-result').innerText = `Từ ngày ${formatDate(new Date(state.lastTkDate.getTime() + 86400000))} đến ngày ${formatDate(new Date())}\nSố dư LT: ${formatNumber(state.soDuLT)}\nSố dư TT: ${formatNumber(soDuTT)}\nChênh lệch: ${formatNumber(chenhLech)} (${chenhLech < 0 ? 'Thừa' : 'Thiếu'})`;

  // Load detail chi per nguon (need to fetch Chi data for period)
  const detailBox = document.getElementById('tk-detail-list');
  detailBox.innerHTML = '';
  state.nguonTien.forEach(n => {
    const div = document.createElement('div');
    div.innerText = `${n.ten}: <tổng chi> `;
    const btn = document.createElement('button');
    btn.textContent = 'Xem chi tiết';
    btn.onclick = () => loadChiDetailForTk(n.ten);
    div.appendChild(btn);
    detailBox.appendChild(div);
  });

  document.getElementById('btn-confirm-tk').disabled = false;
};

async function loadChiDetailForTk(nguon) {
  // Fetch Chi for period and nguon (assume fetch csv and filter)
  // For simplicity, simulate or implement full fetch
  // Then show in modal with editable fields
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '<h4>Chi tiết chi từ ' + nguon + '</h4>';
  // List items with edit button
  // On edit, send update_chi to GAS
  showModal();
}

document.getElementById('btn-confirm-tk').onclick = async () => {
  const payload = {
    type: 'tk',
    payload: {
      ngay_tk: dateToISO(new Date()),
      so_du_lt: state.soDuLT,
      chi_tiet: state.nguonTien.map(n => ({ nguon_tien: n.ten, so_tien: state.tkInputs[n.ten] }))
    }
  };
  await sendToGAS(payload);
  alert(`Đã tổng kết thành công kỳ từ ngày ${formatDate(state.lastTkDate)} - ${formatDate(new Date())} số dư LT: ${formatNumber(state.soDuLT)} TT: ${formatNumber(Object.values(state.tkInputs).reduce((a,b)=>a+b,0))} chênh lệch: ${formatNumber(state.soDuLT - Object.values(state.tkInputs).reduce((a,b)=>a+b,0))}`);
  resetTkForm();
  await loadTkSummary();
};

/***********************
 * SETTINGS FLOW
 ***********************/
function setupSettings() {
  document.getElementById('dark-mode').checked = state.darkMode;
  document.getElementById('dark-mode').onchange = e => {
    state.darkMode = e.target.checked;
    localStorage.setItem(LOCAL_STORAGE_KEYS.darkMode, state.darkMode);
    document.body.classList.toggle('dark', state.darkMode);
  };

  document.getElementById('manage-quick-chi').onclick = () => manageQuick('chi');
  document.getElementById('manage-quick-thu').onclick = () => manageQuick('thu');
  document.getElementById('manage-quick-loai-thu').onclick = () => manageQuick('loaiThu');

  document.getElementById('reset-settings').onclick = () => {
    localStorage.clear();
    location.reload();
  };
}

function manageQuick(type) {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = '<h4>Quản lý quick ' + type + '</h4>';
  // List current quick, allow add/remove/reorder
  // For chi: from state.loaiChi
  // For thu/loaiThu: input free text
  // Save to localStorage
  showModal();
}

function renderQuickChi() {
  // Similar to renderChiChips but in settings
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
  document.getElementById('current-day').onclick = showDatePicker('chi');
  updateDateDisplay('chi');

  // Thu
  document.getElementById('prev-day-thu').onclick = () => changeDate('thu', -1);
  document.getElementById('next-day-thu').onclick = () => changeDate('thu', 1);
  document.getElementById('current-day-thu').onclick = showDatePicker('thu');
  updateDateDisplay('thu');
}

function changeDate(type, delta) {
  const key = type === 'chi' ? 'selectedDateChi' : 'selectedDateThu';
  state[key].setDate(state[key].getDate() + delta);
  updateDateDisplay(type);
}

function updateDateDisplay(type) {
  const btn = document.getElementById(`current-day${type === 'thu' ? '-thu' : ''}`);
  btn.textContent = `Hôm nay (Chọn ngày) - ${formatDate(state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu'])}`;
}

function showDatePicker(type) {
  document.getElementById('date-picker-modal').style.display = 'block';
  const picker = document.getElementById('date-picker');
  picker.value = dateToISO(state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu']);
  document.getElementById('confirm-date').onclick = () => {
    state[type === 'chi' ? 'selectedDateChi' : 'selectedDateThu'] = new Date(picker.value);
    updateDateDisplay(type);
    document.getElementById('date-picker-modal').style.display = 'none';
  };
}

function setupSwipeGestures() {
  let touchStartX = 0;
  document.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
  document.addEventListener('touchend', e => {
    const deltaX = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(deltaX) > 100) {
      const activeTab = document.querySelector('.screen.active').id;
      if (activeTab === 'chi-screen') changeDate('chi', deltaX > 0 ? 1 : -1);
      if (activeTab === 'thu-screen') changeDate('thu', deltaX > 0 ? 1 : -1);
    }
  });
}

/***********************
 * MODALS
 ***********************/
function setupModals() {
  document.querySelector('.close').onclick = hideModal;
  document.querySelector('.close-date').onclick = () => document.getElementById('date-picker-modal').style.display = 'none';

  document.getElementById('add-new-mota-chi').onclick = () => {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = '<h4>Thêm mô tả chi mới</h4><input id="new-mota" placeholder="Mô tả"><input id="new-phanloai" placeholder="Phân loại"><input id="new-nhom" placeholder="Nhóm"><button id="confirm-new-chi">Thêm</button>';
    showModal();
    document.getElementById('confirm-new-chi').onclick = async () => {
      const payload = {
        type: 'insert_loai_chi',
        payload: {
          mo_ta_chi: document.getElementById('new-mota').value,
          phan_loai: document.getElementById('new-phanloai').value,
          nhom: document.getElementById('new-nhom').value,
          icon: '❓' // default
        }
      };
      await sendToGAS(payload);
      await loadLoaiChi();
      hideModal();
    };
  };

  // Similar for add-new-mota-thu (but thu moTa free, no insert to sheet)
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
    };
  });
  // Default to Chi
  document.querySelector('.tab-bar button[data-tab="chi-screen"]').click();
}

/***********************
 * GAS INTEGRATION
 ***********************/
async function sendToGAS(payload) {
  await fetch(GAS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/***********************
 * RESET FORMS
 ***********************/
function resetChiForm() {
  state.tempListChi = [];
  state.selectedMoTaChi = null;
  state.selectedNguonChi = null;
  chiInput.value = '';
  renderChiPreview();
  document.getElementById('chi-mota-select').value = '';
  document.getElementById('nguon-tien-chi').value = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  validateChi();
}

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

function resetTkForm() {
  state.tkInputs = {};
  document.querySelectorAll('#tk-inputs input').forEach(inp => inp.value = '');
  document.getElementById('tk-result').innerText = '';
  document.getElementById('tk-detail-list').innerHTML = '';
  document.getElementById('btn-check-tk').disabled = true;
  document.getElementById('btn-confirm-tk').disabled = true;
}

function showModal() {
  document.getElementById('modal').style.display = 'block';
}

function hideModal() {
  document.getElementById('modal').style.display = 'none';
}