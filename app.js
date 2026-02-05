// ================= CONSTANTS =================
const API_URL = "https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec";

// ================= UTIL =================
// Vietnamese number formatting: . for thousands, , for decimals
function formatVN(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const parts = Number(num).toFixed(decimals).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimals > 0 ? parts.join(",") : parts[0];
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
  return "=" + stack.join("+");
}

function formatDate(d) {
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${days[d.getDay()]} ngày ${day}/${month}/${year}`;
}

function formatDateAPI(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr) {
  // Parse "YYYY-MM-DD" string as local date to avoid timezone issues
  // Add robust error handling for edge cases
  
  // Handle null, undefined, or non-string inputs
  if (!dateStr) {
    console.warn("parseDateString: Received empty or null date string, using current date");
    return new Date();
  }
  
  // If already a Date object, return it
  if (dateStr instanceof Date) {
    console.debug("parseDateString: Received Date object, returning as-is");
    return dateStr;
  }
  
  // Convert to string if needed
  const dateString = String(dateStr).trim();
  
  // Validate format (should be YYYY-MM-DD from GAS)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    console.warn(`parseDateString: Invalid date format "${dateString}", falling back to Date constructor`);
    // Fallback to the old method for compatibility
    const fallbackDate = new Date(dateString);
    if (isNaN(fallbackDate.getTime())) {
      console.error(`parseDateString: Failed to parse "${dateString}", using current date`);
      return new Date();
    }
    return fallbackDate;
  }
  
  // Parse the date string
  const [year, month, day] = dateString.split("-").map(Number);
  
  // Validate the parsed values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error(`parseDateString: Invalid date components in "${dateString}", using current date`);
    return new Date();
  }
  
  // Create the date object
  const parsedDate = new Date(year, month - 1, day);
  
  // Validate the resulting date
  if (isNaN(parsedDate.getTime())) {
    console.error(`parseDateString: Invalid date result from "${dateString}", using current date`);
    return new Date();
  }
  
  console.debug(`parseDateString: Successfully parsed "${dateString}" to ${parsedDate}`);
  return parsedDate;
}

// ================= TOAST NOTIFICATION =================
function showToast(message, duration = 3000) {
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
    
    // Debug logging for API response
    console.log(`fetchData: Response status for "${sheet}":`, result.status);
    console.log(`fetchData: Data length for "${sheet}":`, result.data ? result.data.length : 0);
    
    // Log a sample of the data for debugging (first and last items)
    if (result.data && result.data.length > 0) {
      console.log(`fetchData: First item from "${sheet}":`, result.data[0]);
      if (result.data.length > 1) {
        console.log(`fetchData: Last item from "${sheet}":`, result.data[result.data.length - 1]);
      }
    }
    
    // Check status and return data array
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
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action, payload })
    });
    const data = await response.json();
    showLoading(false);
    return data;
  } catch (error) {
    showLoading(false);
    showToast("Lỗi kết nối API: " + error.message);
    return null;
  }
}

// ================= SETTINGS (LocalStorage) =================
const DEFAULT_SETTINGS = {
  quickChipsChi: ["Ăn sáng", "Ăn chiều", "Ăn lễ", "Ăn chơi", "Đi chợ", "Đi chay", "Sữa bỉm", "Điện nhà"],
  quickChipsThu: ["Lương", "Thưởng", "Bán hàng", "Lãi", "Khác", "", "", ""],
  quickLoaiThu: ["Thu nhập", "Tiền về", "Khác"]
};

function loadSettings() {
  const settings = localStorage.getItem("soThuChiSettings");
  return settings ? JSON.parse(settings) : DEFAULT_SETTINGS;
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

// Edit mode state: tracks whether we're editing an existing value
let editMode = false;      // true = editing existing number, false = adding new numbers
let editIndex = -1;        // index of the number being edited in chiStack

let thuAmount = 0;
let thuDesc = "";
let thuLoai = "";
let thuSource = "";

let loaiChiList = [];
let nguonTienList = [];
let settings = loadSettings();

// ================= HEADER =================
function updateHeader(data) {
  const headerContent = document.getElementById("header-content");
  
  // Debug logging to monitor raw data
  console.log("updateHeader: Received data array length:", data ? data.length : 0);
  
  if (!data || data.length === 0) {
    console.warn("updateHeader: No data available");
    headerContent.innerHTML = `
      <div class="last-chi-desc">Chưa có chi tiêu</div>
      <div class="balance-tag">Số dư lý thuyết: 0</div>
    `;
    return;
  }
  
  const lastChi = data[data.length - 1];
  
  // Debug log the last chi data and date format
  console.log("updateHeader: Last chi data:", lastChi);
  console.log("updateHeader: Date field (Ngay):", lastChi.Ngay, "Type:", typeof lastChi.Ngay);
  
  headerContent.innerHTML = `
    <div class="header-title">Chi cuối</div>
    <div class="last-chi-desc">${lastChi.mo_ta_chi}</div>
    <div class="last-chi-date">${formatDate(parseDateString(lastChi.Ngay))}</div>
    <div class="last-chi-formula">Tổng ${lastChi["Nghìn VND"]} = ${formatVN(lastChi["Số tiền vnđ"])}</div>
    <div class="balance-tag">Số dư lý thuyết: ${formatVN(lastChi["Số dư lý thuyết"])}</div>
  `;
}

// ================= DATE NAVIGATION =================
const chiDateInput = document.getElementById("chi-date-input");
const chiDateDisplay = document.getElementById("chi-date-display");
const thuDateInput = document.getElementById("thu-date-input");
const thuDateDisplay = document.getElementById("thu-date-display");

/**
 * Common helper function to change date by a delta (in days)
 * Prevents selecting future dates
 * @param {Date} currentDate - The current date object
 * @param {number} delta - Number of days to shift (positive or negative)
 * @returns {Date} The new date, or current date if future date would be selected
 */
function changeDate(currentDate, delta) {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + delta);
  
  // Prevent selecting future dates
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of today for comparison
  
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

// CHI date navigation - SIMPLIFIED for iOS
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

// THU date navigation - SIMPLIFIED for iOS
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
        document.getElementById("chi-desc-other").value = "";
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
    loaiChiList.filter(item => item.active).forEach(item => {
      const option = document.createElement("option");
      option.value = item.mo_ta_chi;
      option.textContent = item.mo_ta_chi;
      select.appendChild(option);
    });
  }
  
  if (nguonTienList) {
    const select = document.getElementById("chi-source");
    select.innerHTML = '<option value="">-- Nguồn tiền --</option>';
    nguonTienList.filter(item => item.active).forEach(item => {
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

// INPUT MODE vs EDIT MODE handler for the text input
chiInput.oninput = () => {
  // Strip non-numeric immediately
  const val = chiInput.value = chiInput.value.replace(/\D/g, "");
  
  if (editMode) {
    // EDIT MODE: Real-time update of the selected value in the stack
    if (val && val !== "0") {
      const num = parseFloat(val);
      chiStack[editIndex] = num;  // Update the value in the stack in real-time
    }
    // Button stays as "✓" (confirm button) in edit mode
    chiAddBtn.textContent = "✓";
    chiAddBtn.classList.add("btn-confirm");
    // Change clear button to trash icon in edit mode
    chiClearBtn.textContent = "🗑️";
  } else {
    // INPUT MODE: Button stays as "+" (add button)
    chiAddBtn.textContent = "+";
    chiAddBtn.classList.remove("btn-confirm");
    // Keep clear button as reset icon in input mode
    chiClearBtn.textContent = "↻";
  }
  
  // Update stack display to show current total + new value being entered
  renderChiStack();
};

// Function to add value from chi input to stack (INPUT MODE)
// or confirm edit (EDIT MODE)
function addChiValue() {
  const val = chiInput.value.replace(/\D/g, "");
  if (!val || val === "0") return;
  
  const num = parseFloat(val);
  
  if (editMode) {
    // EDIT MODE: Confirm the edit and exit edit mode
    chiStack[editIndex] = num;
    editMode = false;
    editIndex = -1;
  } else {
    // INPUT MODE: Add new value to stack
    chiStack.push(num);
  }
  
  chiInput.value = "";
  
  // Reset button to + state (input mode)
  chiAddBtn.textContent = "+";
  chiAddBtn.classList.remove("btn-confirm");
  chiClearBtn.textContent = "↻";
  
  renderChiStack();
}

// Flag to prevent blur when clicking the add button
let isAddingFromButton = false;
let isDeletingFromButton = false; // ← THÊM FLAG MỚI

// Existing + button functionality
document.getElementById("chi-add").onmousedown = () => {
  isAddingFromButton = true;
};

document.getElementById("chi-add").onkeydown = (e) => {
  // Handle Enter and Space for keyboard accessibility
  if (e.key === 'Enter' || e.key === ' ') {
    isAddingFromButton = true;
  }
};

document.getElementById("chi-add").onclick = () => {
  addChiValue();
  chiInput.focus();
  isAddingFromButton = false;
};

// New blur event functionality
chiInput.onblur = () => {
  // Only add value if not clicking the add button OR delete button
  if (!isAddingFromButton && !isDeletingFromButton) { // ← SỬA Ở ĐÂY
    addChiValue();
  }
  // Reset flag in case of incomplete button interaction (mousedown without click)
  setTimeout(() => {
    isAddingFromButton = false;
    isDeletingFromButton = false; // ← RESET FLAG MỚI
  }, 0);
};

/**
 * Render the CHI stack display WITHOUT delete buttons next to numbers
 * Shows the formula of numbers being added and allows:
 * - Clicking a number to edit it
 */
// Helper function to enter edit mode (called from onclick in HTML)
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
  const currentInputVal = chiInput.value.replace(/\D/g, "");
  const currentInputNum = currentInputVal ? parseFloat(currentInputVal) : 0;
  
  if (!chiStack.length && !currentInputNum) {
    display.innerHTML = "Chưa có số";
    checkChiReady();
    return;
  }
  
  // Calculate existing total
  const existingTotal = chiStack.reduce((a, b) => a + b, 0) * 1000;
  
  // If there's a value being entered in INPUT MODE, show "Tổng: X"
  if (!chiStack.length && currentInputNum && !editMode) {
    display.innerHTML = `Tổng: ${formatVN(currentInputNum * 1000)}`;
    checkChiReady();
    return;
  }
  
  // If there's existing stack and new input in INPUT MODE, show the formula
  if (chiStack.length && currentInputNum && !editMode) {
    const parts = chiStack.map((n, i) => {
      return `<span class="stack-num" data-index="${i}" onclick="window.enterChiEditMode(${i})">${formatVN(n * 1000)}</span>`;
    });
    const newTotal = existingTotal + (currentInputNum * 1000);
    display.innerHTML = `Tổng: ${parts.join(" + ")} + ${formatVN(currentInputNum * 1000)} = ${formatVN(newTotal)}`;
  } else {
    // Show existing stack (either in INPUT MODE with no new value, or in EDIT MODE)
    // NO DELETE BUTTON next to numbers anymore
    const parts = chiStack.map((n, i) => {
      // Highlight the number being edited in EDIT MODE
      const className = (editMode && i === editIndex) ? "stack-num editing" : "stack-num";
      return `<span class="${className}" data-index="${i}" onclick="window.enterChiEditMode(${i})">${formatVN(n * 1000)}</span>`;
    });
    display.innerHTML = `Tổng: ${parts.join(" + ")} = ${formatVN(existingTotal)}`;
  }
  
  checkChiReady();
}

/**
 * Delete a specific number from the chiStack by index
 * Always exits edit mode and resets to default entry mode
 * @param {number} index - Index of the number to delete
 */
function deleteChiStackNumber(index) {
  // Remove the number from the stack
  chiStack.splice(index, 1);
  
  // Always exit edit mode and reset to default entry mode
  editMode = false;
  editIndex = -1;
  
  // Temporarily disable oninput to prevent it from interfering
  const originalOnInput = chiInput.oninput;
  chiInput.oninput = null;
  
  chiInput.value = "";
  
  // Restore oninput handler
  chiInput.oninput = originalOnInput;
  
  chiAddBtn.textContent = "+";
  chiAddBtn.classList.remove("btn-confirm");
  chiClearBtn.textContent = "↻";
  
  // Re-render the stack
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
// Prevent blur when clicking clear/delete button
document.getElementById("chi-clear").onmousedown = () => {
  isDeletingFromButton = true;
};

document.getElementById("chi-clear").onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    isDeletingFromButton = true;
  }
};

// CHI-CLEAR button: Reset in INPUT mode, Delete in EDIT mode
document.getElementById("chi-clear").onclick = () => {
  if (editMode) {
    // EDIT MODE: Delete the selected number (no confirm)
    deleteChiStackNumber(editIndex);
  } else {
    // INPUT MODE: Reset all with confirmation
    if (confirm("Xóa hết tất cả dữ liệu chi?")) {
      resetChiSection();
    }
  }
  isDeletingFromButton = false; // ← CÓ DÒNG NÀY
};

function resetChiSection() {
  chiStack = [];
  chiDesc = "";
  chiSource = "";
  editMode = false;
  editIndex = -1;
  chiInput.value = "";
  document.getElementById("chi-stack").innerHTML = "Chưa có số";
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
  
  const result = await postData("insert_chi", payload);
  if (result) {
    const total = chiStack.reduce((a, b) => a + b, 0) * 1000;
    showToast(`Đã thêm vào chi tiêu ${chiDesc}\n${formatStack(chiStack)}\nNguồn ${chiSource}\n${formatDate(chiDate)}\nThành công`);
    const data = await fetchData("Chi_Tieu_2026");
    updateHeader(data);
    resetChiSection();
  }
};

// ================= THU (INCOME) =================
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
        checkThuReady();
      };
      chipGrid.appendChild(btn);
    }
  });
}

function populateThuDropdowns() {
  if (nguonTienList) {
    const select = document.getElementById("thu-source");
    select.innerHTML = '<option value="">-- Nguồn tiền --</option>';
    nguonTienList.filter(item => item.active).forEach(item => {
      const option = document.createElement("option");
      option.value = item.nguon_tien;
      option.textContent = item.nguon_tien;
      select.appendChild(option);
    });
  }
  
  const loaiSelect = document.getElementById("thu-loai");
  loaiSelect.innerHTML = '<option value="">-- Loại thu --</option>';
  settings.quickLoaiThu.forEach(loai => {
    if (loai) {
      const option = document.createElement("option");
      option.value = loai;
      option.textContent = loai;
      loaiSelect.appendChild(option);
    }
  });
}

const thuInput = document.getElementById("thu-input");
thuInput.oninput = () => {
  // Strip non-numeric immediately
  const val = thuInput.value = thuInput.value.replace(/\D/g, "");
  
  if (val) {
    thuAmount = parseInt(val) * 1000;
    document.getElementById("thu-display").textContent = formatVN(thuAmount);
  } else {
    thuAmount = 0;
    document.getElementById("thu-display").textContent = "Chưa có số";
  }
  checkThuReady();
};

document.getElementById("thu-desc-input").oninput = (e) => {
  thuDesc = e.target.value;
  if (thuDesc) {
    document.querySelectorAll("#thu-chips .chip").forEach(c => c.classList.remove("selected"));
  }
  checkThuReady();
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
  thuAmount = 0;
  thuDesc = "";
  thuLoai = "";
  thuSource = "";
  thuInput.value = "";
  document.getElementById("thu-display").textContent = "Chưa có số";
  document.getElementById("thu-desc-input").value = "";
  document.getElementById("thu-loai").value = "";
  document.getElementById("thu-source").value = "";
  document.querySelectorAll("#thu-chips .chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("thu-submit").disabled = true;
  thuInput.focus();
}

document.getElementById("thu-submit").onclick = async () => {
  const payload = {
    ngay: formatDateAPI(thuDate),
    so_tien: thuAmount,
    mo_ta: thuDesc,
    loai_thu: thuLoai,
    nguon_tien: thuSource
  };
  
  const result = await postData("insert_thu", payload);
  if (result) {
    showToast(`Đã thêm thu nhập ${thuDesc}\n${formatVN(thuAmount)}\nNguồn ${thuSource}\n${formatDate(thuDate)}\nThành công`);
    const data = await fetchData("Chi_Tieu_2026");
    updateHeader(data);
    resetThuSection();
  }
};

// ================= TỔNG KẾT (SUMMARY) =================
let tkInputs = {};
let tkSoDuLT = 0;

document.getElementById("tk-start").onclick = () => {
  document.getElementById("tk-form").style.display = "block";
  document.getElementById("tk-start").style.display = "none";
  loadTongKet();
};

async function loadTongKet() {
  const data = await fetchData("Chi_Tieu_2026");
  if (data && data.length > 0) {
    const lastChi = data[data.length - 1];
    tkSoDuLT = lastChi["Số dư lý thuyết"] || 0;
  }
  
  const inputsContainer = document.getElementById("tk-inputs");
  inputsContainer.innerHTML = "";
  nguonTienList.filter(n => n.active).forEach(nguon => {
    const div = document.createElement("div");
    div.className = "tk-input-row";
    div.innerHTML = `
      <label>${nguon.nguon_tien}</label>
      <input type="text" data-nguon="${nguon.nguon_tien}" class="input-std tk-amount-input" placeholder="0">
    `;
    inputsContainer.appendChild(div);
    
    const input = div.querySelector("input");
    input.oninput = () => {
      let val = input.value.replace(/[^\d,]/g, "");
      tkInputs[nguon.nguon_tien] = parseVN(val);
      input.value = val ? formatVN(parseVN(val), 2) : "";
    };
  });
}

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
  
  const chiTiet = Object.entries(tkInputs).map(([nguon, soTien]) => ({
    nguon_tien: nguon,
    so_tien: soTien
  }));
  
  const payload = {
    ngay_tk: formatDateAPI(new Date()),
    so_du_lt: tkSoDuLT,
    chi_tiet: chiTiet,
    note: ""
  };
  
  const result = await postData("insert_tk", payload);
  if (result) {
    const tkSoDuTT = Object.values(tkInputs).reduce((a, b) => a + b, 0);
    const chenhLech = tkSoDuTT - tkSoDuLT;
    showToast(`Đã tổng kết thành công\nSố dư LT: ${formatVN(tkSoDuLT, 2)}\nSố dư TT: ${formatVN(tkSoDuTT, 2)}\nChênh lệch: ${formatVN(chenhLech, 2)}`);
    const data = await fetchData("Chi_Tieu_2026");
    updateHeader(data);
    resetTongKet();
  }
};

function resetTongKet() {
  tkInputs = {};
  tkSoDuLT = 0;
  document.getElementById("tk-form").style.display = "none";
  document.getElementById("tk-result").style.display = "none";
  document.getElementById("tk-confirm").style.display = "none";
  document.getElementById("tk-start").style.display = "block";
}

// ================= SETTINGS =================
function renderSettings() {
  const chiChipsContainer = document.getElementById("settings-chi-chips");
  chiChipsContainer.innerHTML = "";
  settings.quickChipsChi.forEach((chip, i) => {
    const div = document.createElement("div");
    div.className = "setting-chip-row";
    div.innerHTML = `
      <input type="text" value="${chip}" class="input-std" data-type="chi" data-index="${i}">
      <button class="btn-square btn-gray" onclick="removeChip('chi', ${i})">×</button>
    `;
    chiChipsContainer.appendChild(div);
  });
  
  const thuChipsContainer = document.getElementById("settings-thu-chips");
  thuChipsContainer.innerHTML = "";
  settings.quickChipsThu.forEach((chip, i) => {
    const div = document.createElement("div");
    div.className = "setting-chip-row";
    div.innerHTML = `
      <input type="text" value="${chip}" class="input-std" data-type="thu" data-index="${i}">
      <button class="btn-square btn-gray" onclick="removeChip('thu', ${i})">×</button>
    `;
    thuChipsContainer.appendChild(div);
  });
}

function removeChip(type, index) {
  if (type === "chi") {
    settings.quickChipsChi[index] = "";
  } else {
    settings.quickChipsThu[index] = "";
  }
  saveSettings(settings);
  renderSettings();
}

document.getElementById("save-settings").onclick = () => {
  document.querySelectorAll('[data-type="chi"]').forEach(input => {
    const index = parseInt(input.dataset.index);
    settings.quickChipsChi[index] = input.value;
  });
  
  document.querySelectorAll('[data-type="thu"]').forEach(input => {
    const index = parseInt(input.dataset.index);
    settings.quickChipsThu[index] = input.value;
  });
  
  saveSettings(settings);
  showToast("Đã lưu cài đặt");
  renderChiChips();
  renderThuChips();
};

// ================= MODAL SETTINGS =================

// Show modal
function showModal(type) {
  const modal = document.getElementById(`${type}-settings-modal`);
  if (!modal) {
    console.error(`Modal not found: ${type}-settings-modal`);
    return;
  }
  modal.classList.add('show');
  renderModalCheckboxList(type);
  document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal(type) {
  const modal = document.getElementById(`${type}-settings-modal`);
  if (!modal) return;
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

// Render checkbox list in modal
function renderModalCheckboxList(type) {
  const container = document.getElementById(`${type}-modal-checkbox-list`);
  const countSpan = document.getElementById(`${type}-modal-selected-count`);
  
  if (!container) {
    console.error(`Container not found: ${type}-modal-checkbox-list`);
    return;
  }
  
  // Get current chips from LocalStorage
  const currentChips = type === 'chi' ? settings.quickChipsChi : settings.quickChipsThu;
  
  const sourceList = loaiChiList;
  
  if (!sourceList || sourceList.length === 0) {
    container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Chưa có dữ liệu. Vui lòng reload trang.</div>';
    return;
  }
  
  console.log('renderModalCheckboxList:', {
    type,
    currentChips,
    sourceListLength: sourceList.length
  });
  
  container.innerHTML = '';
  
  // Filter active items and sort ALPHABETICALLY (A-Z)
  const activeItems = sourceList
    .filter(item => item.active)
    .sort((a, b) => {
      // Sort A-Z (Vietnamese locale aware)
      return a.mo_ta_chi.localeCompare(b.mo_ta_chi, 'vi', { sensitivity: 'base' });
    });
  
  console.log('Active items after sort:', activeItems.length, activeItems.map(i => i.mo_ta_chi));
  
  activeItems.forEach((item, index) => {
    // Check if this item is in currentChips (filter empty strings)
    const isChecked = currentChips.filter(c => c).includes(item.mo_ta_chi);
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${type}-modal-chip-${index}`;
    checkbox.checked = isChecked;
    checkbox.dataset.desc = item.mo_ta_chi;
    
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = item.mo_ta_chi;
    
    checkbox.onchange = () => {
      handleModalChipToggle(type, item.mo_ta_chi, checkbox.checked);
    };
    
    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(label);
    container.appendChild(itemDiv);
  });
  
  updateModalSelectedCount(type);
}

