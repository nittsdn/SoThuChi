// Version: v3.2.1831
// ================= CONSTANTS =================
const API_URL = "https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec";

// ================= UTIL =================
function formatVN(num, decimals = 0) {
  if (num === null || num === undefined || (typeof num === 'number' && isNaN(num))) return "0";
  // Nếu là số, ép về chuỗi với số lẻ mong muốn
  let str = typeof num === 'number' ? num.toFixed(6) : String(num);
  // Tách phần nguyên và thập phân
  let [nguyen, thapphan] = str.split(".");
  // Thêm dấu chấm ngăn cách nghìn
  const nguyenFmt = nguyen.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Đổi dấu thập phân sang kiểu Việt Nam
  if (thapphan !== undefined) {
    // Loại bỏ số 0 thừa phía sau
    thapphan = thapphan.replace(/0+$/, "");
    return thapphan ? nguyenFmt + "," + thapphan : nguyenFmt;
  } else {
    return nguyenFmt;
  }
}

function parseVN(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatStack(stack) {
  if (!stack.length) return "Chưa có số";
  const formatted = stack.map(n => formatVN(n * 1000));
  const total = stack.reduce((a, b) => a + b, 0) * 1000;
  return formatted.join(" + ") + " = " + formatVN(total);
}

function createFormula(stack) {
  // Truyền đúng định dạng số kiểu xxxx,yyy (không có dấu chấm ngăn cách nghìn), chỉ dùng dấu phẩy cho thập phân
  const formatted = stack.map(n => {
    const str = String(n);
    const [nguyen, thapphan] = str.split(".");
    return thapphan !== undefined ? nguyen + "," + thapphan : nguyen;
  });
  return "=" + formatted.join("+");
}

function formatDate(d) {
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${days[d.getDay()]} ngày ${day}/${month}/${year}`;
}

function formatDateShort(d) {
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${days[d.getDay()]} - ${day}/${month}/${year}`;
}

function formatDateAPI(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function formatDateTK(dateStr) {
  const d = parseDateString(dateStr);
  if (!d) return dateStr || "";
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${days[d.getDay()]}.${day}.${month}.${year}`;
}

function parseDateString(dateStr) {
  if (!dateStr) {
    console.warn("parseDateString: Received empty or null date string, using current date");
    return new Date();
  }
  
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  const dateString = String(dateStr).trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!datePattern.test(dateString)) {
    console.warn(`parseDateString: Invalid date format "${dateString}"`);
    const fallbackDate = new Date(dateString);
    if (isNaN(fallbackDate.getTime())) {
      console.error(`parseDateString: Failed to parse "${dateString}"`);
      return new Date();
    }
    return fallbackDate;
  }
  
  const [year, month, day] = dateString.split("-").map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error(`parseDateString: Invalid date components in "${dateString}"`);
    return new Date();
  }
  
  const parsedDate = new Date(year, month - 1, day);
  
  if (isNaN(parsedDate.getTime())) {
    console.error(`parseDateString: Invalid date result from "${dateString}"`);
    return new Date();
  }
  
  return parsedDate;
}

// ================= TOAST NOTIFICATION =================
function showToast(message, duration = 20000) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message.replace(/\n/g, "<br>");
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function showLoading(show = true) {
  document.getElementById("loading").style.display = show ? "flex" : "none";
}

// ================= API CALLS =================
async function fetchData(sheet) {
  try {
    showLoading(true);
    console.log(`fetchData: Fetching sheet "${sheet}"`);
    const response = await fetch(`${API_URL}?sheet=${sheet}`);
    const result = await response.json();
    showLoading(false);
    
    console.log(`fetchData: Response status for "${sheet}":`, result.status);
    console.log(`fetchData: Data length for "${sheet}":`, result.data ? result.data.length : 0);
    
    if (result.data && result.data.length > 0) {
      console.log(`fetchData: First item from "${sheet}":`, result.data[0]);
    }
    
    if (result.status === "success") {
      return result.data || [];
    } else {
      console.error(`fetchData: API error for "${sheet}":`, result.message);
      showToast("Lỗi từ API: " + (result.message || "Unknown error"));
      return [];
    }
  } catch (error) {
    showLoading(false);
    console.error(`fetchData: Network error for "${sheet}":`, error);
    showToast("Lỗi kết nối API: " + error.message);
    return [];
  }
}

async function postData(action, payload) {
  try {
    showLoading(true);
    console.log(`📤 postData: action="${action}", payload=`, payload);
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action, payload })
    });
    const data = await response.json();
    showLoading(false);
    console.log(`📥 postData response:`, data);
    
    if (data.status === 'error') {
      showToast("Lỗi: " + data.message);
      return null;
    }
    
    return data;
  } catch (error) {
    showLoading(false);
    showToast("Lỗi kết nối API: " + error.message);
    console.error("postData error:", error);
    return null;
  }
}

// ================= SETTINGS (LocalStorage) =================
const DEFAULT_SETTINGS = {
  quickChipsChi: null,
  quickChipsThu: null,
  quickLoaiThu: ["Thu income", "Tiền về", "Khác"]
};

function getDefaultChips(type) {
  if (type === 'chi') {
    const sourceList = loaiChiList;
    const fieldName = 'mo_ta_chi';
    
    if (!sourceList || sourceList.length === 0) {
      console.warn(`getDefaultChips: No chi data available`);
      return ["", "", "", "", "", "", "", ""];
    }
    
    const activeItems = sourceList
      .filter(item => item.active)
      .sort((a, b) => a[fieldName].localeCompare(b[fieldName], 'vi', { sensitivity: 'base' }))
      .slice(0, 8)
      .map(item => item[fieldName]);
    
    while (activeItems.length < 8) {
      activeItems.push("");
    }
    
    console.log(`✅ getDefaultChips(chi): Generated ${activeItems.filter(c => c).length} default chips`);
    return activeItems;
  }
  
  if (type === 'thu') {
    if (!thuList || thuList.length === 0) {
      console.warn(`getDefaultChips: No thu data available`);
      return ["", "", "", "", "", "", "", ""];
    }
    
    const allMoTa = thuList.map(t => t["Mô tả"]).filter(Boolean);
    const distinct = [...new Set(allMoTa)];
    const sorted = distinct.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
    const top8 = sorted.slice(0, 8);
    
    while (top8.length < 8) {
      top8.push("");
    }
    
    console.log(`✅ getDefaultChips(thu): Generated ${top8.filter(c => c).length} default chips`);
    return top8;
  }
  
  return ["", "", "", "", "", "", "", ""];
}

function loadSettings() {
  const stored = localStorage.getItem("soThuChiSettings");
  
  if (stored) {
    console.log('✅ Loading settings from localStorage');
    return JSON.parse(stored);
  }
  
  console.log('⚠️ No localStorage found, generating defaults');
  const defaults = { ...DEFAULT_SETTINGS };
  
  if (loaiChiList && loaiChiList.length > 0) {
    defaults.quickChipsChi = getDefaultChips('chi');
  } else {
    defaults.quickChipsChi = ["", "", "", "", "", "", "", ""];
  }
  
  if (thuList && thuList.length > 0) {
    defaults.quickChipsThu = getDefaultChips('thu');
  } else {
    defaults.quickChipsThu = ["", "", "", "", "", "", "", ""];
  }
  
  return defaults;
}

function saveSettings(settings) {
  localStorage.setItem("soThuChiSettings", JSON.stringify(settings));
}

// ================= STATE =================
let chiDate = new Date();
let thuDate = new Date();
let chiStack = [];
let chiDesc = "";
let chiSource = "";

let editMode = false;
let editIndex = -1;

let thuAmount = 0;
let thuDesc = "";
let thuLoai = "";
let thuSource = "";

let loaiChiList = [];
let thuList = [];
let nguonTienList = [];

// Map màu trực tiếp theo tên nguồn tiền
const NGUON_COLOR_MAP = {
  // Boé – tông ấm
  "Sacom Boé":      { bg: "#FFE5D9", border: "#e8a07a" },
  "SCB + Agri Boé": { bg: "#FADADD", border: "#e09098" },
  "Tech Boé":       { bg: "#FFF9C4", border: "#d4c030" },
  "Tiền mặt Boé":   { bg: "#FCF5C7", border: "#c8b828" },
  "Ví Vnpay Boé":   { bg: "#FFD3B6", border: "#e07040" },
  "Tiền mới":       { bg: "#EDEDED", border: "#a0a0a0" },
  // Mèo – tông mát
  "ACB Mèo":        { bg: "#E0F7FA", border: "#50b8c8" },
  "HD Mèo":         { bg: "#B3E5FC", border: "#2090c0" },
  "Tech Mèo":       { bg: "#D0F0FD", border: "#40b0d0" },
  "Tiền mặt Mèo":   { bg: "#E0F0E9", border: "#50a870" },
  "Ví Momo Mèo":    { bg: "#D4F4DD", border: "#40b860" },
};

// Fallback palette cho nguồn tiền chưa có trong map
const NGUON_PALETTE = [
  "#ffeaea", "#fff3e8", "#fffbe0", "#f3ffe8",
  "#e8fff0", "#e8fff9", "#e8f8ff", "#e8eeff",
  "#eeebff", "#f9e8ff", "#ffe8f8", "#ffe8ed",
  "#fff8e0", "#efffea", "#e8ffff", "#f5e8ff"
];
const NGUON_BORDER_PALETTE = [
  "#ff8080", "#ffaa55", "#f0c800", "#88d430",
  "#40c074", "#30bfa0", "#30b0e8", "#5580f0",
  "#8866f0", "#cc55ee", "#f055c0", "#f07090",
  "#e0a030", "#55c840", "#30cccc", "#a040e0"
];
let _nguonColorCache = null;
function _buildNguonColorCache() {
  if (_nguonColorCache) return;
  const sorted = nguonTienList
    .filter(n => n.active)
    .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi'));
  _nguonColorCache = {};
  let fallbackIdx = 0;
  sorted.forEach((n) => {
    if (NGUON_COLOR_MAP[n.nguon_tien]) {
      _nguonColorCache[n.nguon_tien] = NGUON_COLOR_MAP[n.nguon_tien];
    } else {
      _nguonColorCache[n.nguon_tien] = {
        bg: NGUON_PALETTE[fallbackIdx % NGUON_PALETTE.length],
        border: NGUON_BORDER_PALETTE[fallbackIdx % NGUON_BORDER_PALETTE.length]
      };
      fallbackIdx++;
    }
  });
}
function getNguonBgColor(nguonTien) {
  _buildNguonColorCache();
  return (_nguonColorCache[nguonTien] || {}).bg || "#f9f9fb";
}
function getNguonBorderColor(nguonTien) {
  _buildNguonColorCache();
  return (_nguonColorCache[nguonTien] || {}).border || "#ccc";
}

let settings = null;

let _headerDetailsCache = null;

// ================= HEADER =================
function updateHeader(chiData, thuData) {
  // ===== UPDATE SUMMARY (BALANCE) =====
  const soDuLT = (chiData && chiData.length > 0) 
    ? (chiData[chiData.length - 1]["Số dư lý thuyết"] || 0)
    : 0;
  
  tkSoDuLT = soDuLT;  // Lưu vào biến global cho phần Tổng kết
  
  document.querySelector('.header-summary .balance-tag').textContent = 
    `Số dư LT: ${formatVN(soDuLT)}`;
  
  // ===== BUILD DETAILS HTML =====
  let html = '';
  
  // CHI SECTION
  html += '<div class="header-section-title chi-title" id="header-chi-title">CHI<span id="header-chi-notify" style="margin-left:8px;font-size:14px;color:#007bff;font-weight:normal"></span></div>';
  if (!chiData || chiData.length === 0) {
    html += '<div class="header-empty">Chưa có chi tiêu</div>';
  } else {
    const last3Chi = chiData.slice(-3);
    last3Chi.forEach((chi) => {
      const ngay = chi["Ngày"];
      if (!ngay || !chi.mo_ta_chi) {
        console.warn('⚠️ Chi item thiếu data:', chi);
        return;
      }
      const date = parseDateString(ngay);
      const soTien = chi["Số tiền vnđ"] || 0;
      html += `
        <div class="header-item">
          <span class="item-desc">${chi.mo_ta_chi}</span>
          <span class="item-amount chi-amount">${formatVN(soTien)}</span>
          <span class="item-date">${formatDateShort(date)}</span>
        </div>
      `;
    });
  }
  // THU SECTION
  html += '<div class="header-section-title thu-title" id="header-thu-title">THU<span id="header-thu-notify" style="margin-left:8px;font-size:14px;color:#34c759;font-weight:normal"></span></div>';
  if (!thuData || thuData.length === 0) {
    html += '<div class="header-empty">Chưa có thu nhập</div>';
  } else {
    const lastThu = thuData[thuData.length - 1];
    const ngay = lastThu["Ngày"];
    if (!ngay || !lastThu["Mô tả"]) {
      console.warn('⚠️ Thu item thiếu data:', lastThu);
      return;
    }
    const date = parseDateString(ngay);
    const soTien = lastThu.Thu || 0;
    html += `
      <div class="header-item">
        <span class="item-desc">${lastThu["Mô tả"]}</span>
        <span class="item-amount thu-amount">${formatVN(soTien)}</span>
        <span class="item-date">${formatDateShort(date)}</span>
      </div>
    `;
  }
  
  // Chỉ inject vào DOM nếu header đang mở, ngược lại cache lại
  const headerDetails = document.getElementById("header-details");
  const isCollapsed = headerDetails.classList.contains('collapsed');
  if (isCollapsed) {
    _headerDetailsCache = html;
  } else {
    headerDetails.innerHTML = html;
    _headerDetailsCache = null;
  }
}

// ================= HEADER TOGGLE =================
function initHeaderToggle() {
  const toggleBtn = document.getElementById('header-toggle-btn');
  const headerDetails = document.getElementById('header-details');
  
  if (!toggleBtn || !headerDetails) {
    console.warn('⚠️ Header toggle elements not found');
    return;
  }
  
  // Mặc định: thu gọn, chỉ mở nếu user đã bấm mở trước đó (lưu 'false')
  const isCollapsed = localStorage.getItem('headerCollapsed') !== 'false';
  
  if (isCollapsed) {
    headerDetails.classList.add('collapsed');
    toggleBtn.classList.add('collapsed');
  }
  
  // Toggle handler
  toggleBtn.onclick = () => {
    const nowCollapsed = headerDetails.classList.toggle('collapsed');
    toggleBtn.classList.toggle('collapsed');
    
    // Nếu vừa mở và có cache, inject vào DOM
    if (!nowCollapsed && _headerDetailsCache) {
      headerDetails.innerHTML = _headerDetailsCache;
      _headerDetailsCache = null;
    }
    
    // Lưu trạng thái
    localStorage.setItem('headerCollapsed', nowCollapsed);
  };
  
  console.log('✅ Header toggle initialized');
}


// ================= DATE NAVIGATION =================
const chiDateInput = document.getElementById("chi-date-input");
const chiDateDisplay = document.getElementById("chi-date-display");
const thuDateInput = document.getElementById("thu-date-input");
const thuDateDisplay = document.getElementById("thu-date-display");

function changeDate(currentDate, delta) {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + delta);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (newDate > today) {
    showToast("Không thể chọn ngày tương lai");
    return currentDate;
  }
  
  return newDate;
}

function renderChiDate() {
  chiDateInput.value = formatDateAPI(chiDate);
  chiDateInput.max = formatDateAPI(new Date());
  chiDateDisplay.textContent = `${formatDate(chiDate)}`;
}

function renderThuDate() {
  thuDateInput.value = formatDateAPI(thuDate);
  thuDateInput.max = formatDateAPI(new Date());
  thuDateDisplay.textContent = `${formatDate(thuDate)}`;
}

chiDateDisplay.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  chiDateInput.click();
};

chiDateInput.onchange = (e) => {
  const dateStr = e.target.value;
  if (!dateStr) return;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const selected = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (selected <= today) {
    chiDate = selected;
    renderChiDate();
  } else {
    showToast("Không thể chọn ngày tương lai");
    renderChiDate();
  }
};

document.getElementById("chi-date-prev").onclick = () => {
  chiDate = changeDate(chiDate, -1);
  renderChiDate();
};

document.getElementById("chi-date-next").onclick = () => {
  chiDate = changeDate(chiDate, 1);
  renderChiDate();
};

thuDateDisplay.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  thuDateInput.click();
};

thuDateInput.onchange = (e) => {
  const dateStr = e.target.value;
  if (!dateStr) return;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const selected = new Date(year, month - 1, day);
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (selected <= today) {
    thuDate = selected;
    renderThuDate();
  } else {
    showToast("Không thể chọn ngày tương lai");
    renderThuDate();
  }
};

document.getElementById("thu-date-prev").onclick = () => {
  thuDate = changeDate(thuDate, -1);
  renderThuDate();
};

document.getElementById("thu-date-next").onclick = () => {
  thuDate = changeDate(thuDate, 1);
  renderThuDate();
};

// ================= CHI (EXPENSE) =================
function renderChiChips() {
  const chipGrid = document.getElementById("chi-chips");
  chipGrid.innerHTML = "";
  settings.quickChipsChi.forEach(chip => {
    if (chip) {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = chip;
      btn.onclick = () => {
        document.querySelectorAll("#chi-chips .chip").forEach(c => c.classList.remove("selected"));
        btn.classList.add("selected");
        chiDesc = chip;
        document.getElementById("chi-desc-dropdown").value = "";
        checkChiReady();
      };
      chipGrid.appendChild(btn);
    }
  });
}

function populateChiDropdowns() {
  if (loaiChiList) {
    const select = document.getElementById("chi-desc-dropdown");
    select.innerHTML = '<option value="">-- Mô tả khác --</option>';
    
    // ✅ Sort A-Z theo Tiếng Việt
    const sortedList = loaiChiList
      .filter(item => item.active)
      .sort((a, b) => a.mo_ta_chi.localeCompare(b.mo_ta_chi, 'vi', { sensitivity: 'base' }));
    
    sortedList.forEach(item => {
      const option = document.createElement("option");
      option.value = item.mo_ta_chi;
      option.textContent = item.mo_ta_chi;
      select.appendChild(option);
    });
  }
  
  if (nguonTienList) {
    const select = document.getElementById("chi-source");
    select.innerHTML = '<option value="">-- Nguồn tiền --</option>';
    
    // ✅ Sort A-Z theo Tiếng Việt
    const sortedList = nguonTienList
      .filter(item => item.active)
      .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi', { sensitivity: 'base' }));
    
    sortedList.forEach(item => {
      const option = document.createElement("option");
      option.value = item.nguon_tien;
      option.textContent = item.nguon_tien;
      select.appendChild(option);
    });
  }
}

const chiInput = document.getElementById("chi-input");
const chiAddBtn = document.getElementById("chi-add");
const chiClearBtn = document.getElementById("chi-clear");

chiInput.oninput = () => {
  // Không cần lọc ký tự, chỉ lấy giá trị trực tiếp
  let val = chiInput.value;
  let num = parseFloat(val) || 0;
  if (editMode) {
    if (val && num !== 0) {
      chiStack[editIndex] = num;
    }
    chiAddBtn.textContent = "✓";
    chiAddBtn.classList.add("btn-confirm");
    chiClearBtn.textContent = "🗑️";
  } else {
    chiAddBtn.textContent = "+";
    chiAddBtn.classList.remove("btn-confirm");
    chiClearBtn.textContent = "↻";
  }
  renderChiStack();
};

function addChiValue() {
  const val = chiInput.value;
  const num = parseFloat(val) || 0;
  if (!val || num === 0) return;
  if (editMode) {
    chiStack[editIndex] = num;
    editMode = false;
    editIndex = -1;
  } else {
    chiStack.push(num);
  }
  chiInput.value = "";
  chiAddBtn.textContent = "+";
  chiAddBtn.classList.remove("btn-confirm");
  chiClearBtn.textContent = "↻";
  renderChiStack();
}

let isAddingFromButton = false;
let isDeletingFromButton = false;

document.getElementById("chi-add").onmousedown = () => {
  isAddingFromButton = true;
};

document.getElementById("chi-add").onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    isAddingFromButton = true;
  }
};

document.getElementById("chi-add").onclick = () => {
  addChiValue();
  chiInput.focus();
  isAddingFromButton = false;
};

chiInput.onblur = () => {
  if (!isAddingFromButton && !isDeletingFromButton) {
    addChiValue();
  }
  setTimeout(() => {
    isAddingFromButton = false;
    isDeletingFromButton = false;
  }, 0);
};

window.enterChiEditMode = function(index) {
  editMode = true;
  editIndex = index;
  chiInput.value = chiStack[index];
  chiInput.focus();
  chiAddBtn.textContent = "✓";
  chiAddBtn.classList.add("btn-confirm");
  chiClearBtn.textContent = "🗑️";
  renderChiStack();
};

function renderChiStack() {
  const display = document.getElementById("chi-stack");
  // Lấy trực tiếp số từ input number, không lọc, chỉ format
  const currentInputNum = chiInput.value ? parseFloat(chiInput.value) : 0;
  if (!chiStack.length && !currentInputNum) {
    display.innerHTML = "Tổng: 0";
    checkChiReady();
    return;
  }
  const existingTotal = chiStack.reduce((a, b) => a + b, 0);
  if (!chiStack.length && currentInputNum && !editMode) {
    display.innerHTML = `Tổng: ${formatVN(currentInputNum * 1000)}`;
    checkChiReady();
    return;
  }

  if (chiStack.length && currentInputNum && !editMode) {
    const parts = chiStack.map((n, i) => {
      return `<span class=\"stack-num\" data-index=\"${i}\" onclick=\"window.enterChiEditMode(${i})\">${formatVN((n * 1000).toFixed(6))}</span>`;
    });
    let newTotal = (existingTotal + currentInputNum) * 1000;
    display.innerHTML = `Tổng: ${parts.join(" + ")} + ${formatVN((currentInputNum * 1000).toFixed(6))} = ${formatVN(newTotal.toFixed(6))}`;
  } else {
    const parts = chiStack.map((n, i) => {
      const className = (editMode && i === editIndex) ? "stack-num editing" : "stack-num";
      return `<span class=\"${className}\" data-index=\"${i}\" onclick=\"window.enterChiEditMode(${i})\">${formatVN(n * 1000)}</span>`;
    });
    display.innerHTML = `Tổng: ${parts.join(" + ")} = ${formatVN(existingTotal * 1000)}`;
  }
  checkChiReady();
}

