/*
  APP SỔ THU CHI – LOGIC
  VERSION: v1.2.0 (GAS JSON API)
  BUILD: 2026-02-03
  CHANGELOG:
  - Chuyển sang GAS JSON API (không dùng CSV)
  - Nút ngày ở giữa < > với format "Thứ X DD/MM/YYYY"
  - Live preview "25 + 30 = 55 x 1000 = 55.000 đ"
  - Auto-hide message sau 3s
  - Loading state "ĐANG GỬI..."
*/

const APP_VERSION = 'v1.2.0';
const APP_BUILD = '2026-02-03';
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// State
let chiStack = [];
let thuAmount = 0;
let chiDate = new Date();
let thuDate = new Date();
let loaiChiList = [];
let nguonTienList = [];

// Init
document.addEventListener('DOMContentLoaded', () => {
  console.log(`🚀 APP START - ${APP_VERSION} (${APP_BUILD})`);
  document.getElementById('app-version').innerText = APP_VERSION;
  
  initDates();
  setupEvents();
  loadInitialData();
});

/***********************
 * DATE MANAGEMENT
 ***********************/
function initDates() {
  const today = new Date();
  chiDate = new Date(today);
  thuDate = new Date(today);
  
  updateDateDisplay('chi');
  updateDateDisplay('thu');
  
  // Set hidden inputs
  document.getElementById('chi-date-hidden').value = dateToISO(chiDate);
  document.getElementById('thu-date-hidden').value = dateToISO(thuDate);
}

function updateDateDisplay(type) {
  const date = type === 'chi' ? chiDate : thuDate;
  const btn = document.getElementById(`${type}-date-btn`);
  btn.textContent = formatDateFull(date);
}