// Handle checkbox toggle with 8-item limit
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
    
    const emptyIndex = currentChips.findIndex(c => !c);
    if (emptyIndex !== -1) {
      currentChips[emptyIndex] = desc;
    } else {
      if (currentChips.length < 8) {
        currentChips.push(desc);
      }
    }
  } else {
    const index = currentChips.indexOf(desc);
    if (index !== -1) {
      currentChips[index] = "";
    }
  }
  
  console.log('After toggle:', {
    type,
    desc,
    checked,
    currentChips
  });
  
  saveSettings(settings);
  updateModalSelectedCount(type);
  
  if (type === 'chi') {
    renderChiChips();
  } else {
    renderThuChips();
  }
}

// Update selected count
function updateModalSelectedCount(type) {
  const currentChips = type === 'chi' ? settings.quickChipsChi : settings.quickChipsThu;
  const count = currentChips.filter(c => c).length;
  const countSpan = document.getElementById(`${type}-modal-selected-count`);
  if (countSpan) {
    countSpan.textContent = count;
    countSpan.style.color = count === 8 ? 'var(--green)' : 'var(--text)';
  }
}

// Check if add new form is valid
function checkModalAddReady(type) {
  const name = document.getElementById(`${type}-modal-new-name`).value.trim();
  const field = type === 'chi' ? 'phanloai' : 'loaithu';
  const phanloai = document.getElementById(`${type}-modal-new-${field}`).value;
  
  const isValid = name && phanloai;
  document.getElementById(`${type}-modal-add-btn`).disabled = !isValid;
}

