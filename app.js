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
    const response = await fetch(`${API_URL}?sheet=${sheet}`);
    const result = await response.json();
    showLoading(false);
    
    // Check status and return data array
    if (result.status === "success") {
      return result.data || [];
    } else {
      showToast("Lỗi từ API: " + (result.message || "Unknown error"));
      return [];
    }
  } catch (error) {
    showLoading(false);
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
let chiEditIndex = -1;

let thuAmount = 0;
let thuDesc = "";
let thuLoai = "";
let thuSource = "";

let loaiChiList = [];
let nguonTienList = [];
let settings = loadSettings();

// ================= HEADER =================
async function loadHeader() {
  const data = await fetchData("Chi_Tieu_2026");
  if (data && data.length > 0) {
    const lastChi = data[data.length - 1];
    const headerContent = document.getElementById("header-content");
    headerContent.innerHTML = `
      <div class="last-chi-desc">${lastChi.mo_ta_chi || "Chưa có chi tiêu"}</div>
      <div class="last-chi-date">${lastChi.Ngay ? formatDate(new Date(lastChi.Ngay)) : ""}</div>
      <div class="last-chi-formula">${lastChi["Nghìn VND"] || ""}</div>
      <div class="last-chi-amount">Số tiền: ${formatVN(lastChi["Số tiền vnđ"] || 0)}</div>
      <div class="balance-tag">Số dư LT: ${formatVN(lastChi["Số dư lý thuyết"] || 0)}</div>
    `;
  }
}

// ================= DATE NAVIGATION =================
function renderChiDate() {
  document.getElementById("chi-date").innerText = formatDate(chiDate);
}

function renderThuDate() {
  document.getElementById("thu-date").innerText = formatDate(thuDate);
}

document.getElementById("chi-date-prev").onclick = () => {
  chiDate.setDate(chiDate.getDate() - 1);
  renderChiDate();
};

document.getElementById("chi-date-next").onclick = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (chiDate < tomorrow) {
    chiDate.setDate(chiDate.getDate() + 1);
    renderChiDate();
  } else {
    showToast("Không thể chọn ngày tương lai");
  }
};

document.getElementById("thu-date-prev").onclick = () => {
  thuDate.setDate(thuDate.getDate() - 1);
  renderThuDate();
};

document.getElementById("thu-date-next").onclick = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (thuDate < tomorrow) {
    thuDate.setDate(thuDate.getDate() + 1);
    renderThuDate();
  } else {
    showToast("Không thể chọn ngày tương lai");
  }
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

async function loadChiDropdowns() {
  loaiChiList = await fetchData("loai_chi");
  nguonTienList = await fetchData("nguon_tien");
  
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
chiInput.oninput = () => {
  const val = chiInput.value.replace(/\D/g, "");
  if (val) {
    document.getElementById("chi-preview").textContent = formatVN(val * 1000);
  } else {
    document.getElementById("chi-preview").textContent = "";
  }
};

document.getElementById("chi-add").onclick = () => {
  const val = chiInput.value.replace(/\D/g, "");
  if (!val || val === "0") return;
  
  const num = parseFloat(val);
  if (chiEditIndex >= 0) {
    chiStack[chiEditIndex] = num;
    chiEditIndex = -1;
  } else {
    chiStack.push(num);
  }
  
  chiInput.value = "";
  document.getElementById("chi-preview").textContent = "";
  chiInput.focus();
  renderChiStack();
};

function renderChiStack() {
  const display = document.getElementById("chi-stack");
  if (!chiStack.length) {
    display.innerHTML = "Chưa có số";
    checkChiReady();
    return;
  }
  
  const parts = chiStack.map((n, i) => {
    return `<span class="stack-num" data-index="${i}">${formatVN(n * 1000)}</span>`;
  });
  const total = chiStack.reduce((a, b) => a + b, 0) * 1000;
  display.innerHTML = parts.join(" + ") + " = " + formatVN(total);
  
  document.querySelectorAll(".stack-num").forEach(el => {
    el.onclick = () => {
      const index = parseInt(el.dataset.index);
      chiInput.value = chiStack[index];
      chiEditIndex = index;
      chiInput.focus();
      document.getElementById("chi-preview").textContent = formatVN(chiStack[index] * 1000);
    };
  });
  
  checkChiReady();
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
  chiEditIndex = -1;
  chiInput.value = "";
  document.getElementById("chi-preview").textContent = "";
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
    await loadHeader();
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

async function loadThuDropdowns() {
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
  const val = thuInput.value.replace(/\D/g, "");
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
    await loadHeader();
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
    await loadHeader();
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
  renderChiDate();
  renderThuDate();
  await loadHeader();
  await loadChiDropdowns();
  await loadThuDropdowns();
  renderChiChips();
  renderThuChips();
  renderSettings();
  chiInput.focus();
};