function formatDateFull(date) {
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dayName} ${dd}/${mm}/${yyyy}`;
}

function dateToISO(date) {
  return date.toISOString().split('T')[0];
}

function changeDate(type, delta) {
  if (type === 'chi') {
    chiDate.setDate(chiDate.getDate() + delta);
    updateDateDisplay('chi');
    document.getElementById('chi-date-hidden').value = dateToISO(chiDate);
  } else {
    thuDate.setDate(thuDate.getDate() + delta);
    updateDateDisplay('thu');
    document.getElementById('thu-date-hidden').value = dateToISO(thuDate);
  }
  console.log(`📅 ${type} date changed to:`, dateToISO(type === 'chi' ? chiDate : thuDate));
}

function showDatePicker(type) {
  const input = document.getElementById(`${type}-date-hidden`);
  input.style.display = 'block';
  input.focus();
  input.click();
  
  input.onchange = () => {
    if (type === 'chi') {
      chiDate = new Date(input.value);
      updateDateDisplay('chi');
    } else {
      thuDate = new Date(input.value);
      updateDateDisplay('thu');
    }
    input.style.display = 'none';
    console.log(`📅 ${type} date picked:`, input.value);
  };
  
  input.onblur = () => {
    setTimeout(() => input.style.display = 'none', 200);
  };
}

/***********************
 * LOAD DATA
 ***********************/
async function loadInitialData() {
  try {
    await Promise.all([
      loadLoaiChi(),
      loadNguonTien(),
      loadLastChi()
    ]);
    console.log('✅ All initial data loaded');
  } catch (e) {
    console.error('❌ Load initial data failed:', e);
    showMessage('chi', '❌ Lỗi tải dữ liệu: ' + e.message, 5000, 'error');
  }
}

async function loadLoaiChi() {
  console.log('📡 Loading loai_chi...');
  const res = await fetch(`${GAS_ENDPOINT}?sheet=loai_chi`);
  const json = await res.json();
  
  if (json.status !== 'success') throw new Error(json.message);
  
  loaiChiList = json.data.filter(row => row.active === true);
  
  // Render chips
  const container = document.getElementById('chi-checkboxes');
  container.innerHTML = loaiChiList.slice(0, 10).map(item => 
    `<label class="cb-chip">
      <input type="checkbox" value="${item.mo_ta_chi}"> ${item.mo_ta_chi}
    </label>`
  ).join('');
  
  // Render dropdown
  const dropdown = document.getElementById('chi-dropdown');
  dropdown.innerHTML = '<option value="">-- Chọn mô tả khác --</option>' + 
    loaiChiList.map(item => `<option value="${item.mo_ta_chi}">${item.mo_ta_chi}</option>`).join('');
  
  console.log('✅ Loaded', loaiChiList.length, 'loai chi');
}

async function loadNguonTien() {
  console.log('📡 Loading nguon_tien...');
  const res = await fetch(`${GAS_ENDPOINT}?sheet=nguon_tien`);
  const json = await res.json();
  
  if (json.status !== 'success') throw new Error(json.message);
  
  nguonTienList = json.data.filter(row => row.active === true);
  
  // Render selects
  const optionsHTML = '<option value="">-- Chọn nguồn tiền --</option>' + 
    nguonTienList.map(item => `<option value="${item.nguon_tien}">${item.nguon_tien}</option>`).join('');
  
  document.getElementById('chi-nguon').innerHTML = optionsHTML;
  document.getElementById('thu-nguon').innerHTML = optionsHTML;
  
  console.log('✅ Loaded', nguonTienList.length, 'nguon tien');
}

async function loadLastChi() {
  console.log('📡 Loading last chi...');
  const res = await fetch(`${GAS_ENDPOINT}?sheet=Chi_Tieu_2026`);
  const json = await res.json();
  
  if (json.status !== 'success') throw new Error(json.message);
  
  const rows = json.data;
  
  // Find last valid chi (loop backward)
  for (let i = rows.length - 1; i >= 0; i--) {
    const vnd = parseFloat(rows[i]['Số tiền vnđ']) || 0;
    if (vnd > 0) {
      const moTa = rows[i].mo_ta_chi || 'N/A';
      const ngay = rows[i]['Ngày'] || '';
      const soDu = parseFloat(rows[i]['Số dư lý thuyết']) || 0;
      
      document.getElementById('last-trans').innerText = 
        `Chi cuối: ${moTa} - ${formatDateShort(ngay)} - ${formatNumber(vnd)} đ (Số dư: ${formatNumber(soDu)} đ)`;
      
      console.log('✅ Found last chi:', moTa, vnd);
      return;
    }
  }
  
  document.getElementById('last-trans').innerText = 'Chưa có chi tiêu nào';
}

/***********************
 * HELPERS
 ***********************/
function formatNumber(num) {
  return parseFloat(num).toLocaleString('vi-VN');
}

function formatDateShort(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function showMessage(type, text, duration = 3000, className = 'success') {
  const msg = document.getElementById(`${type}-message`);
  msg.textContent = text;
  msg.className = `status-msg ${className}`;
  
  setTimeout(() => {
    msg.className = 'status-msg';
  }, duration);
}

/***********************
 * CHI FLOW
 ***********************/
function setupEvents() {
  // Chi date controls
  document.getElementById('chi-prev-day').onclick = () => changeDate('chi', -1);
  document.getElementById('chi-next-day').onclick = () => changeDate('chi', 1);
  document.getElementById('chi-date-btn').onclick = () => showDatePicker('chi');
  
  // Thu date controls
  document.getElementById('thu-prev-day').onclick = () => changeDate('thu', -1);
  document.getElementById('thu-next-day').onclick = () => changeDate('thu', 1);
  document.getElementById('thu-date-btn').onclick = () => showDatePicker('thu');
  
  // Chi input
  const chiInput = document.getElementById('chi-amount');
  chiInput.addEventListener('input', updateChiPreview);
  chiInput.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === 'Enter') {
      e.preventDefault();
      handlePlus('chi');
    }
  });
  
  document.getElementById('chi-btn-plus').onclick = () => handlePlus('chi');
  document.getElementById('chi-reset').onclick = resetChi;
  document.getElementById('chi-submit').onclick = submitChi;
  
  // Chi validation
  document.getElementById('chi-nguon').onchange = checkChiSubmit;
  document.getElementById('chi-dropdown').onchange = checkChiSubmit;
  
  // Thu input
  const thuInput = document.getElementById('thu-amount');
  thuInput.addEventListener('input', () => {
    thuAmount = parseFloat(thuInput.value) || 0;
    checkThuSubmit();
  });
  
  document.getElementById('thu-mota').addEventListener('input', checkThuSubmit);
  document.getElementById('thu-loai').addEventListener('input', checkThuSubmit);
  document.getElementById('thu-nguon').onchange = checkThuSubmit;
  document.getElementById('thu-reset').onclick = resetThu;
  document.getElementById('thu-submit').onclick = submitThu;
}

function handlePlus(type) {
  const input = document.getElementById(`${type}-amount`);
  const val = parseFloat(input.value);
  
  if (val > 0) {
    chiStack.push(val);
    input.value = '';
    input.focus();
    updateChiPreview();
    checkChiSubmit();
    console.log('➕ Added to chi stack:', val);
  }
}

function updateChiPreview() {
  const input = document.getElementById('chi-amount');
  const currentVal = parseFloat(input.value) || 0;
  const display = document.getElementById('chi-stack-display');
  
  const stack = [...chiStack];
  if (currentVal > 0) stack.push(currentVal);
  
  if (stack.length === 0) {
    display.textContent = '';
    return;
  }
  
  const total = stack.reduce((a, b) => a + b, 0);
  const totalVND = total * 1000;
  
  display.textContent = `Đang cộng: ${stack.join(' + ')} = ${total} x 1000 = ${formatNumber(totalVND)} đ`;
}

function resetChi() {
  chiStack = [];
  document.getElementById('chi-amount').value = '';
  document.getElementById('chi-stack-display').textContent = '';
  document.querySelectorAll('#chi-checkboxes input').forEach(cb => cb.checked = false);
  document.getElementById('chi-dropdown').value = '';
  document.getElementById('chi-nguon').value = '';
  checkChiSubmit();
  console.log('🗑️ Reset chi form');
}

function checkChiSubmit() {
  const hasAmount = chiStack.length > 0 || parseFloat(document.getElementById('chi-amount').value) > 0;
  const hasMoTa = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).length > 0 || 
                  document.getElementById('chi-dropdown').value !== '';
  const hasNguon = document.getElementById('chi-nguon').value !== '';
  
  document.getElementById('chi-submit').disabled = !(hasAmount && hasMoTa && hasNguon);
}

async function submitChi() {
  const btn = document.getElementById('chi-submit');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'ĐANG GỬI...';
  
  try {
    // Get final stack
    const stack = [...chiStack];
    const currentVal = parseFloat(document.getElementById('chi-amount').value) || 0;
    if (currentVal > 0) stack.push(currentVal);
    
    // Get mô tả
    const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
    const dropdown = document.getElementById('chi-dropdown').value;
    const moTa = [...checks, dropdown].filter(x => x).join(', ');
    
    // Get nguồn
    const nguon = document.getElementById('chi-nguon').value;
    
    // Build formula
    const formula = stack.length > 1 ? `=${stack.join('+')}` : stack[0];
    
    const payload = {
      action: 'insert_chi',
      payload: {
        moTa: moTa,
        loaiChi: '', // Không có UI chọn loại chi
        nguon: nguon,
        soTien1000: formula,
        ngay: dateToISO(chiDate)
      }
    };
    
    console.log('📤 Sending chi:', payload);
    
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    
    if (result.status === 'success') {
      const total = stack.reduce((a,b) => a+b, 0);
      showMessage('chi', `✅ Đã lưu chi: ${formatNumber(total * 1000)} đ`);
      resetChi();
      setTimeout(loadLastChi, 1000);
    } else {
      throw new Error(result.message);
    }
    
  } catch (e) {
    console.error('❌ Submit chi failed:', e);
    showMessage('chi', '❌ Lỗi: ' + e.message, 5000, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/***********************
 * THU FLOW
 ***********************/
function resetThu() {
  thuAmount = 0;
  document.getElementById('thu-amount').value = '';
  document.getElementById('thu-mota').value = '';
  document.getElementById('thu-loai').value = '';
  document.getElementById('thu-nguon').value = '';
  checkThuSubmit();
  console.log('🗑️ Reset thu form');
}

function checkThuSubmit() {
  const hasAmount = thuAmount > 0;
  const hasMoTa = document.getElementById('thu-mota').value.trim() !== '';
  const hasLoai = document.getElementById('thu-loai').value.trim() !== '';
  const hasNguon = document.getElementById('thu-nguon').value !== '';
  
  document.getElementById('thu-submit').disabled = !(hasAmount && hasMoTa && hasLoai && hasNguon);
}

async function submitThu() {
  const btn = document.getElementById('thu-submit');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'ĐANG GỬI...';
  
  try {
    const payload = {
      action: 'insert_thu',
      payload: {
        soTienVND: thuAmount,
        ngay: dateToISO(thuDate),
        moTa: document.getElementById('thu-mota').value.trim(),
        nguon: document.getElementById('thu-nguon').value,
        loaiThu: document.getElementById('thu-loai').value.trim()
      }
    };
    
    console.log('📤 Sending thu:', payload);
    
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    
    if (result.status === 'success') {
      showMessage('thu', `✅ Đã lưu thu: ${formatNumber(thuAmount)} đ`);
      resetThu();
    } else {
      throw new Error(result.message);
    }
    
  } catch (e) {
    console.error('❌ Submit thu failed:', e);
    showMessage('thu', '❌ Lỗi: ' + e.message, 5000, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}