function deleteChiStackNumber(index) {
  chiStack.splice(index, 1);
  
  editMode = false;
  editIndex = -1;
  
  const originalOnInput = chiInput.oninput;
  chiInput.oninput = null;
  
  chiInput.value = "";
  
  chiInput.oninput = originalOnInput;
  
  chiAddBtn.textContent = "+";
  chiAddBtn.classList.remove("btn-confirm");
  chiClearBtn.textContent = "↻";
  
  renderChiStack();
}

document.getElementById("chi-desc-dropdown").onchange = (e) => {
  if (e.target.value) {
    chiDesc = e.target.value;
    document.querySelectorAll("#chi-chips .chip").forEach(c => c.classList.remove("selected"));
    checkChiReady();
  }
};

document.getElementById("chi-source").onchange = (e) => {
  chiSource = e.target.value;
  checkChiReady();
};

function checkChiReady() {
  document.getElementById("chi-submit").disabled = !(chiStack.length && chiDesc && chiSource);
}

document.getElementById("chi-clear").onmousedown = () => {
  isDeletingFromButton = true;
};

document.getElementById("chi-clear").onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    isDeletingFromButton = true;
  }
};

document.getElementById("chi-clear").onclick = () => {
  if (editMode) {
    deleteChiStackNumber(editIndex);
  } else {
    if (confirm("Xóa hết tất cả dữ liệu chi?")) {
      resetChiSection();
    }
  }
  isDeletingFromButton = false;
};

