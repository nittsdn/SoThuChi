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
  chiDateDisplay.textContent = `<< ${formatDate(chiDate)} >>`;
}

function renderThuDate() {
  thuDateInput.value = formatDateAPI(thuDate);
  thuDateInput.max = formatDateAPI(new Date());
  thuDateDisplay.textContent = `<< ${formatDate(thuDate)} >>`;
}

// CHI date navigation event listeners
chiDateDisplay.onclick = () => {
  if (chiDateInput.showPicker) {
    chiDateInput.showPicker();
  } else {
    chiDateInput.click();
  }
};

chiDateInput.onchange = (e) => {
  const selected = new Date(e.target.value);
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

// THU date navigation event listeners
thuDateDisplay.onclick = () => {
  if (thuDateInput.showPicker) {
    thuDateInput.showPicker();
  } else {
    thuDateInput.click();
  }
};

thuDateInput.onchange = (e) => {
  const selected = new Date(e.target.value);
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
  } else {
    // INPUT MODE: Button stays as "+" (add button)
    chiAddBtn.textContent = "+";
    chiAddBtn.classList.remove("btn-confirm");
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
  
  renderChiStack();
}

// Flag to prevent blur when clicking the add button
let isAddingFromButton = false;

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
  // Only add value if not clicking the add button
  if (!isAddingFromButton) {
    addChiValue();
  }
  // Reset flag in case of incomplete button interaction (mousedown without click)
  setTimeout(() => {
    isAddingFromButton = false;
  }, 0);
};

/**
 * Render the CHI stack display with delete buttons for each number
 * Shows the formula of numbers being added and allows:
 * - Clicking a number to edit it
 * - Clicking the delete button (❌) to remove it
 */
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
      return `<span class="stack-num" data-index="${i}">${formatVN(n * 1000)}</span><button class="stack-delete-btn" data-index="${i}">❌</button>`;
    });
    const newTotal = existingTotal + (currentInputNum * 1000);
    display.innerHTML = `Tổng: ${parts.join(" + ")} + ${formatVN(currentInputNum * 1000)} = ${formatVN(newTotal)}`;
  } else {
    // Show existing stack (either in INPUT MODE with no new value, or in EDIT MODE)
    const parts = chiStack.map((n, i) => {
      // Highlight the number being edited in EDIT MODE
      const className = (editMode && i === editIndex) ? "stack-num editing" : "stack-num";
      return `<span class="${className}" data-index="${i}">${formatVN(n * 1000)}</span><button class="stack-delete-btn" data-index="${i}">❌</button>`;
    });
    display.innerHTML = `Tổng: ${parts.join(" + ")} = ${formatVN(existingTotal)}`;
  }
  
  // Add click handlers to enter EDIT MODE when clicking a number
  document.querySelectorAll(".stack-num").forEach(el => {
    el.onclick = () => {
      const index = parseInt(el.dataset.index);
      // Enter EDIT MODE
      editMode = true;
      editIndex = index;
      chiInput.value = chiStack[index];
      chiInput.focus();
      // Update button to show confirm (✓)
      chiAddBtn.textContent = "✓";
      chiAddBtn.classList.add("btn-confirm");
      renderChiStack();
    };
  });
  
  // Add delete handlers to remove individual numbers from stack
  document.querySelectorAll(".stack-delete-btn").forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation(); // Prevent triggering parent click handlers
      const index = parseInt(el.dataset.index);
      deleteChiStackNumber(index);
    };
  });
  
  checkChiReady();
}

/**
 * Delete a specific number from the chiStack by index
 * If currently editing that number, exit edit mode
 * @param {number} index - Index of the number to delete
 */
function deleteChiStackNumber(index) {
  // Remove the number from the stack
  chiStack.splice(index, 1);
  
  // If we were editing this number, exit edit mode
  if (editMode && editIndex === index) {
    editMode = false;
    editIndex = -1;
    chiInput.value = "";
    chiAddBtn.textContent = "+";
    chiAddBtn.classList.remove("btn-confirm");
  } else if (editMode && editIndex > index) {
    // If we were editing a number after the deleted one, adjust the edit index
    editIndex--;
  }
  
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

document.getElementById("chi-clear").onclick = () => {
  if (confirm("Xóa hết tất cả dữ liệu chi?")) {
    resetChiSection();
  }
};

function resetChiSection() {
  chiStack = [];
  chiDesc = "";
  chiSource = "";
  editMode = false;      // Reset to INPUT MODE
  editIndex = -1;
  chiInput.value = "";
  document.getElementById("chi-stack").innerHTML = "Chưa có số";
  document.getElementById("chi-desc-dropdown").value = "";
  document.getElementById("chi-source").value = "";
  document.querySelectorAll("#chi-chips .chip").forEach(c => c.classList.remove("selected"));
  document.getElementById("chi-submit").disabled = true;
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

// ================= INIT =================
window.onload = async () => {
  // Render UI immediately (don't wait for API)
  renderChiDate();
  renderThuDate();
  renderChiChips();
  renderThuChips();
  renderSettings();
  chiInput.focus();
  
  // Load ALL data in parallel (3x faster!)
  const [chiTieuData, loaiChiData, nguonTienData] = await Promise.all([
    fetchData("Chi_Tieu_2026"),
    fetchData("loai_chi"),
    fetchData("nguon_tien")
  ]);
  
  // Update UI with loaded data
  loaiChiList = loaiChiData || [];
  nguonTienList = nguonTienData || [];
  
  updateHeader(chiTieuData);
  populateChiDropdowns();
  populateThuDropdowns();
};
