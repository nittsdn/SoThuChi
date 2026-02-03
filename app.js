/* =========================
   FAKE DATABASE (DỰA THEO EXCEL CUNG CẤP, LOAD CỨNG BAN ĐẦU)
========================= */
const DB = {
  chi: [], // Sẽ load từ Excel simulation
  thu: [],
  nguonTien: ["ACB Mèo", "HD Mèo", "Tech Mèo", "Tiền mặt Mèo", "Ví Momo Mèo", "Ví Vnpay Mèo", "Tech Boé", "Tiền mặt Boé", "Sacom Boé", "SCB + Agri Boé", "Ví Momo Boé", "Ví Vnpay Boé"],
  moTaChi: ["Ăn sáng", "Ăn chiều", "Ăn lễ", "Ăn chơi với bạn bè", "Đi chợ", "Đi chợ tết", "Siêu thị", "Điện nhà", "Điện mẹ", "Điện nhà trọ", "Nước nhà", "Nước mẹ", "Nước nhà trọ", "Internet cáp quang" /* ... thêm từ loai_chi */],
  moTaThu: ["Lãi tech", "Bán ve chai", "Phượng đưa", "Nhà trọ", "BV đưa lại", "Ba đưa" /* từ history */],
  loaiThu: ["Ngân hàng", "Khác", "Cho mượn", "Nhà trọ"],
  soDuLyThuyet: 168024091, // Từ Excel
  loaiChiFull: [/* Dữ liệu đầy đủ từ loai_chi sheet */],
  tkSessions: [], // Từ tk_session
  tkDetails: [] // Từ tk_detail
};

// Simulate load from Excel (dựa trên <DOCUMENT> cung cấp)
function loadDBFromExcel() {
  // Chi từ sheet 0
  DB.chi = [
    { id: 'c1', moTa: 'Đi chợ', nguon: 'ACB Mèo', nghin: 4981.612, tien: 4981612, ngay: '2026-01-01', soDu: 186801334 },
    // Thêm hết từ row2 đến cuối, nhưng để ngắn gọn, chỉ ví dụ
  ];
  // Thu từ sheet 1
  DB.thu = [
    { tien: 191616700, ngay: '2025-12-31', moTa: 'cũ 2025', nguon: 'Số dư đầu năm', loai: 'Dư năm trước', tong: 191616700, id: 't1' },
    // Thêm hết
  ];
  // tk_detail, tk_session, loai_chi, nguon_tien tương tự
  // Ở đây giả định đã load đầy đủ
}