function resetChiSection() {
  chiStack = [];
  chiDesc = "";
  chiSource = "";
  editMode = false;
  editIndex = -1;
  chiInput.value = "";
  document.getElementById("chi-stack").innerHTML = "Tổng: 0";
  document.getElementById("chi-desc-dropdown").value = "";
  document.getElementById("chi-source").value = "";
  document.querySelectorAll("#chi-chips .chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("chi-submit").disabled = true;
  chiAddBtn.textContent = "+";
  chiAddBtn.classList.remove("btn-confirm");
  chiClearBtn.textContent = "↻";
  chiInput.focus();
}

document.getElementById("chi-submit").onclick = async () => {
  const payload = {
    ngay: formatDateAPI(chiDate),
    so_tien_nghin: createFormula(chiStack),
    mo_ta_chi: chiDesc,
    nguon_tien: chiSource
  };
  console.log('📤 CHI Submit payload:', payload);
  const result = await postData("insert_chi", payload);
  if (result && result.status === 'success') {
    // Thông báo giống phần THU, chỉ format số gốc, không nhân 1000
    let chiTotal = chiStack.reduce((a, b) => a + b, 0);
    showToast(`Đã thêm chi: <b>${formatVN(chiTotal)}</b> VNĐ`, 3000);
    const [chiDataRaw, thuDataRaw] = await Promise.all([
      fetchData("Chi_Tieu_2026"),
      fetchData("Thu_2026")
    ]);
    const chiData = chiDataRaw.filter(item => item.IDChi && item.IDChi.trim());
    const thuData = thuDataRaw.filter(item => item.IDThu && item.IDThu.trim());
    updateHeader(chiData, thuData);
    resetChiSection();
  }
};

// ================= THU (INCOME) =================
let thuStack = [];
let thuEditMode = false;
let thuEditIndex = -1;

function onThuDescChange(desc) {
  if (!desc) {
    const loaiThuDropdown = document.getElementById("thu-loai");
    loaiThuDropdown.disabled = false;
    loaiThuDropdown.style.background = "";
    loaiThuDropdown.style.cursor = "";
    return;
  }
  
  const existing = thuList.find(t => t["Mô tả"] === desc);
  const loaiThuDropdown = document.getElementById("thu-loai");
  
  if (existing && existing["Loại thu"]) {
    thuLoai = existing["Loại thu"];
    loaiThuDropdown.value = thuLoai;
    loaiThuDropdown.disabled = true;
    loaiThuDropdown.style.background = "#f0f0f0";
    loaiThuDropdown.style.cursor = "not-allowed";
  } else {
    loaiThuDropdown.disabled = false;
    loaiThuDropdown.style.background = "";
    loaiThuDropdown.style.cursor = "";
  }
  
  checkThuReady();
}

function renderThuChips() {
  const chipGrid = document.getElementById("thu-chips");
  chipGrid.innerHTML = "";
  settings.quickChipsThu.forEach(chip => {
    if (chip) {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = chip;
      btn.onclick = () => {
        document.querySelectorAll("#thu-chips .chip").forEach(c => c.classList.remove("selected"));
        btn.classList.add("selected");
        thuDesc = chip;
        document.getElementById("thu-desc-input").value = "";
        onThuDescChange(chip);
      };
      chipGrid.appendChild(btn);
    }
  });
}

function populateThuDropdowns() {
  if (nguonTienList) {
    const select = document.getElementById("thu-source");
    select.innerHTML = '<option value="">-- Nguồn tiền --</option>';
    
    // ✅ Sort A-Z theo Tiếng Việt
    const sortedList = nguonTienList
      .filter(item => item.active)
      .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi', { sensitivity: 'base' }));
    
    sortedList.forEach(item => {
      const option = document.createElement("option");
      option.value = item.nguon_tien;
      option.textContent = item.nguon_tien;
      select.appendChild(option);
    });
  }
  
  const loaiSelect = document.getElementById("thu-loai");
  loaiSelect.innerHTML = '<option value="">-- Loại thu --</option>';
  
  // ✅ Sort A-Z
  const sortedLoai = [...settings.quickLoaiThu].sort((a, b) => 
    a.localeCompare(b, 'vi', { sensitivity: 'base' })
  );
  
  sortedLoai.forEach(loai => {
    if (loai) {
      const option = document.createElement("option");
      option.value = loai;
      option.textContent = loai;
      loaiSelect.appendChild(option);
    }
  });
}

const thuInput = document.getElementById("thu-input");
const thuAddBtn = document.getElementById("thu-add");
const thuClearBtn = document.getElementById("thu-clear");

// Đơn giản hóa: dùng input type="number" để chỉ nhập số
thuInput.oninput = () => {
  const val = parseFloat(thuInput.value) || 0;
  
  if (thuEditMode) {
    if (val > 0) {
      thuStack[thuEditIndex] = val;
    }
    thuAddBtn.textContent = "✓";
    thuAddBtn.classList.add("btn-confirm");
    thuClearBtn.textContent = "🗑️";
  } else {
    thuAddBtn.textContent = "+";
    thuAddBtn.classList.remove("btn-confirm");
    thuClearBtn.textContent = "↻";
  }
  
  renderThuStack();
};

function addThuValue() {
  const val = parseFloat(thuInput.value) || 0;
  if (val <= 0) return;
  
  const num = val;
  
  if (thuEditMode) {
    thuStack[thuEditIndex] = num;
    thuEditMode = false;
    thuEditIndex = -1;
  } else {
    thuStack.push(num);
  }
  
  thuInput.value = "";
  
  thuAddBtn.textContent = "+";
  thuAddBtn.classList.remove("btn-confirm");
  thuClearBtn.textContent = "↻";
  
  renderThuStack();
}

let isThuAddingFromButton = false;
let isThuDeletingFromButton = false;

thuAddBtn.onmousedown = () => {
  isThuAddingFromButton = true;
};

thuAddBtn.onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    isThuAddingFromButton = true;
  }
};