// Add new description from modal
async function addNewFromModal(type) {
  const name = document.getElementById(`${type}-modal-new-name`).value.trim();
  const field = type === 'chi' ? 'phanloai' : 'loaithu';
  const phanloai = document.getElementById(`${type}-modal-new-${field}`).value;
  const note = document.getElementById(`${type}-modal-new-note`).value.trim();
  
  if (!name || !phanloai) {
    showToast("Vui lòng điền đầy đủ thông tin bắt buộc");
    return;
  }
  
  const payload = {
    mo_ta_chi: name,
    phan_loai: phanloai,
    note: note || ""
  };
  
  const result = await postData("insert_loai_chi", payload);
  
  if (result && result.status === "success") {
    showToast(`✅ Đã thêm mô tả: ${name}`);
    
    loaiChiList = await fetchData("loai_chi");
    populateChiDropdowns();
    if (type === 'thu') populateThuDropdowns();
    
    renderModalCheckboxList(type);
    
    document.getElementById(`${type}-modal-new-name`).value = "";
    document.getElementById(`${type}-modal-new-${field}`).value = "";
    document.getElementById(`${type}-modal-new-note`).value = "";
    checkModalAddReady(type);
    
  } else {
    showToast("❌ Lỗi khi thêm mô tả: " + (result?.message || "Unknown error"));
  }
}