/* =========================
   UTILS
========================= */
function formatVND(n) {
  return n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function parseInput(val) {
  if (!val) return 0;
  return Number(val.replace(/\./g, "").replace(/,/g, "."));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[date.getDay()];
}

/* =========================
   HEADER
========================= */
function renderHeader() {
  const lastChi = DB.chi[DB.chi.length - 1];
  const el = document.getElementById("last-trans-static");
  if (!el) return;

  if (!lastChi) {
    el.innerHTML = `Chưa có chi<br>Số dư lý thuyết: ${formatVND(DB.soDuLyThuyet)}`;
    return;
  }

  el.innerHTML = `
    <b>Chi cuối:</b> ${lastChi.moTa}<br>
    ${getDayOfWeek(lastChi.ngay)} ngày ${lastChi.ngay.split('-').reverse().join('/')}<br>
    Tổng: ${formatVND(lastChi.tien)}<br>
    <b>Số dư LT:</b> ${formatVND(DB.soDuLyThuyet)}
  `;
  document.querySelector('.balance-tag').innerText = `Số dư LT: ${formatVND(DB.soDuLyThuyet)}`;
}

/* =========================
   DATE HANDLING
========================= */
let chiDate = today();
let thuDate = today();

function changeDate(section, delta) {
  let date = section === 'chi' ? new Date(chiDate) : new Date(thuDate);
  date.setDate(date.getDate() + delta);
  const newDate = date.toISOString().slice(0, 10);
  if (new Date(newDate) > new Date()) return; // Không cho tương lai

  if (section === 'chi') chiDate = newDate;
  else thuDate = newDate;

  renderDateDisplay(section);
}

function renderDateDisplay(section) {
  const el = document.getElementById(`${section}-date-display`);
  const dateStr = section === 'chi' ? chiDate : thuDate;
  el.innerText = `${getDayOfWeek(dateStr)} ${dateStr.split('-').reverse().join('/')}`;
}

function openDatePicker(section) {
  document.getElementById(`${section}-date-picker`).click();
}

function setDate(section, value) {
  if (new Date(value) > new Date()) {
    alert('Không chọn ngày tương lai');
    return;
  }
  const dateStr = value;
  if (section === 'chi') chiDate = dateStr;
  else thuDate = dateStr;
  renderDateDisplay(section);
}

/* =========================
   CHI – INPUT TIỀN (STACK)
========================= */
let chiStack = [];
let chiInput; // Will be initialized in DOMContentLoaded

function addChiNumber() {
  const displayed = chiInput.value;
  const val_full = parseInput(displayed);
  const val_nghin = val_full / 1000;
  if (isNaN(val_nghin) || val_nghin <= 0) return;

  chiStack.push(val_nghin);
  chiInput.value = "";
  renderChiCalc();
  checkChiSubmit();
  chiInput.focus();
}

function renderChiCalc() {
  const chiCalc = document.getElementById("chi-stack");
  
  if (chiStack.length === 0) {
    chiCalc.innerHTML = "0";
    return;
  }
  
  chiCalc.innerHTML = chiStack
    .map((v, i) => `<span data-i="${i}" class="calc-item">${formatVND(v * 1000)}</span>`)
    .join(" + ");

  if (chiStack.length > 1) {
    const tong_full = chiStack.reduce((a, b) => a + b, 0) * 1000;
    chiCalc.innerHTML += ` = <b>${formatVND(tong_full)}</b>`;
  }

  document.querySelectorAll(".calc-item").forEach(el => {
    el.onclick = () => {
      const i = Number(el.dataset.i);
      chiInput.value = formatVND(chiStack[i] * 1000);
      chiStack.splice(i, 1);
      renderChiCalc();
      checkChiSubmit();
      chiInput.focus();
    };
  });
}

function deleteLastChi() {
  chiStack.pop();
  renderChiCalc();
  checkChiSubmit();
}

function resetChi() {
  chiStack = [];
  chiInput.value = "";
  document.getElementById("chi-desc-select").value = "";
  document.getElementById("chi-source-select").value = "";
  document.querySelectorAll('#chi-desc-chips .chip').forEach(c => c.classList.remove('selected'));
  checkChiSubmit();
  renderChiCalc();
}

/* =========================
   CHI – SELECT & CHIPS
========================= */
function renderChiDescChips() {
  const chipsEl = document.getElementById('chi-desc-chips');
  const quick = getQuickSettings('chi-desc');
  const items = (quick && quick.length > 0) ? quick : DB.moTaChi.slice(0, 8);
  chipsEl.innerHTML = items.map(desc => `<button class="chip" onclick="selectChip('chi-desc', '${desc}')">${desc}</button>`).join('');
}

function selectChip(type, value) {
  document.querySelectorAll(`#${type.split('-')[0]}-desc-chips .chip`).forEach(c => c.classList.remove('selected'));
  const chip = [...document.querySelectorAll(`#${type.split('-')[0]}-desc-chips .chip`)].find(c => c.innerText === value);
  if (chip) chip.classList.add('selected');
  document.getElementById(`${type.split('-')[0]}-desc-select`).value = value;
  if (type.startsWith('chi')) checkChiSubmit();
  else checkThuSubmit();
}

function renderChiDescSelect() {
  const select = document.getElementById('chi-desc-select');
  select.innerHTML = '<option value="">-- Mô tả chi --</option>' + DB.moTaChi.map(d => `<option value="${d}">${d}</option>`).join('');
  select.onchange = checkChiSubmit;
}

function addNewDesc(section) {
  const name = prompt('Tên mô tả mới:');
  const type = prompt('Loại chi:');
  if (name && type) {
    // Gửi GAS insert_loai_chi, simulate add
    DB.moTaChi.push(name);
    renderChiDescSelect(); // Update if chi
    alert('Đã thêm mô tả mới');
  }
}

/* =========================
   CHI – NGUỒN TIỀN
========================= */
function renderNguonTien(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Nguồn tiền --</option>' + DB.nguonTien.map(n => `<option value="${n}">${n}</option>`).join('');
  select.onchange = selectId.startsWith('chi') ? checkChiSubmit : checkThuSubmit;
}

function checkChiSubmit() {
  const submitBtn = document.getElementById('chi-submit');
  const hasStack = chiStack.length > 0;
  const moTa = document.getElementById('chi-desc-select').value;
  const nguon = document.getElementById('chi-source-select').value;
  submitBtn.disabled = !(hasStack && moTa && nguon);
}

/* =========================
   CHI – SUBMIT
========================= */
function submitChi() {
  if (chiStack.length === 0) return;

  const nghin = chiStack.reduce((a, b) => a + b, 0);
  const tong = nghin * 1000;
  const moTa = document.getElementById('chi-desc-select').value;
  const nguon = document.getElementById('chi-source-select').value;

  // For GAS: so_tien_nghin = chiStack.length > 1 ? "=" + chiStack.join("+") : chiStack[0].toString();

  DB.chi.push({
    ngay: chiDate,
    tong,
    moTa,
    nguon
  });

  DB.soDuLyThuyet -= tong;

  // Gửi GAS ở đây (simulate)
  alert(`Đã thêm vào chi tiêu ${moTa}\n${chiStack.map(v => formatVND(v * 1000)).join(' + ')} = ${formatVND(tong)}\nNguồn ${nguon}\n${getDayOfWeek(chiDate)} ngày ${chiDate.split('-').reverse().join('/')}\nThành công`);

  resetChi();
  renderHeader();
}

/* =========================
   THU – INPUT
========================= */
let thuInput; // Will be initialized in DOMContentLoaded

function validateThuInput() {
  const val = parseInput(thuInput.value);
  if (val > 0) {
    document.getElementById('thu-stack').innerText = formatVND(val);
    checkThuSubmit();
  }
}

function resetThu() {
  thuInput.value = "";
  document.getElementById('thu-desc-select').value = "";
  document.getElementById('thu-type-select').value = "";
  document.getElementById('thu-source-select').value = "";
  document.querySelectorAll('#thu-desc-chips .chip, #thu-type-chips .chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('thu-stack').innerText = '0';
  checkThuSubmit();
}

/* =========================
   THU – SELECT & CHIPS
========================= */
function renderThuDescChips() {
  const chipsEl = document.getElementById('thu-desc-chips');
  const quick = getQuickSettings('thu-desc');
  const items = (quick && quick.length > 0) ? quick : DB.moTaThu.slice(0, 8);
  chipsEl.innerHTML = items.map(desc => `<button class="chip" onclick="selectChip('thu-desc', '${desc}')">${desc}</button>`).join('');
}

function renderThuTypeChips() {
  const chipsEl = document.getElementById('thu-type-chips');
  const quick = getQuickSettings('thu-type');
  const items = (quick && quick.length > 0) ? quick : DB.loaiThu.slice(0, 8);
  chipsEl.innerHTML = items.map(type => `<button class="chip" onclick="selectChip('thu-type', '${type}')">${type}</button>`).join('');
}

function renderThuDescSelect() {
  const select = document.getElementById('thu-desc-select');
  select.innerHTML = '<option value="">-- Mô tả thu --</option>' + DB.moTaThu.map(d => `<option value="${d}">${d}</option>`).join('');
  select.onchange = checkThuSubmit;
}

function renderThuTypeSelect() {
  const select = document.getElementById('thu-type-select');
  select.innerHTML = '<option value="">-- Loại thu --</option>' + DB.loaiThu.map(t => `<option value="${t}">${t}</option>`).join('');
  select.onchange = checkThuSubmit;
}

function checkThuSubmit() {
  const submitBtn = document.getElementById('thu-submit');
  const val = parseInput(thuInput.value);
  const moTa = document.getElementById('thu-desc-select').value;
  const loai = document.getElementById('thu-type-select').value;
  const nguon = document.getElementById('thu-source-select').value;
  submitBtn.disabled = !(val > 0 && moTa && loai && nguon);
}

/* =========================
   THU – SUBMIT
========================= */
function submitThu() {
  const val = parseInput(thuInput.value);
  if (!val) return;

  const moTa = document.getElementById('thu-desc-select').value;
  const loai = document.getElementById('thu-type-select').value;
  const nguon = document.getElementById('thu-source-select').value;

  DB.thu.push({
    ngay: thuDate,
    soTien: val,
    moTa,
    loai,
    nguon
  });

  DB.soDuLyThuyet += val;

  // Gửi GAS
  alert(`Đã thêm thu ${moTa} ${formatVND(val)} nguồn ${nguon} loại ${loai} ${getDayOfWeek(thuDate)} ngày ${thuDate.split('-').reverse().join('/')} thành công`);

  resetThu();
  renderHeader();
}

/* =========================
   TỔNG KẾT (BẢN TẠM THEO FLOW)
========================= */
function startTongKet() {
  document.getElementById('tk-content').style.display = 'block';
  renderTongKet();
}

function renderTongKet() {
  document.getElementById('tk-so-du-lt').innerText = `Số dư LT: ${formatVND(DB.soDuLyThuyet)}`;
  const sourcesEl = document.getElementById('tk-sources');
  sourcesEl.innerHTML = DB.nguonTien.map(n => `
    <div>
      <label>${n}</label>
      <input type="text" data-nguon="${n}" class="input-std" oninput="calcTongTT()" placeholder="Số dư thực tế">
    </div>
  `).join('');
}

function calcTongTT() {
  let tongTT = 0;
  document.querySelectorAll('#tk-sources input').forEach(inp => {
    tongTT += parseInput(inp.value);
  });
  document.getElementById('tk-thuc-te').value = formatVND(tongTT);
}

function kiemTraTongKet() {
  const tt = parseInput(document.getElementById('tk-thuc-te').value);
  const diff = tt - DB.soDuLyThuyet;
  document.getElementById('tk-chenh-lech').innerText = `Chênh lệch: ${formatVND(diff)} (${diff < 0 ? 'Thiếu' : 'Thừa'})`;

  // Render bảng chi tiết
  const tableEl = document.getElementById('tk-detail-table');
  tableEl.innerHTML = DB.nguonTien.map(n => `
    <div>
      ${n}: ${formatVND(calculateTongChiByNguon(n))} <button onclick="viewChiDetail('${n}')">Xem chi tiết</button>
    </div>
  `).join('');
}

function calculateTongChiByNguon(nguon) {
  return DB.chi.filter(c => c.nguon === nguon).reduce((sum, c) => sum + c.tong, 0);
}

function viewChiDetail(nguon) {
  // Load list chi từ nguon, cho sửa (simulate popup)
  alert(`Chi tiết cho ${nguon}: ...`); // Implement full edit later
}

function xacNhanTongKet() {
  // Gửi GAS tk_payload
  alert('Đã tổng kết thành công');
  // Update DB.tkSessions, tkDetails
  renderHeader();
}

/* =========================
   SETTINGS & QUICK
========================= */
function getQuickSettings(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function setQuickSettings(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

function renderQuick(groupId, key) {
  const el = document.getElementById(groupId);
  if (!el) return;
  const quick = getQuickSettings(key);
  if (quick && quick.length > 0) {
    el.innerHTML = quick.map(q => `<div>${q}</div>`).join('');
  } else {
    el.innerHTML = '';
  }
}

function manageQuick(type) {
  // Popup quản lý: chọn max 8 từ list đầy đủ
  const list = type === 'chi-desc' ? DB.moTaChi : type === 'thu-desc' ? DB.moTaThu : DB.loaiThu;
  const selected = prompt('Chọn (phân cách bằng ,):', getQuickSettings(type).join(','));
  if (selected) {
    const arr = selected.split(',').slice(0, 8).map(s => s.trim());
    setQuickSettings(type, arr);
    if (type === 'chi-desc') renderChiDescChips();
    else if (type === 'thu-desc') renderThuDescChips();
    else renderThuTypeChips();
    renderQuick(`quick-${type}`, type);
  }
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Initialize chiInput and add event listener
  chiInput = document.getElementById("chi-input");
  if (chiInput) {
    chiInput.addEventListener("input", e => {
      let raw = e.target.value.replace(/[^0-9,]/g, "").replace(/,/g, '.');
      let num = parseFloat(raw);
      e.target.value = isNaN(num) ? "" : formatVND(num * 1000);
    });
  }
  
  // Initialize thuInput and add event listener
  thuInput = document.getElementById("thu-input");
  if (thuInput) {
    thuInput.addEventListener("input", e => {
      let raw = e.target.value.replace(/[^0-9,]/g, "").replace(/,/g, '.');
      let num = parseFloat(raw);
      e.target.value = isNaN(num) ? "" : formatVND(num);
    });
  }
  
  loadDBFromExcel();
  renderHeader();
  renderDateDisplay('chi');
  renderDateDisplay('thu');
  renderChiDescChips();
  renderChiDescSelect();
  renderNguonTien('chi-source-select');
  renderThuDescChips();
  renderThuTypeChips();
  renderThuDescSelect();
  renderThuTypeSelect();
  renderNguonTien('thu-source-select');
  renderQuick('quick-chi-desc', 'chi-desc');
  renderQuick('quick-thu-desc', 'thu-desc');
  renderQuick('quick-thu-type', 'thu-type');
  document.getElementById('chi-date-picker').max = today();
  document.getElementById('thu-date-picker').max = today();
  
  // Initialize stack displays
  renderChiCalc();
  
  // Focus on chi input
  if (chiInput) chiInput.focus();
});