thuAddBtn.onclick = () => {
  addThuValue();
  thuInput.focus();
  isThuAddingFromButton = false;
};

thuInput.onblur = () => {
  if (!isThuAddingFromButton && !isThuDeletingFromButton) {
    addThuValue();
  }
  setTimeout(() => {
    isThuAddingFromButton = false;
    isThuDeletingFromButton = false;
  }, 0);
};

window.enterThuEditMode = function(index) {
  thuEditMode = true;
  thuEditIndex = index;
  thuInput.value = thuStack[index].toLocaleString('vi-VN');
  thuInput.focus();
  thuAddBtn.textContent = "✓";
  thuAddBtn.classList.add("btn-confirm");
  thuClearBtn.textContent = "🗑️";
  renderThuStack();
};

function renderThuStack() {
  const display = document.getElementById("thu-display");
  // Lấy trực tiếp số từ input number, không lọc, chỉ format
  const currentInputNum = thuInput.value ? parseFloat(thuInput.value) : 0;
  
  if (!thuStack.length && !currentInputNum) {
    display.innerHTML = "Tổng: 0";
    thuAmount = 0;
    checkThuReady();
    return;
  }
  
  const existingTotal = thuStack.reduce((a, b) => a + b, 0);
  
  if (!thuStack.length && currentInputNum && !thuEditMode) {
    display.innerHTML = `Tổng: ${formatVN(thuInput.value)}`;
    thuAmount = currentInputNum;
    checkThuReady();
    return;
  }

  if (thuStack.length && currentInputNum && !thuEditMode) {
    const parts = thuStack.map((n, i) => {
      return `<span class="stack-num" data-index="${i}" onclick="window.enterThuEditMode(${i})">${formatVN(n)}</span>`;
    });
    let newTotal = existingTotal + currentInputNum;
    // Cắt phần thập phân về tối đa 6 số, không thêm số 0 thừa
    let newTotalStr = String(newTotal);
    if (newTotalStr.includes(".")) {
      let [nguyen, thapphan] = newTotalStr.split(".");
      thapphan = thapphan.slice(0, 6);
      // Xoá số 0 thừa phía sau
      thapphan = thapphan.replace(/0+$/, "");
      newTotalStr = thapphan ? nguyen + "." + thapphan : nguyen;
    }
    display.innerHTML = `Tổng: ${parts.join(" + ")} + ${formatVN(thuInput.value)} = ${formatVN(newTotalStr)}`;
    thuAmount = parseFloat(newTotalStr);
  } else {
    const parts = thuStack.map((n, i) => {
      const className = (thuEditMode && i === thuEditIndex) ? "stack-num editing" : "stack-num";
      return `<span class="${className}" data-index="${i}" onclick="window.enterThuEditMode(${i})">${formatVN(n)}</span>`;
    });
    display.innerHTML = `Tổng: ${parts.join(" + ")} = ${formatVN(existingTotal)}`;
    thuAmount = existingTotal;
  }
  
  checkThuReady();
}

function deleteThuStackNumber(index) {
  thuStack.splice(index, 1);
  
  thuEditMode = false;
  thuEditIndex = -1;
  
  const originalOnInput = thuInput.oninput;
  thuInput.oninput = null;
  
  thuInput.value = "";
  
  thuInput.oninput = originalOnInput;
  
  thuAddBtn.textContent = "+";
  thuAddBtn.classList.remove("btn-confirm");
  thuClearBtn.textContent = "↻";
  
  renderThuStack();
}

thuClearBtn.onmousedown = () => {
  isThuDeletingFromButton = true;
};

thuClearBtn.onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    isThuDeletingFromButton = true;
  }
};

thuClearBtn.onclick = () => {
  if (thuEditMode) {
    deleteThuStackNumber(thuEditIndex);
  } else {
    if (confirm("Xóa hết tất cả dữ liệu thu?")) {
      resetThuSection();
    }
  }
  isThuDeletingFromButton = false;
};

document.getElementById("thu-desc-input").oninput = (e) => {
  thuDesc = e.target.value;
  if (thuDesc) {
    document.querySelectorAll("#thu-chips .chip").forEach(c => c.classList.remove("selected"));
    onThuDescChange(thuDesc);
  } else {
    onThuDescChange("");
  }
};

document.getElementById("thu-loai").onchange = (e) => {
  thuLoai = e.target.value;
  checkThuReady();
};

document.getElementById("thu-source").onchange = (e) => {
  thuSource = e.target.value;
  checkThuReady();
};

function checkThuReady() {
  document.getElementById("thu-submit").disabled = !(thuAmount && thuDesc && thuLoai && thuSource);
}

function resetThuSection() {
  thuStack = [];
  thuAmount = 0;
  thuDesc = "";
  thuLoai = "";
  thuSource = "";
  thuEditMode = false;
  thuEditIndex = -1;
  thuInput.value = "";
  document.getElementById("thu-display").textContent = "Tổng: 0";
  document.getElementById("thu-desc-input").value = "";
  const loaiThuDropdown = document.getElementById("thu-loai");
  loaiThuDropdown.value = "";
  loaiThuDropdown.disabled = false;
  loaiThuDropdown.style.background = "";
  loaiThuDropdown.style.cursor = "";
  document.getElementById("thu-source").value = "";
  document.querySelectorAll("#thu-chips .chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("thu-submit").disabled = true;
  thuAddBtn.textContent = "+";
  thuAddBtn.classList.remove("btn-confirm");
  thuClearBtn.textContent = "↻";
  thuInput.focus();
}

document.getElementById("thu-submit").onclick = async () => {
  const formula = thuStack.length ? createFormula(thuStack) : createFormula([thuAmount]);
  
  const payload = {
    ngay: formatDateAPI(thuDate),
    so_tien: formula,
    mo_ta: thuDesc,
    loai_thu: thuLoai,
    nguon_tien: thuSource
  };
  
  console.log('📤 THU Submit payload:', payload);
  
  const result = await postData("insert_thu", payload);
  if (result && result.status === 'success') {
    // Hiển thị thông báo cạnh chữ THU
    setTimeout(() => {
      const thuNotify = document.getElementById("header-thu-notify");
      if (thuNotify) {
        thuNotify.textContent = "Thêm mới thành công!";
        setTimeout(() => { thuNotify.textContent = ""; }, 3000);
      }
    }, 100); // Đợi updateHeader render xong
    const [chiDataRaw, thuDataRaw] = await Promise.all([
      fetchData("Chi_Tieu_2026"),
      fetchData("Thu_2026")
    ]);
    const chiData = chiDataRaw.filter(item => item.IDChi && item.IDChi.trim());
    const thuData = thuDataRaw.filter(item => item.IDThu && item.IDThu.trim());
    updateHeader(chiData, thuData);
    thuList = thuData || [];
    resetThuSection();
  }
};

// ================= TOOLTIP NGHÌN VND =================
let _tkTooltipTimer = null;
function showNghinTooltip(targetEl, nghinVnd) {
  let tip = document.getElementById("tk-nghin-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "tk-nghin-tooltip";
    document.body.appendChild(tip);
  }
  let content = nghinVnd || "—";
  try {
    const formula = (nghinVnd || "").replace(/^=/, "");
    const parts = formula.split("+").map(s => s.trim().replace(",", ".")).filter(Boolean);
    const nums = parts.map(p => parseFloat(p)).filter(n => !isNaN(n));
    if (nums.length > 1) {
      const total = nums.reduce((a, b) => a + b, 0);
      content = nums.map(n => formatVN(n * 1000)).join(" + ") + " = " + formatVN(total * 1000) + "đ";
    } else if (nums.length === 1) {
      content = formatVN(nums[0] * 1000) + "đ";
    }
  } catch(e) {}
  tip.textContent = content;
  tip.style.display = "block";
  const rect = targetEl.getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2 + window.scrollX) + "px";
  tip.style.top = (rect.top + window.scrollY - 10) + "px";
  tip.style.transform = "translateX(-50%) translateY(-100%)";
  clearTimeout(_tkTooltipTimer);
  _tkTooltipTimer = setTimeout(() => { tip.style.display = "none"; }, 3000);
  const hideOnClick = () => { tip.style.display = "none"; document.removeEventListener("click", hideOnClick, true); };
  setTimeout(() => document.addEventListener("click", hideOnClick, true), 0);
}