// Initialize modal event listeners (called after DOM ready)
function initModalEventListeners() {
  // CHI modal
  const chiBtn = document.getElementById("chi-settings-btn");
  const chiModalClose = document.getElementById("chi-modal-close");
  const chiModal = document.getElementById("chi-settings-modal");
  
  if (chiBtn) {
    chiBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('CHI settings button clicked');
      showModal('chi');
    });
  }
  
  if (chiModalClose) {
    chiModalClose.addEventListener('click', () => hideModal('chi'));
  }
  
  if (chiModal) {
    chiModal.addEventListener('click', (e) => {
      if (e.target.id === 'chi-settings-modal') hideModal('chi');
    });
  }

  const chiNewName = document.getElementById("chi-modal-new-name");
  const chiNewPhanloai = document.getElementById("chi-modal-new-phanloai");
  const chiAddBtn = document.getElementById("chi-modal-add-btn");
  
  if (chiNewName) chiNewName.addEventListener('input', () => checkModalAddReady('chi'));
  if (chiNewPhanloai) chiNewPhanloai.addEventListener('change', () => checkModalAddReady('chi'));
  if (chiAddBtn) chiAddBtn.addEventListener('click', () => addNewFromModal('chi'));

  // THU modal
  const thuBtn = document.getElementById("thu-settings-btn");
  const thuModalClose = document.getElementById("thu-modal-close");
  const thuModal = document.getElementById("thu-settings-modal");
  
  if (thuBtn) {
    thuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('THU settings button clicked');
      showModal('thu');
    });
  }
  
  if (thuModalClose) {
    thuModalClose.addEventListener('click', () => hideModal('thu'));
  }
  
  if (thuModal) {
    thuModal.addEventListener('click', (e) => {
      if (e.target.id === 'thu-settings-modal') hideModal('thu');
    });
  }

  const thuNewName = document.getElementById("thu-modal-new-name");
  const thuNewLoaithu = document.getElementById("thu-modal-new-loaithu");
  const thuAddBtn = document.getElementById("thu-modal-add-btn");
  
  if (thuNewName) thuNewName.addEventListener('input', () => checkModalAddReady('thu'));
  if (thuNewLoaithu) thuNewLoaithu.addEventListener('change', () => checkModalAddReady('thu'));
  if (thuAddBtn) thuAddBtn.addEventListener('click', () => addNewFromModal('thu'));
  
  console.log('Modal event listeners initialized');
}

// ================= INIT =================
window.onload = async () => {
  renderChiDate();
  renderThuDate();
  renderChiChips();
  renderThuChips();
  renderSettings();
  chiInput.focus();
  
  const [chiTieuData, loaiChiData, nguonTienData] = await Promise.all([
    fetchData("Chi_Tieu_2026"),
    fetchData("loai_chi"),
    fetchData("nguon_tien")
  ]);
  
  loaiChiList = loaiChiData || [];
  nguonTienList = nguonTienData || [];
  
  updateHeader(chiTieuData);
  populateChiDropdowns();
  populateThuDropdowns();
  
  // Initialize modal event listeners AFTER data is loaded
  initModalEventListeners();
  
  console.log('App initialized. loaiChiList:', loaiChiList.length, 'items');
};