// ================= TỔNG KẾT (SUMMARY) =================
let tkInputs = {};
let tkSoDuLT = 0;
let tkEditedChiIds = new Set();
let tkEditedThuIds = new Set();
let tkTamTinh = {};
let tkLastDate = null;

function getTkLastDate() {
  if (!window.tkDetailList || !Array.isArray(window.tkDetailList) || !window.tkDetailList.length) return null;
  const dates = window.tkDetailList.map(r => r.ngay_tk).filter(Boolean).map(d => new Date(d));
  if (!dates.length) return null;
  return new Date(Math.max(...dates));
}

async function loadTkData() {
  const [tkDetail, chi, thu] = await Promise.all([
    fetchData('tk_detail'),
    fetchData('Chi_Tieu_2026'),
    fetchData('Thu_2026')
  ]);
  window.tkDetailList = tkDetail;
  window.tkChiList = chi.filter(item => item.IDChi && item.IDChi.trim());
  window.tkThuList = thu.filter(item => item.IDThu && item.IDThu.trim());
}

document.getElementById("tk-start").onclick = async () => {
  document.getElementById("tk-form").style.display = "block";
  document.getElementById("tk-start").style.display = "none";
  document.getElementById("tk-refresh").style.display = "block";
  await loadTkData();
  tkLastDate = getTkLastDate();
  renderChiChuaTK();
  renderThuChuaTK();
  loadTongKet();
};

document.getElementById("tk-refresh").onclick = async () => {
  await loadTkData();
  tkLastDate = getTkLastDate();
  renderChiChuaTK();
  renderThuChuaTK();
  loadTongKet();
};

function renderChiChuaTK() {
  const section = document.getElementById("tk-chi-section");
  const list = document.getElementById("tk-chi-list");
  const countEl = document.getElementById("tk-chi-count");

  const rows = (window.tkChiList || []).filter(row => {
    if (!tkLastDate) return true;
    return new Date(row["Ngày"]) > tkLastDate;
  });

  countEl.textContent = `(${rows.length} dòng)`;
  section.style.display = rows.length ? "block" : "none";
  list.innerHTML = "";

  rows.forEach(row => {
    const id = row["IDChi"];
    const isEdited = tkEditedChiIds.has(id);
    const nghinVnd = row["Nghìn VND"] !== undefined ? String(row["Nghìn VND"]) : "";
    const soTienDisplay = formatVN(parseFloat(row["Số tiền vnđ"]) || 0);
    const rowEl = document.createElement("div");
    rowEl.className = "tk-list-row" + (isEdited ? " tk-row-edited" : "");
    rowEl.dataset.id = id;
    rowEl.style.backgroundColor = getNguonBgColor(row["Nguồn tiền"]);
    rowEl.style.borderLeft = `4px solid ${getNguonBorderColor(row["Nguồn tiền"])}`;
    rowEl.style.paddingLeft = "10px";
    rowEl.style.borderRadius = "8px";
    rowEl.style.marginBottom = "4px";
    if (isEdited) {
      rowEl.style.boxShadow = "inset 0 0 0 2.5px #e6a200";
      rowEl.style.borderRadius = "8px";
    }

    const moTaOptions = loaiChiList.filter(l => l.active)
      .sort((a, b) => a.mo_ta_chi.localeCompare(b.mo_ta_chi, 'vi'))
      .map(l => `<option value="${l.mo_ta_chi}" ${l.mo_ta_chi === row["mo_ta_chi"] ? "selected" : ""}>${l.mo_ta_chi}</option>`)
      .join("");
    const nguonOptions = nguonTienList.filter(n => n.active)
      .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi'))
      .map(n => `<option value="${n.nguon_tien}" ${n.nguon_tien === row["Nguồn tiền"] ? "selected" : ""}>${n.nguon_tien}</option>`)
      .join("");

    rowEl.innerHTML = `
      <div class="tk-list-view">
        <div class="tk-list-cell tk-cell-ngay">${formatDateTK(row["Ngày"])}</div>
        <div class="tk-list-cell tk-cell-mota">${row["mo_ta_chi"] || ""}</div>
        <div class="tk-list-cell tk-cell-nguon">${row["Nguồn tiền"] || ""}</div>
        <div class="tk-list-cell tk-cell-sotien red-text tk-sotien-tip">${soTienDisplay}</div>
        <button class="tk-btn-edit" title="Sửa">✏️</button>
      </div>
      <div class="tk-list-edit" style="display:none;">
        <div class="tk-edit-row"><label>Ngày</label><input type="date" class="input-std tk-edit-ngay" value="${row["Ngày"] || ""}"></div>
        <div class="tk-edit-row"><label>Mô tả</label><select class="input-std tk-edit-mota">${moTaOptions}</select></div>
        <div class="tk-edit-row"><label>Nguồn tiền</label><select class="input-std tk-edit-nguon">${nguonOptions}</select></div>
        <div class="tk-edit-row">
          <label>Nghìn VND</label>
          <input type="text" class="input-std tk-edit-nghin" value="${nghinVnd}" placeholder="VD: =4+1,5">
          <span class="tk-edit-preview red-text"></span>
        </div>
        <div class="tk-edit-actions">
          <button class="btn-submit btn-green tk-btn-confirm-edit" style="flex:1;margin-top:0;">✅ Xác nhận</button>
          <button class="btn-submit btn-gray tk-btn-cancel" style="flex:1;margin-top:0;">❌ Hủy</button>
          <button class="btn-submit btn-red tk-btn-delete" style="flex:1;margin-top:0;">🗑️ Xoá</button>
        </div>
      </div>
    `;

    const nghinInput = rowEl.querySelector(".tk-edit-nghin");
    const previewEl = rowEl.querySelector(".tk-edit-preview");
    nghinInput.oninput = () => {
      try {
        const cleaned = nghinInput.value.replace(/^=/, "").replace(/,/g, ".");
        const computed = Function('"use strict"; return (' + cleaned + ')')();
        previewEl.textContent = isFinite(computed) ? `= ${formatVN(computed * 1000)}` : "";
      } catch(e) { previewEl.textContent = ""; }
    };
    nghinInput.dispatchEvent(new Event("input"));

    rowEl.querySelector(".tk-sotien-tip").onclick = (e) => {
      e.stopPropagation();
      showNghinTooltip(e.currentTarget, nghinVnd);
    };

    rowEl.querySelector(".tk-btn-edit").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "none";
      rowEl.querySelector(".tk-list-edit").style.display = "block";
    };
    rowEl.querySelector(".tk-btn-cancel").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "flex";
      rowEl.querySelector(".tk-list-edit").style.display = "none";
    };
    rowEl.querySelector(".tk-btn-confirm-edit").onclick = async () => {
      const payload = {
        idChi: id,
        ngay: rowEl.querySelector(".tk-edit-ngay").value,
        mo_ta_chi: rowEl.querySelector(".tk-edit-mota").value,
        nguon_tien: rowEl.querySelector(".tk-edit-nguon").value,
        so_tien_nghin: rowEl.querySelector(".tk-edit-nghin").value
      };
      const result = await postData("update_chi", payload);
      if (result && result.status === "success") {
        tkEditedChiIds.add(id);
        showToast("Đã cập nhật chi thành công");
        const chi = await fetchData('Chi_Tieu_2026');
        window.tkChiList = chi.filter(item => item.IDChi && item.IDChi.trim());
        renderChiChuaTK();
        loadTongKet();
      }
    };
    rowEl.querySelector(".tk-btn-delete").onclick = async () => {
      if (!confirm(`Xác nhận xoá khoản chi "${row["mo_ta_chi"]}"?`)) return;
      const result = await postData("delete_chi", { idChi: id });
      if (result && result.status === "success") {
        showToast("Đã xoá khoản chi thành công");
        const chi = await fetchData('Chi_Tieu_2026');
        window.tkChiList = chi.filter(item => item.IDChi && item.IDChi.trim());
        renderChiChuaTK();
        loadTongKet();
      }
    };
    list.appendChild(rowEl);
  });
}

function renderThuChuaTK() {
  const section = document.getElementById("tk-thu-section");
  const list = document.getElementById("tk-thu-list");
  const countEl = document.getElementById("tk-thu-count");

  const rows = (window.tkThuList || []).filter(row => {
    if (!tkLastDate) return true;
    return new Date(row["Ngày"]) > tkLastDate;
  });

  countEl.textContent = `(${rows.length} dòng)`;
  section.style.display = rows.length ? "block" : "none";
  list.innerHTML = "";

  rows.forEach(row => {
    const id = row["IDThu"];
    const isEdited = tkEditedThuIds.has(id);
    const soTienDisplay = formatVN(parseFloat(row["Thu"]) || 0);
    const rowEl = document.createElement("div");
    rowEl.className = "tk-list-row" + (isEdited ? " tk-row-edited" : "");
    rowEl.dataset.id = id;
    rowEl.style.backgroundColor = getNguonBgColor(row["Nguồn tiền"]);
    rowEl.style.borderLeft = `4px solid ${getNguonBorderColor(row["Nguồn tiền"])}`;
    rowEl.style.paddingLeft = "10px";
    rowEl.style.borderRadius = "8px";
    rowEl.style.marginBottom = "4px";
    if (isEdited) {
      rowEl.style.boxShadow = "inset 0 0 0 2.5px #e6a200";
      rowEl.style.borderRadius = "8px";
    }

    const nguonOptions = nguonTienList.filter(n => n.active)
      .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi'))
      .map(n => `<option value="${n.nguon_tien}" ${n.nguon_tien === row["Nguồn tiền"] ? "selected" : ""}>${n.nguon_tien}</option>`)
      .join("");
    const loaiOptions = (settings.quickLoaiThu || [])
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(l => `<option value="${l}" ${l === row["Loại thu"] ? "selected" : ""}>${l}</option>`)
      .join("");

    rowEl.innerHTML = `
      <div class="tk-list-view">
        <div class="tk-list-cell tk-cell-ngay">${formatDateTK(row["Ngày"])}</div>
        <div class="tk-list-cell tk-cell-mota">${row["Mô tả"] || ""}</div>
        <div class="tk-list-cell tk-cell-nguon">${row["Nguồn tiền"] || ""}</div>
        <div class="tk-list-cell tk-cell-loai">${row["Loại thu"] || ""}</div>
        <div class="tk-list-cell tk-cell-sotien green-text">${soTienDisplay}</div>
        <button class="tk-btn-edit" title="Sửa">✏️</button>
      </div>
      <div class="tk-list-edit" style="display:none;">
        <div class="tk-edit-row"><label>Ngày</label><input type="date" class="input-std tk-edit-ngay" value="${row["Ngày"] || ""}"></div>
        <div class="tk-edit-row"><label>Mô tả</label><input type="text" class="input-std tk-edit-mota" value="${row["Mô tả"] || ""}"></div>
        <div class="tk-edit-row"><label>Nguồn tiền</label><select class="input-std tk-edit-nguon">${nguonOptions}</select></div>
        <div class="tk-edit-row"><label>Loại thu</label><select class="input-std tk-edit-loai">${loaiOptions}</select></div>
        <div class="tk-edit-row"><label>Số tiền</label><input type="number" class="input-std tk-edit-sotien" value="${parseFloat(row['Thu']) || 0}"></div>
        <div class="tk-edit-actions">
          <button class="btn-submit btn-green tk-btn-confirm-edit" style="flex:1;margin-top:0;">✅ Xác nhận</button>
          <button class="btn-submit btn-gray tk-btn-cancel" style="flex:1;margin-top:0;">❌ Hủy</button>
          <button class="btn-submit btn-red tk-btn-delete" style="flex:1;margin-top:0;">🗑️ Xoá</button>
        </div>
      </div>
    `;

    rowEl.querySelector(".tk-btn-edit").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "none";
      rowEl.querySelector(".tk-list-edit").style.display = "block";
    };
    rowEl.querySelector(".tk-btn-cancel").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "flex";
      rowEl.querySelector(".tk-list-edit").style.display = "none";
    };
    rowEl.querySelector(".tk-btn-confirm-edit").onclick = async () => {
      const payload = {
        idThu: id,
        ngay: rowEl.querySelector(".tk-edit-ngay").value,
        mo_ta: rowEl.querySelector(".tk-edit-mota").value,
        nguon_tien: rowEl.querySelector(".tk-edit-nguon").value,
        loai_thu: rowEl.querySelector(".tk-edit-loai").value,
        so_tien: parseFloat(rowEl.querySelector(".tk-edit-sotien").value) || 0
      };
      const result = await postData("update_thu", payload);
      if (result && result.status === "success") {
        tkEditedThuIds.add(id);
        showToast("Đã cập nhật thu thành công");
        const thu = await fetchData('Thu_2026');
        window.tkThuList = thu.filter(item => item.IDThu && item.IDThu.trim());
        renderThuChuaTK();
        loadTongKet();
      }
    };
    rowEl.querySelector(".tk-btn-delete").onclick = async () => {
      if (!confirm(`Xác nhận xoá khoản thu "${row["Mô tả"]}"?`)) return;
      const result = await postData("delete_thu", { idThu: id });
      if (result && result.status === "success") {
        showToast("Đã xoá khoản thu thành công");
        const thu = await fetchData('Thu_2026');
        window.tkThuList = thu.filter(item => item.IDThu && item.IDThu.trim());
        renderThuChuaTK();
        loadTongKet();
      }
    };
    list.appendChild(rowEl);
  });
}

function loadTongKet() {
  const inputsContainer = document.getElementById("tk-inputs");
  inputsContainer.innerHTML = "";

  const ghiNho = JSON.parse(localStorage.getItem("tkSoDuGhiNho") || "{}");
  const hasGhiNho = Object.keys(ghiNho).length > 0;

  const remBtn = document.getElementById("tk-remember");
  if (remBtn) remBtn.textContent = hasGhiNho ? "Dùng giá trị tạm" : "Ghi nhớ số dư";

  // Sắp xếp theo người (Mèo → Boé → Khác) rồi theo tên tài khoản
  const NGUOI_ORDER = ["Mèo", "Boé"];
  const sortedNguonTien = nguonTienList
    .filter(n => n.active)
    .sort((a, b) => {
      const ai = NGUOI_ORDER.indexOf(a.nguoi || "");
      const bi = NGUOI_ORDER.indexOf(b.nguoi || "");
      const ra = ai === -1 ? 999 : ai;
      const rb = bi === -1 ? 999 : bi;
      if (ra !== rb) return ra - rb;
      return a.nguon_tien.localeCompare(b.nguon_tien, 'vi', { sensitivity: 'base' });
    });

  // Bảng màu khung theo người
  const NGUOI_GROUP_COLORS = {
    "Mèo":  { border: "#f48fb1", bg: "transparent", label: "#c2185b" },
    "Boé":  { border: "#90caf9", bg: "transparent", label: "#1565c0" },
    default: { border: "#b0bec5", bg: "transparent", label: "#546e7a" }
  };

  let currentNguoi = null;
  let currentGroup = null;

  sortedNguonTien.forEach(nguon => {
    // Tạo khung màu mới cho từng người
    if (nguon.nguoi !== currentNguoi) {
      currentNguoi = nguon.nguoi;
      const colors = NGUOI_GROUP_COLORS[currentNguoi] || NGUOI_GROUP_COLORS.default;
      currentGroup = document.createElement("div");
      currentGroup.className = "tk-nguoi-group";
      currentGroup.style.borderColor = colors.border;
      currentGroup.style.backgroundColor = colors.bg;
      const groupLabel = document.createElement("div");
      groupLabel.className = "tk-nguoi-group-label";
      groupLabel.textContent = currentNguoi || "Khác";
      groupLabel.style.color = colors.label;
      groupLabel.style.borderBottomColor = colors.border;
      currentGroup.appendChild(groupLabel);
      inputsContainer.appendChild(currentGroup);
    }

    let lastSnapshot = null;
    if (window.tkDetailList && Array.isArray(window.tkDetailList)) {
      lastSnapshot = window.tkDetailList
        .filter(row => row.nguon_tien === nguon.nguon_tien)
        .sort((a, b) => new Date(b.ngay_tk) - new Date(a.ngay_tk))[0];
    }
    const lastDate = lastSnapshot ? lastSnapshot.ngay_tk : null;
    const lastSoDu = lastSnapshot ? (parseFloat(lastSnapshot.so_tien) || 0) : 0;

    let thuMoi = 0;
    if (window.tkThuList && Array.isArray(window.tkThuList)) {
      thuMoi = window.tkThuList
        .filter(row => row["Nguồn tiền"] === nguon.nguon_tien && (!lastDate || new Date(row["Ngày"]) > new Date(lastDate)))
        .reduce((sum, row) => sum + (parseFloat(row["Thu"]) || 0), 0);
    }
    let chiMoi = 0;
    if (window.tkChiList && Array.isArray(window.tkChiList)) {
      chiMoi = window.tkChiList
        .filter(row => row["Nguồn tiền"] === nguon.nguon_tien && (!lastDate || new Date(row["Ngày"]) > new Date(lastDate)))
        .reduce((sum, row) => sum + (parseFloat(row["Số tiền vnđ"]) || 0), 0);
    }
    const tamTinh = lastSoDu + thuMoi - chiMoi;
    tkTamTinh[nguon.nguon_tien] = tamTinh;

    const useGhiNho = hasGhiNho && ghiNho[nguon.nguon_tien] !== undefined;
    const inputVal = useGhiNho ? ghiNho[nguon.nguon_tien] : tamTinh;
    tkInputs[nguon.nguon_tien] = inputVal;

    const badgeIcon = useGhiNho
      ? '<span class="tk-badge-icon" title="Đã ghi nhớ">📌</span>'
      : '<span class="tk-badge-icon" title="T\u1ea1m t\u00ednh">🚧</span>';

    const bgColor = getNguonBgColor(nguon.nguon_tien);
    const borderColor = getNguonBorderColor(nguon.nguon_tien);

    const div = document.createElement("div");
    div.className = "tk-input-row-group";
    div.style.backgroundColor = bgColor;
    div.style.borderLeft = `4px solid ${borderColor}`;
    div.style.paddingLeft = "10px";
    div.style.borderRadius = "8px";
    div.style.marginBottom = "6px";
    div.innerHTML = `
      <div class="tk-input-row">
        <div class="tk-label">
          <span class="tk-label-icon">${nguon.icon || ''}</span>
          <span class="tk-label-name">${nguon.nguon_tien}</span>
        </div>
        <div class="tk-input-wrap">
          <div class="tk-input-badge-row">
            <input type="text" inputmode="decimal" data-nguon="${nguon.nguon_tien}" class="input-std tk-amount-input" placeholder="0" value="${formatVN(inputVal, 2)}">
            ${badgeIcon}
          </div>
          <div class="tk-tamtinh-row">
            <div class="tk-tamtinh-label">Tạm tính:</div>
            <div class="tk-tamtinh-value">${formatVN(tamTinh)}</div>
          </div>
        </div>
      </div>
    `;
    currentGroup.appendChild(div);

    const input = div.querySelector("input");
    input.onfocus = () => input.select();
    input.oninput = () => {
      let val = input.value.replace(/[^\d.,]/g, "");
      const parts = val.split(",");
      if (parts.length > 2) val = parts[0] + "," + parts.slice(1).join("");
      const num = parseVN(val);
      const formatted = val ? formatVN(num, 2) : "";
      const oldPos = input.selectionStart;
      const diff = formatted.length - input.value.length;
      input.value = formatted;
      tkInputs[nguon.nguon_tien] = num;
      setTimeout(() => { input.setSelectionRange(oldPos + diff, oldPos + diff); }, 0);
    };
  });
}

document.getElementById("tk-remember").onclick = () => {
  const stored = localStorage.getItem("tkSoDuGhiNho");
  const hasGhiNho = stored && Object.keys(JSON.parse(stored)).length > 0;
  if (hasGhiNho) {
    localStorage.removeItem("tkSoDuGhiNho");
    showToast("Đã chuyển sang dùng giá trị tạm tính");
  } else {
    localStorage.setItem("tkSoDuGhiNho", JSON.stringify(tkInputs));
    showToast("Đã ghi nhớ số dư");
  }
  loadTongKet();
};

document.getElementById("tk-check").onclick = () => {
  const tkSoDuTT = Object.values(tkInputs).reduce((a, b) => a + b, 0);
  const chenhLech = tkSoDuTT - tkSoDuLT;
  document.getElementById("tk-result").innerHTML = `
    <div>Số dư LT: ${formatVN(tkSoDuLT, 2)}</div>
    <div>Số dư TT: ${formatVN(tkSoDuTT, 2)}</div>
    <div>Chênh lệch: ${chenhLech >= 0 ? "+" : ""}${formatVN(chenhLech, 2)}</div>
  `;
  document.getElementById("tk-result").style.display = "block";
  document.getElementById("tk-confirm").style.display = "block";
};

document.getElementById("tk-confirm").onclick = async () => {
  if (!confirm("Xác nhận tổng kết?")) return;
  const tkSoDuTT = Object.values(tkInputs).reduce((a, b) => a + b, 0);
  const chiTiet = Object.entries(tkInputs).map(([nguon, soTien]) => ({
    nguon_tien: nguon,
    so_tien: soTien
  }));
  const payload = {
    ngay_tk: formatDateAPI(new Date()),
    so_du_lt: tkSoDuLT,
    so_du_tt: tkSoDuTT,
    chi_tiet: chiTiet,
    note: ""
  };
  const result = await postData("insert_tk", payload);
  if (result) {
    const chenhLech = tkSoDuTT - tkSoDuLT;
    showToast(`Đã tổng kết thành công\nSố dư LT: ${formatVN(tkSoDuLT, 2)}\nSố dư TT: ${formatVN(tkSoDuTT, 2)}\nChênh lệch: ${formatVN(chenhLech, 2)}`);
    const [chiDataRaw, thuDataRaw] = await Promise.all([
      fetchData("Chi_Tieu_2026"),
      fetchData("Thu_2026")
    ]);
    const chiData = chiDataRaw.filter(item => item.IDChi && item.IDChi.trim());
    const thuData = thuDataRaw.filter(item => item.IDThu && item.IDThu.trim());
    updateHeader(chiData, thuData);
    resetTongKet();
  }
};

function resetTongKet() {
  tkInputs = {};
  tkSoDuLT = 0;
  tkEditedChiIds = new Set();
  tkEditedThuIds = new Set();
  tkTamTinh = {};
  tkLastDate = null;
  localStorage.removeItem("tkSoDuGhiNho");
  document.getElementById("tk-form").style.display = "none";
  document.getElementById("tk-result").style.display = "none";
  document.getElementById("tk-confirm").style.display = "none";
  document.getElementById("tk-refresh").style.display = "none";
  document.getElementById("tk-chi-section").style.display = "none";
  document.getElementById("tk-thu-section").style.display = "none";
  document.getElementById("tk-start").style.display = "block";
}

// ================= MODAL SETTINGS =================

function renderModalCheckboxList(type) {
  console.log('renderModalCheckboxList called for:', type);
  const container = document.getElementById(`${type}-modal-checkbox-list`);
  
  if (!container) {
    console.error(`❌ Container not found: ${type}-modal-checkbox-list`);
    return;
  }
  
  const currentChips = type === 'chi' ? settings.quickChipsChi : settings.quickChipsThu;
  
  let sourceList, fieldName;
  
  if (type === 'chi') {
    sourceList = loaiChiList
      .filter(item => item.active)
      .sort((a, b) => a.mo_ta_chi.localeCompare(b.mo_ta_chi, 'vi', { sensitivity: 'base' }));
    fieldName = 'mo_ta_chi';
  } else {
    const allMoTa = thuList.map(t => t["Mô tả"]).filter(Boolean);
    const distinct = [...new Set(allMoTa)];
    sourceList = distinct.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
                        .map(desc => ({ desc }));
    fieldName = 'desc';
  }
  
  console.log('📊 Data check:', {
    type,
    sourceListLength: sourceList.length,
    currentChipsLength: currentChips.length,
    currentChips: currentChips
  });
  
  if (!sourceList || sourceList.length === 0) {
    console.warn('⚠️ No source data available');
    container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #888;">Chưa có dữ liệu</div>';
    return;
  }
  
  container.innerHTML = '';
  
  sourceList.forEach((item, index) => {
    const desc = type === 'chi' ? item.mo_ta_chi : item.desc;
    const isChecked = currentChips.filter(c => c).includes(desc);
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-modal-chip-${index}`;
    checkbox.checked = isChecked;
    checkbox.dataset.desc = desc;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = desc;
    
    checkbox.onchange = () => {
      handleModalChipToggle(type, desc, checkbox.checked);
    };
    
    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(label);
    container.appendChild(itemDiv);
  });
  
  updateModalSelectedCount(type);
}

function handleModalChipToggle(type, desc, checked) {
  const currentChips = type === 'chi' ? settings.quickChipsChi : settings.quickChipsThu;
  
  if (checked) {
    const nonEmptyCount = currentChips.filter(c => c).length;
    
    if (nonEmptyCount >= 8) {
      showToast("Chỉ được chọn tối đa 8 mô tả");
      const checkbox = document.querySelector(`input[data-desc="${desc}"]`);
      if (checkbox) checkbox.checked = false;
      return;
    }
    
    const firstEmptyIndex = currentChips.findIndex(c => !c);
    if (firstEmptyIndex !== -1) {
      currentChips[firstEmptyIndex] = desc;
    }
  } else {
    const index = currentChips.indexOf(desc);
    if (index !== -1) {
      currentChips[index] = "";
    }
  }
  
  if (type === 'chi') {
    settings.quickChipsChi = currentChips;
  } else {
    settings.quickChipsThu = currentChips;
  }
  
  saveSettings(settings);
  
  if (type === 'chi') {
    renderChiChips();
  } else {
    renderThuChips();
  }
  
  updateModalSelectedCount(type);
}

function updateModalSelectedCount(type) {
  const currentChips = type === 'chi' ? settings.quickChipsChi : settings.quickChipsThu;
  const count = currentChips.filter(c => c).length;
  const countElement = document.getElementById(`${type}-dropdown-count`);
  if (countElement) {
    countElement.textContent = count;
  }
}

function showModal(type) {
  console.log(`🟢 showModal called for: ${type}`);
  const modal = document.getElementById(`${type}-settings-modal`);
  if (!modal) {
    console.error(`❌ Modal not found: ${type}-settings-modal`);
    return;
  }
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  renderModalCheckboxList(type);
  
  if (type === 'chi') {
    populateModalDropdowns(type);
  }
  
  console.log(`✅ Modal ${type} opened`);
}

function hideModal(type) {
  const modal = document.getElementById(`${type}-settings-modal`);
  if (!modal) return;
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function populateModalDropdowns(type) {
  if (type === 'chi') {
    const phanloaiSelect = document.getElementById('chi-modal-new-phanloai');
    if (phanloaiSelect && loaiChiList.length > 0) {
      const uniquePhanLoai = [...new Set(loaiChiList.map(item => item.phan_loai))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
      
      phanloaiSelect.innerHTML = '<option value="">-- Chọn phân loại *--</option>';
      uniquePhanLoai.forEach(phanLoai => {
        const option = document.createElement('option');
        option.value = phanLoai;
        option.textContent = phanLoai;
        phanloaiSelect.appendChild(option);
      });
      
      console.log(`✅ Populated ${uniquePhanLoai.length} phân loại options (sorted A-Z)`);
    }
  }
}

function initModalEventListeners() {
  console.log('🔧 Initializing modal event listeners');
  
  const chiBtn = document.getElementById('chi-settings-btn');
  if (chiBtn) {
    chiBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModal('chi');
    };
  }
  
  const thuBtn = document.getElementById('thu-settings-btn');
  if (thuBtn) {
    thuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showModal('thu');
    };
  }
  
  const chiModalClose = document.getElementById("chi-modal-close");
  if (chiModalClose) {
    chiModalClose.onclick = () => hideModal('chi');
  }
  
  const chiModal = document.getElementById("chi-settings-modal");
  if (chiModal) {
    chiModal.onclick = (e) => {
      if (e.target.id === 'chi-settings-modal') hideModal('chi');
    };
  }
  
  const thuModalClose = document.getElementById("thu-modal-close");
  if (thuModalClose) {
    thuModalClose.onclick = () => hideModal('thu');
  }
  
  const thuModal = document.getElementById("thu-settings-modal");
  if (thuModal) {
    thuModal.onclick = (e) => {
      if (e.target.id === 'thu-settings-modal') hideModal('thu');
    };
  }
  
  const chiDropdownToggle = document.getElementById('chi-dropdown-toggle');
  const chiDropdownContent = document.getElementById('chi-dropdown-content');
  
  if (chiDropdownToggle && chiDropdownContent) {
    chiDropdownToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      chiDropdownToggle.classList.toggle('open');
      chiDropdownContent.classList.toggle('open');
    };
  }
  
  const thuDropdownToggle = document.getElementById('thu-dropdown-toggle');
  const thuDropdownContent = document.getElementById('thu-dropdown-content');
  
  if (thuDropdownToggle && thuDropdownContent) {
    thuDropdownToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      thuDropdownToggle.classList.toggle('open');
      thuDropdownContent.classList.toggle('open');
    };
  }
  
  document.addEventListener('click', (e) => {
    if (chiDropdownToggle && !chiDropdownToggle.contains(e.target) && !chiDropdownContent.contains(e.target)) {
      chiDropdownToggle.classList.remove('open');
      chiDropdownContent.classList.remove('open');
    }
    if (thuDropdownToggle && !thuDropdownToggle.contains(e.target) && !thuDropdownContent.contains(e.target)) {
      thuDropdownToggle.classList.remove('open');
      thuDropdownContent.classList.remove('open');
    }
  });
  
  console.log('✅ Modal event listeners initialized');
  
  const chiModalNewName = document.getElementById('chi-modal-new-name');
  const chiModalNewPhanloai = document.getElementById('chi-modal-new-phanloai');
  const chiModalNewNote = document.getElementById('chi-modal-new-note');
  const chiModalAddBtn = document.getElementById('chi-modal-add-btn');
  
  function checkChiModalAddReady() {
    if (!chiModalAddBtn) return;
    const hasName = chiModalNewName && chiModalNewName.value.trim();
    const hasPhanloai = chiModalNewPhanloai && chiModalNewPhanloai.value;
    chiModalAddBtn.disabled = !(hasName && hasPhanloai);
  }
  
  if (chiModalNewName) {
    chiModalNewName.oninput = checkChiModalAddReady;
  }
  
  if (chiModalNewPhanloai) {
    chiModalNewPhanloai.onchange = checkChiModalAddReady;
  }
  
  if (chiModalAddBtn) {
    chiModalAddBtn.onclick = async () => {
      const name = chiModalNewName.value.trim();
      const phanloai = chiModalNewPhanloai.value;
      const note = chiModalNewNote ? chiModalNewNote.value.trim() : '';
      
      if (!name || !phanloai) {
        showToast('Vui lòng nhập đầy đủ thông tin bắt buộc');
        return;
      }
      
      const existing = loaiChiList.find(item => 
        item.mo_ta_chi.toLowerCase() === name.toLowerCase()
      );
      
      if (existing) {
        showToast('Mô tả này đã tồn tại');
        return;
      }
      
      const payload = {
        mo_ta_chi: name,
        phan_loai: phanloai,
        nhom: phanloai,
        icon: '',
        note: note
      };
      
      console.log('📤 Insert loai_chi payload:', payload);
      
      const result = await postData('insert_loai_chi', payload);
      
      if (result && result.status === 'success') {
        showToast(`Đã thêm mô tả "${name}" thành công`);
        
        // Xóa cache loai_chi – cần fetch lại lần sau
        clearCache(CACHE_KEYS.LOAI_CHI);
        
        const loaiChiData = await fetchData('loai_chi');
        loaiChiList = loaiChiData || [];
        setCached(CACHE_KEYS.LOAI_CHI, loaiChiList);
        
        chiModalNewName.value = '';
        chiModalNewPhanloai.value = '';
        if (chiModalNewNote) chiModalNewNote.value = '';
        chiModalAddBtn.disabled = true;
        
        populateChiDropdowns();
        renderModalCheckboxList('chi');
        
        console.log('✅ Mô tả chi mới đã được thêm');
      }
    };
  }
  
  const chiResetBtn = document.getElementById('chi-modal-reset');
  const thuResetBtn = document.getElementById('thu-modal-reset');
  
  if (chiResetBtn) {
    chiResetBtn.onclick = () => {
      if (confirm('⚠️ Reset về mặc định?\n\nThao tác này sẽ:\n- Xóa 8 mô tả đã chọn\n- Load lại mặc định từ CSDL\n- Không thể hoàn tác')) {
        resetSettings('chi');
      }
    };
  }
  
  if (thuResetBtn) {
    thuResetBtn.onclick = () => {
      if (confirm('⚠️ Reset về mặc định?\n\nThao tác này sẽ:\n- Xóa 8 mô tả đã chọn\n- Load lại mặc định từ CSDL\n- Không thể hoàn tác')) {
        resetSettings('thu');
      }
    };
  }
  
  console.log('✅ Reset settings buttons initialized');
}

function resetSettings(type) {
  console.log(`🔄 Resetting ${type} settings to default...`);
  
  if (type === 'chi') {
    settings.quickChipsChi = getDefaultChips('chi');
    saveSettings(settings);
    renderChiChips();
    renderModalCheckboxList('chi');
    showToast('✅ Đã reset CHI về mặc định');
  } else if (type === 'thu') {
    settings.quickChipsThu = getDefaultChips('thu');
    saveSettings(settings);
    renderThuChips();
    renderModalCheckboxList('thu');
    showToast('✅ Đã reset THU về mặc định');
  }
  
  console.log(`✅ ${type} settings reset complete`);
}

// ================= TAB BAR =================
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  if (tabId === 'chi') setTimeout(() => chiInput.focus(), 50);
  if (tabId === 'thu') setTimeout(() => thuInput.focus(), 50);
}

function initTabBar() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  console.log('✅ Tab bar initialized');
}

// ================= INIT =================
window.onload = async () => {
  console.log('🚀 App starting...');
  
  renderChiDate();
  renderThuDate();
  chiInput.focus();
  
  const [chiDataRaw, thuDataRaw] = await Promise.all([
    fetchData("Chi_Tieu_2026"),
    fetchData("Thu_2026")
  ]);
  const chiData = chiDataRaw.filter(item => item.IDChi && item.IDChi.trim());
  const thuData = thuDataRaw.filter(item => item.IDThu && item.IDThu.trim());
  updateHeader(chiData, thuData);

  thuList = thuData || [];
  
  const [loaiChiData, nguonTienData] = await Promise.all([
    getCachedOrFetch(CACHE_KEYS.LOAI_CHI, 'loai_chi'),
    getCachedOrFetch(CACHE_KEYS.NGUON_TIEN, 'nguon_tien')
  ]);
  
  loaiChiList = loaiChiData || [];
  nguonTienList = nguonTienData || [];
  _nguonColorCache = null; // Reset cache màu sau khi load xong dữ liệu
  
  console.log('✅ Data loaded:', {
    chiTieuRaw: chiDataRaw.length,
    chiTieuValid: chiData.length,
    thuRaw: thuDataRaw.length,
    thuValid: thuData.length,
    loaiChi: loaiChiList.length,
    nguonTien: nguonTienList.length
  });
  
  // ✅ DEBUG 3 CHI CUỐI
  if (chiData.length > 0) {
    console.log('🔍 Last 3 CHI:', chiData.slice(-3));
    console.log('🔍 Field "Ngày" của 3 CHI:', chiData.slice(-3).map(c => c["Ngày"]));
  }
  
  // ✅ DEBUG 1 THU CUỐI
  if (thuData.length > 0) {
    console.log('🔍 Last THU:', thuData[thuData.length - 1]);
    console.log('🔍 Field "Ngày" của THU:', thuData[thuData.length - 1]["Ngày"]);
  }
  
  settings = loadSettings();
  
  renderChiChips();
  renderThuChips();
  
  initHeaderToggle();
  updateHeader(chiData, thuData);
  
  populateChiDropdowns();
  populateThuDropdowns();
  
  initModalEventListeners();
  initTabBar();

  console.log('✅ App initialized successfully');
};