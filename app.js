// Version: v3.4.0001
// ================= CONSTANTS =================
const SUPA_URL = "https://vspfbfeazipxjgymxpzr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzcGZiZmVhemlweGpneW14cHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjk4MzUsImV4cCI6MjA4NzkwNTgzNX0.tPQtyJDRxqWxGF-bYYSYWu3moNbFrSRSPigvQJFPdDA";

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

// ================= API CALLS (Supabase) =================

// Map tên sheet cũ → endpoint Supabase (PostgreSQL fold lowercase)
const SHEET_MAP = {
  "Chi_Tieu_2026": "v_chi_tieu_2026",
  "Thu_2026":      "v_thu_2026",
  "loai_chi":      "v_loai_chi",
  "nguon_tien":    "v_nguon_tien",
  "loai_thu":      "loai_thu",
  "tk_detail":     "tk_detail",
  "tk_session":    "tk_session"
};

const SUPA_HEADERS = {
  "apikey":        SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
  "Content-Type":  "application/json",
  "Prefer":        "return=representation"
};

// Parse công thức "=4+0.5" hoặc số thuần → NUMERIC (đơn vị nghìn)
function parseFormulaNum(val) {
  if (typeof val === "number") return val;
  const s = String(val).replace(/^=/, "").trim();
  const parts = s.split("+").map(p => parseFloat(p.replace(",", ".").trim()));
  return parts.reduce((a, b) => (isNaN(b) ? a : a + b), 0);
}

async function fetchData(sheet) {
  const endpoint = SHEET_MAP[sheet] || sheet;
  try {
    showLoading(true);
    console.log(`fetchData: GET /rest/v1/${endpoint}`);
    const res = await fetch(`${SUPA_URL}/rest/v1/${endpoint}?select=*`, {
      headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY }
    });
    showLoading(false);
    if (!res.ok) {
      const err = await res.text();
      console.error(`fetchData error [${endpoint}]:`, err);
      showToast("Lỗi API: " + res.status);
      return [];
    }
    const data = await res.json();
    console.log(`fetchData [${endpoint}]: ${data.length} rows`);
    return data;
  } catch (error) {
    showLoading(false);
    console.error(`fetchData network error [${endpoint}]:`, error);
    showToast("Lỗi kết nối: " + error.message);
    return [];
  }
}

async function supaPost(table, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: SUPA_HEADERS,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`supaPost [${table}] error:`, err);
    return null;
  }
  return await res.json();
}

async function supaPatch(table, filter, body) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: SUPA_HEADERS,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`supaPatch [${table}] error:`, err);
    return null;
  }
  return await res.json();
}

async function supaDelete(table, filter) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { ...SUPA_HEADERS, Prefer: "return=minimal" }
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`supaDelete [${table}] error:`, err);
    return null;
  }
  return { status: "success" };
}

async function postData(action, payload) {
  showLoading(true);
  console.log(`📤 postData: action="${action}", payload=`, payload);
  let result = null;
  try {
    // ---- insert_chi ----
    if (action === "insert_chi") {
      const formulaRaw = String(payload.so_tien_nghin);
      const numVal = parseFormulaNum(formulaRaw);
      const mtcItem = loaiChiList.find(lc => lc.mo_ta_chi === payload.mo_ta_chi);
      if (!mtcItem) { showLoading(false); showToast("Không tìm thấy mô tả chi: " + payload.mo_ta_chi); return null; }
      const row = {
        id_chi:        "chi_" + Date.now(),
        id_mtc:        mtcItem.id_mtc,
        nguon_tien:    payload.nguon_tien,
        so_tien_nghin: numVal,
        formula:       formulaRaw,
        ngay:          payload.ngay
      };
      const r = await supaPost("chi_tieu", row);
      result = r ? { status: "success", data: r } : null;

    // ---- insert_thu ----
    } else if (action === "insert_thu") {
      // thuStack lưu VNĐ trực tiếp (khác chiStack lưu nghìn)
      const soTien = parseFormulaNum(String(payload.so_tien));
      const ltItem = loaiThuList.find(lt => lt.mo_ta_thu === payload.mo_ta_thu);
      if (!ltItem) {
        showLoading(false);
        showToast("Không tìm thấy loại thu: " + payload.mo_ta_thu + "\nVui lòng chọn từ chip hoặc kiểm tra danh mục thu");
        return null;
      }
      const row = {
        id_thu:     "thu_" + Date.now(),
        id_lt:      ltItem.id_lt,
        so_tien:    Math.round(soTien),
        ngay:       payload.ngay,
        nguon_tien: payload.nguon_tien,
        ghi_chu:    payload.ghi_chu || null
      };
      const r = await supaPost("thu", row);
      result = r ? { status: "success", data: r } : null;

    // ---- update_chi ----
    } else if (action === "update_chi") {
      const formulaRaw = String(payload.so_tien_nghin);
      const numVal = parseFormulaNum(formulaRaw);
      const mtcItem = loaiChiList.find(lc => lc.mo_ta_chi === payload.mo_ta_chi);
      const patchChi = {
        ngay:          payload.ngay,
        nguon_tien:    payload.nguon_tien,
        so_tien_nghin: numVal,
        formula:       formulaRaw
      };
      if (mtcItem) patchChi.id_mtc = mtcItem.id_mtc;
      const r = await supaPatch("chi_tieu", `id_chi=eq.${payload.idChi}`, patchChi);
      result = r ? { status: "success", data: r } : null;

    // ---- delete_chi ----
    } else if (action === "delete_chi") {
      result = await supaDelete("chi_tieu", `id_chi=eq.${payload.idChi}`);

    // ---- update_thu ----
    } else if (action === "update_thu") {
      const ltItem = loaiThuList.find(lt => lt.mo_ta_thu === payload.mo_ta_thu);
      const patchData = {
        ngay:       payload.ngay,
        nguon_tien: payload.nguon_tien,
        so_tien:    Math.round(Number(payload.so_tien)),
        ghi_chu:    payload.ghi_chu || null
      };
      if (ltItem) patchData.id_lt = ltItem.id_lt;
      const r = await supaPatch("thu", `id_thu=eq.${payload.idThu}`, patchData);
      result = r ? { status: "success", data: r } : null;

    // ---- delete_thu ----
    } else if (action === "delete_thu") {
      result = await supaDelete("thu", `id_thu=eq.${payload.idThu}`);

    // ---- insert_tk ----
    } else if (action === "insert_tk") {
      const sessionId = "tk_" + Date.now();
      const session = await supaPost("tk_session", {
        session_id: sessionId,
        ngay_tk:    payload.ngay_tk,
        so_du_lt:   Math.round(payload.so_du_lt),
        so_du_tt:   Math.round(payload.so_du_tt),
        status:     "confirmed",
        note:       payload.note || ""
      });
      if (!session) { result = null; }
      else {
        const details = payload.chi_tiet.map(d => ({
          session_id: sessionId,
          ngay_tk:    payload.ngay_tk,
          nguon_tien: d.nguon_tien,
          so_tien:    Math.round(d.so_tien)
        }));
        const dr = await supaPost("tk_detail", details);
        result = dr ? { status: "success" } : null;
      }

    // ---- insert_loai_chi ----
    } else if (action === "insert_loai_chi") {
      // Tìm id_plc theo tên
      const plRes = await fetch(
        `${SUPA_URL}/rest/v1/phan_loai_chi?ten_phanloai=eq.${encodeURIComponent(payload.phan_loai)}&select=id_plc`,
        { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
      );
      const plData = await plRes.json();
      if (!plData.length) {
        showLoading(false);
        showToast("Không tìm thấy phân loại: " + payload.phan_loai);
        return null;
      }
      const r = await supaPost("mo_ta_chi", {
        id_mtc:     "c_" + Date.now(),
        mo_ta_chi:  payload.mo_ta_chi,
        id_plc:     plData[0].id_plc,
        icon:       payload.icon || "",
        active:     true,
        sort_order: 0,
        note:       payload.note || ""
      });
      result = r ? { status: "success", data: r } : null;

    // ---- insert_nguon_tien ----
    } else if (action === "insert_nguon_tien") {
      const r = await supaPost("nguon_tien", {
        nguon_tien: payload.nguon_tien,
        nguoi:      payload.nguoi || null,
        nhom:       payload.nhom || null,
        icon:       payload.icon || "",
        active:     true,
        sort_order: 0,
        note:       ""
      });
      result = r ? { status: "success", data: r } : null;

    // ---- insert_loai_thu (quản lý) ----
    } else if (action === "insert_loai_thu") {
      const r = await supaPost("loai_thu", {
        id_lt:      "lt_" + Date.now(),
        mo_ta_thu:  payload.mo_ta_thu,
        loai_thu:   payload.loai_thu,
        icon:       "",
        active:     true,
        sort_order: 0
      });
      result = r ? { status: "success", data: r } : null;

    // ---- patch_nguon_tien ----
    } else if (action === "patch_nguon_tien") {
      const r = await supaPatch("nguon_tien",
        `nguon_tien=eq.${encodeURIComponent(payload.nguon_tien)}`, payload.patch);
      result = r !== null ? { status: "success" } : null;

    // ---- patch_loai_thu ----
    } else if (action === "patch_loai_thu") {
      const r = await supaPatch("loai_thu", `id_lt=eq.${payload.id_lt}`, payload.patch);
      result = r !== null ? { status: "success" } : null;

    // ---- patch_mo_ta_chi ----
    } else if (action === "patch_mo_ta_chi") {
      const patch = { ...payload.patch };
      if (payload.phan_loai) {
        const plRes = await fetch(
          `${SUPA_URL}/rest/v1/phan_loai_chi?ten_phanloai=eq.${encodeURIComponent(payload.phan_loai)}&select=id_plc`,
          { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
        );
        const plData = await plRes.json();
        if (!plData.length) {
          showLoading(false);
          showToast("Không tìm thấy phân loại: " + payload.phan_loai);
          return null;
        }
        patch.id_plc = plData[0].id_plc;
      }
      const r = await supaPatch("mo_ta_chi", `id_mtc=eq.${payload.id_mtc}`, patch);
      result = r !== null ? { status: "success" } : null;

    } else {
      console.warn(`postData: unknown action "${action}"`);
      result = null;
    }
  } catch (error) {
    showLoading(false);
    showToast("Lỗi: " + error.message);
    console.error("postData error:", error);
    return null;
  }
  showLoading(false);
  if (!result) showToast("Lỗi khi lưu dữ liệu");
  console.log(`📥 postData [${action}] result:`, result);
  return result;
}

// ================= SETTINGS (LocalStorage) =================
// Chips (quickChipsChi/Thu) được quản lý qua sort_order trong DB, không lưu localStorage
const DEFAULT_SETTINGS = {
  quickLoaiThu: ["Thu income", "Tiền về", "Khác"]
};

function getDefaultChips(type) {
  if (type === 'chi') {
    if (!loaiChiList || loaiChiList.length === 0) {
      console.warn(`getDefaultChips: No chi data available`);
      return ["", "", "", "", "", "", "", ""];
    }
    // Dùng sort_order 1–8 từ DB; sort_order=0 nghĩa là ẩn
    const chips = Array(8).fill("");
    loaiChiList
      .filter(item => item.active && item.sort_order >= 1 && item.sort_order <= 8)
      .forEach(item => { chips[item.sort_order - 1] = item.mo_ta_chi; });
    console.log(`✅ getDefaultChips(chi): ${chips.filter(c => c).length} chips từ sort_order`);
    return chips;
  }
  
  if (type === 'thu') {
    if (!loaiThuList || loaiThuList.length === 0) {
      console.warn(`getDefaultChips: No loai_thu data available`);
      return ["" , "", "", "", "", "", "", ""];
    }
    // Dùng sort_order 1–8 nếu đã cấu hình, ngược lại
    // fallback: lấy tất cả active sắp xếp A-Z (tối đa 8)
    const configured = loaiThuList.filter(item => item.active && item.sort_order >= 1 && item.sort_order <= 8);
    if (configured.length > 0) {
      const chips = Array(8).fill("");
      configured.forEach(item => { chips[item.sort_order - 1] = item.mo_ta_thu; });
      console.log(`✅ getDefaultChips(thu): ${configured.length} chips từ sort_order`);
      return chips;
    }
    // Fallback: hiển thị tất cả active, A-Z, tối đa 8
    const fallback = loaiThuList
      .filter(item => item.active)
      .sort((a, b) => a.mo_ta_thu.localeCompare(b.mo_ta_thu, 'vi', { sensitivity: 'base' }))
      .slice(0, 8)
      .map(item => item.mo_ta_thu);
    console.log(`⚠️ getDefaultChips(thu): fallback ${fallback.length} chips (chưa cấu hình sort_order)`);
    // Pad to 8
    while (fallback.length < 8) fallback.push("");
    return fallback;
  }
  
  return ["", "", "", "", "", "", "", ""];
}

function loadSettings() {
  const stored = localStorage.getItem("soThuChiSettings");
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log('✅ Loading settings from localStorage');
    // Chỉ giữ lại quickLoaiThu – chips đọc từ DB
    return { quickLoaiThu: parsed.quickLoaiThu || DEFAULT_SETTINGS.quickLoaiThu };
  }
  console.log('⚠️ No localStorage found, using defaults');
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  // Chỉ lưu quickLoaiThu – chips quản lý qua sort_order trong DB
  localStorage.setItem("soThuChiSettings", JSON.stringify({ quickLoaiThu: settings.quickLoaiThu }));
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
let loaiThuList = [];
let thuList = [];
let nguonTienList = [];

// Map màu trực tiếp theo tên nguồn tiền
const NGUON_COLOR_MAP = {
  // Boé – tông nóng PA2
  "Sacom Boé":      { bg: "#FFC8D3", border: "#f06090" },
  "SCB + Agri Boé": { bg: "#FDC878", border: "#f09020" },
  "Tech Boé":       { bg: "#FFE1F9", border: "#e060c0" },
  "Tiền mặt Boé":   { bg: "#FDEF81", border: "#e0c000" },
  "Ví Vnpay Boé":   { bg: "#F0D8BC", border: "#e09840" },
  "Tiền mới":       { bg: "#FAF8DF", border: "#c0c060" },
  // Mèo – tông lạnh PA2
  "ACB Mèo":        { bg: "#D5D8F3", border: "#7070e0" },
  "HD Mèo":         { bg: "#B4E9FB", border: "#20a8e0" },
  "Tech Mèo":       { bg: "#DCF2FF", border: "#40b0e0" },
  "Tiền mặt Mèo":   { bg: "#E1F7C7", border: "#50c060" },
  "Ví Momo Mèo":    { bg: "#D1C0ED", border: "#9060d8" },
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

// QL tab: màu theo nhóm loại thu
const LOAI_THU_COLOR_MAP = {
  "Dư năm trước": { bg: "#e8eeff", border: "#5580f0" },
  "Ngân hàng":    { bg: "#e8f8ff", border: "#30b0e8" },
  "Cho mượn":     { bg: "#eeebff", border: "#8866f0" },
  "Thu nhập":     { bg: "#e8fff0", border: "#40c074" },
  "Khác":         { bg: "#f5f5f5", border: "#aaaaaa" },
};

// QL tab: màu theo phân loại chi
const PHAN_LOAI_CHI_COLOR_MAP = {
  "Ăn uống":          { bg: "#fff3e0", border: "#fb8c00" },
  "Di chuyển":        { bg: "#fce4ec", border: "#e91e63" },
  "Điện":             { bg: "#fffde7", border: "#e0b800" },
  "Nước":             { bg: "#e3f2fd", border: "#1e88e5" },
  "Internet":         { bg: "#e0f7fa", border: "#00acc1" },
  "Mua sắm chung":    { bg: "#fbe9e7", border: "#ff7043" },
  "Sức khỏe":         { bg: "#e8f5e9", border: "#43a047" },
  "Đám hiếu hỉ":     { bg: "#fce4ec", border: "#d81b60" },
  "Biểu tặng":        { bg: "#fdf2fb", border: "#ab47bc" },
  "Mua sắm cá nhân":  { bg: "#ede7f6", border: "#7e57c2" },
  "Giải trí":         { bg: "#f3e5f5", border: "#9c27b0" },
  "Học hành":         { bg: "#e8eaf6", border: "#5c6bc0" },
  "Nhà cửa":          { bg: "#e0f2f1", border: "#00897b" },
  "Phí ngân hàng":    { bg: "#eceff1", border: "#607d8b" },
  "Sửa chữa":         { bg: "#fbe9e7", border: "#bf360c" },
  "Gửi mẹ":           { bg: "#fff8e1", border: "#f9a825" },
  "Đầu tư":           { bg: "#e8f5e9", border: "#2e7d32" },
  "Cho mượn":         { bg: "#ede7f6", border: "#6d28d9" },
  "Khác":             { bg: "#f5f5f5", border: "#9e9e9e" },
};

function getGroupColor(colorMap, name) {
  if (colorMap[name]) return colorMap[name];
  const idx = [...(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    bg:     NGUON_PALETTE[idx % NGUON_PALETTE.length],
    border: NGUON_BORDER_PALETTE[idx % NGUON_BORDER_PALETTE.length]
  };
}
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

// ================= HEADER =================
function updateHeader(chiData, thuData) {
  // ===== UPDATE SUMMARY (BALANCE) =====
  const soDuLT = (chiData && chiData.length > 0) 
    ? (chiData[chiData.length - 1]["Số dư lý thuyết"] || 0)
    : 0;
  
  tkSoDuLT = soDuLT;  // Lưu vào biến global cho phần Tổng kết
  
  document.querySelector('#header-balance').textContent = 
    `Số dư LT: ${formatVN(soDuLT)}`;
}

// ================= HEADER TOGGLE =================


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
  getDefaultChips('chi').forEach(chip => {
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
    let chiTotal = chiStack.reduce((a, b) => a + b, 0);
    showToast(`Đã thêm chi: <b>${formatVN(chiTotal * 1000)}</b> VNĐ`, 3000);
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
  const loaiThuDropdown = document.getElementById("thu-loai");
  if (!desc) {
    thuLoai = "";
    loaiThuDropdown.value = "";
    loaiThuDropdown.disabled = false;
    loaiThuDropdown.style.background = "";
    loaiThuDropdown.style.cursor = "";
    checkThuReady();
    return;
  }

  const ltItem = loaiThuList.find(lt => lt.mo_ta_thu === desc);

  if (ltItem && ltItem.loai_thu) {
    thuLoai = ltItem.loai_thu;
    loaiThuDropdown.value = thuLoai;
    loaiThuDropdown.disabled = true;
    loaiThuDropdown.style.background = "#f0f0f0";
    loaiThuDropdown.style.cursor = "not-allowed";
  } else {
    // desc không khớp mo_ta_thu nào → mở dropdown để user chọn thủ công
    loaiThuDropdown.disabled = false;
    loaiThuDropdown.style.background = "";
    loaiThuDropdown.style.cursor = "";
    // Không xoá thuLoai đã chọn tay trước đó
  }

  checkThuReady();
}

function renderThuChips() {
  const chipGrid = document.getElementById("thu-chips");
  chipGrid.innerHTML = "";
  getDefaultChips('thu').forEach(chip => {
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
  
  // ✅ Distinct loai_thu từ loaiThuList, Sort A-Z
  const distinctLoai = [...new Set(loaiThuList.filter(lt => lt.active).map(lt => lt.loai_thu))]
    .sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
  
  distinctLoai.forEach(loai => {
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
  document.getElementById("thu-ghichu-input").value = "";
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
    ngay:       formatDateAPI(thuDate),
    so_tien:    formula,
    mo_ta_thu:  thuDesc,
    nguon_tien: thuSource,
    ghi_chu:    document.getElementById("thu-ghichu-input").value.trim() || null
  };
  
  console.log('📤 THU Submit payload:', payload);
  
  const result = await postData("insert_thu", payload);
  if (result && result.status === 'success') {
    showToast(`Đã thêm thu: <b>${formatVN(thuAmount)}</b> VNĐ`, 3000);
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
let tkTransferLogData = [];   // log các lần chuyển tiền trong phiên hiện tại
let tkChiSort = { col: 'Ngày', dir: 1 };  // dir: 1=asc(cũ→mới), -1=desc
let tkThuSort = { col: 'Ngày', dir: 1 };

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
  document.getElementById("tk-transfer-wrap").style.display = "block";
  document.getElementById("tk-start").style.display = "none";
  document.getElementById("tk-refresh").style.display = "block";
  await loadTkData();
  tkLastDate = getTkLastDate();
  renderChiChuaTK();
  renderThuChuaTK();
  loadTongKet();
};

document.getElementById("tk-refresh").onclick = async () => {
  // Nếu không trong trạng thái ghi nhớ thì xóa log chuyển tiền
  if (!localStorage.getItem("tkTransferPin")) {
    tkTransferLogData = [];
  }
  await loadTkData();
  tkLastDate = getTkLastDate();
  renderChiChuaTK();
  renderThuChuaTK();
  loadTongKet();
};

function updateSortBar(type) {
  const state = type === 'chi' ? tkChiSort : tkThuSort;
  const barId = type === 'chi' ? 'tk-chi-sort-bar' : 'tk-thu-sort-bar';
  document.querySelectorAll(`#${barId} .tk-sort-pill`).forEach(btn => {
    const isActive = btn.dataset.col === state.col;
    btn.classList.toggle('active', isActive);
    const arrow = btn.querySelector('.sort-arrow');
    if (arrow) arrow.textContent = isActive ? (state.dir === 1 ? '↓' : '↑') : '';
  });
}

function initTKSortBars() {
  [
    { barId: 'tk-chi-sort-bar', state: tkChiSort, render: renderChiChuaTK, key: 'chi' },
    { barId: 'tk-thu-sort-bar', state: tkThuSort, render: renderThuChuaTK, key: 'thu' }
  ].forEach(({ barId, state, render, key }) => {
    document.querySelectorAll(`#${barId} .tk-sort-pill`).forEach(btn => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.col;
        if (state.col === col) {
          state.dir *= -1;
        } else {
          state.col = col;
          state.dir = col === 'Ngày' ? -1 : 1;
        }
        render();
      });
    });
  });
}

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

  const sorted = [...rows].sort((a, b) => {
    const va = a[tkChiSort.col] || '';
    const vb = b[tkChiSort.col] || '';
    if (tkChiSort.col === 'Ngày') return (new Date(va) - new Date(vb)) * tkChiSort.dir;
    return va.toString().localeCompare(vb.toString(), 'vi') * tkChiSort.dir;
  });
  updateSortBar('chi');

  sorted.forEach(row => {
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
      rowEl.style.borderBottom = "2px dashed #2196f3";
      rowEl.style.borderTop = "2px dashed #2196f3";
      rowEl.style.borderRight = "2px dashed #2196f3";
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
        showToast("Đã cập nhật chi thành công", 3000);
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
        showToast("Đã xoá khoản chi thành công", 3000);
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

  const sorted = [...rows].sort((a, b) => {
    const va = a[tkThuSort.col] || '';
    const vb = b[tkThuSort.col] || '';
    if (tkThuSort.col === 'Ngày') return (new Date(va) - new Date(vb)) * tkThuSort.dir;
    return va.toString().localeCompare(vb.toString(), 'vi') * tkThuSort.dir;
  });
  updateSortBar('thu');

  sorted.forEach(row => {
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
      rowEl.style.borderBottom = "2px dashed #2196f3";
      rowEl.style.borderTop = "2px dashed #2196f3";
      rowEl.style.borderRight = "2px dashed #2196f3";
      rowEl.style.borderRadius = "8px";
    }

    const nguonOptions = nguonTienList.filter(n => n.active)
      .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi'))
      .map(n => `<option value="${n.nguon_tien}" ${n.nguon_tien === row["Nguồn tiền"] ? "selected" : ""}>${n.nguon_tien}</option>`)
      .join("");
    const loaiOptions = loaiThuList.filter(lt => lt.active)
      .sort((a, b) => a.mo_ta_thu.localeCompare(b.mo_ta_thu, 'vi'))
      .map(l => `<option value="${l.mo_ta_thu}" ${l.mo_ta_thu === row["Mo ta thu"] ? "selected" : ""}>${l.mo_ta_thu}</option>`)
      .join("");

    rowEl.innerHTML = `
      <div class="tk-list-view">
        <div class="tk-list-cell tk-cell-ngay">${formatDateTK(row["Ngày"])}</div>
        <div class="tk-list-cell tk-cell-mota">${row["Mô tả"] || ""}</div>
        <div class="tk-list-cell tk-cell-nguon">${row["Nguồn tiền"] || ""}</div>
        <div class="tk-list-cell tk-cell-sotien green-text">${soTienDisplay}</div>
        <button class="tk-btn-edit" title="Sửa">✏️</button>
      </div>
      <div class="tk-list-edit" style="display:none;">
        <div class="tk-edit-row"><label>Ngày</label><input type="date" class="input-std tk-edit-ngay" value="${row["Ngày"] || ""}"></div>
        <div class="tk-edit-row"><label>Mô tả</label><input type="text" class="input-std tk-edit-mota" value="${row["Mô tả"] || ""}"></div>
        <div class="tk-edit-row"><label>Nguồn tiền</label><select class="input-std tk-edit-nguon">${nguonOptions}</select></div>
        <div class="tk-edit-row"><label>Mô tả thu</label><select class="input-std tk-edit-loai">${loaiOptions}</select></div>
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
        idThu:      id,
        ngay:       rowEl.querySelector(".tk-edit-ngay").value,
        mo_ta_thu:  rowEl.querySelector(".tk-edit-loai").value,
        ghi_chu:    rowEl.querySelector(".tk-edit-mota").value || null,
        nguon_tien: rowEl.querySelector(".tk-edit-nguon").value,
        so_tien:    parseFloat(rowEl.querySelector(".tk-edit-sotien").value) || 0
      };
      const result = await postData("update_thu", payload);
      if (result && result.status === "success") {
        tkEditedThuIds.add(id);
        showToast("Đã cập nhật thu thành công", 3000);
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
        showToast("Đã xoá khoản thu thành công", 3000);
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
    div.dataset.nguon = nguon.nguon_tien;
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
            <div class="tk-badge-stack">
              <span class="tk-transfer-icon-badge" title="Nguồn bị ảnh hưởng bởi chuyển tiền" style="display:none;">⇄</span>
              ${badgeIcon}
            </div>
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

  // Populate transfer dropdowns mỗi khi loadTongKet chạy
  populateTransferDropdowns();

  // Áp dụng giá trị đã ghi nhớ (transfer pin) nếu có
  const transferPin = JSON.parse(localStorage.getItem("tkTransferPin") || "null");
  if (transferPin) {
    Object.entries(transferPin).forEach(([nguon, val]) => {
      tkInputs[nguon] = val;
      const el = document.querySelector(`input[data-nguon="${nguon}"]`);
      if (el) el.value = formatVN(val, 2);
    });
    updateTransferPinUI(true);
    // Khôi phục log
    const savedLog = JSON.parse(localStorage.getItem("tkTransferLog") || "null");
    if (savedLog) { tkTransferLogData = savedLog; renderTransferLog(); }
  } else {
    updateTransferPinUI(false);
    if (!tkTransferLogData.length) renderTransferLog();
  }
  updateTransferIcons();
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
  localStorage.removeItem("tkTransferPin");
  localStorage.removeItem("tkTransferLog");
  tkTransferLogData = [];
  document.getElementById("tk-form").style.display = "none";
  document.getElementById("tk-transfer-wrap").style.display = "none";
  document.getElementById("tk-result").style.display = "none";
  document.getElementById("tk-confirm").style.display = "none";
  document.getElementById("tk-refresh").style.display = "none";
  document.getElementById("tk-chi-section").style.display = "none";
  document.getElementById("tk-thu-section").style.display = "none";
  document.getElementById("tk-start").style.display = "block";
  // Đóng transfer panel khi reset
  const panel = document.getElementById("tk-transfer-panel");
  const toggle = document.getElementById("tk-transfer-toggle");
  if (panel) panel.style.display = "none";
  if (toggle) toggle.classList.remove("open");
}

// ================= CHUYỂN TIỀN NỘI BỘ =================
function renderTransferLog() {
  const logEl = document.getElementById("tk-transfer-log");
  if (!logEl) return;
  if (!tkTransferLogData.length) { logEl.style.display = "none"; logEl.innerHTML = ""; return; }
  logEl.style.display = "block";

  function chip(name) {
    const bg     = getNguonBgColor(name);
    const border = getNguonBorderColor(name);
    return `<span class="tk-log-chip" style="background:${bg};border-color:${border};">${name}</span>`;
  }

  const isPinnedState = tkTransferLogData.some(e => e.pinned);

  logEl.innerHTML = tkTransferLogData.map((e, i) =>
    `<div class="tk-transfer-log-item" data-idx="${i}">
      <span class="tk-log-num">${i + 1}.</span>
      ${chip(e.from)}
      <span class="tk-log-arrow">→</span>
      <span class="tk-log-amount">${formatVN(e.amount)}</span>
      <span class="tk-log-arrow">→</span>
      ${chip(e.to)}
      ${e.pinned ? `<button class="tk-log-pin-btn" data-idx="${i}" title="Gỡ ghim dòng này">📌</button>` : ''}
    </div>`
  ).join("");

  logEl.querySelectorAll(".tk-log-pin-btn").forEach(btn => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      const entry = tkTransferLogData[idx];
      if (!entry) return;
      tkInputs[entry.from] = (tkInputs[entry.from] || 0) + entry.amount;
      tkInputs[entry.to]   = (tkInputs[entry.to]   || 0) - entry.amount;
      document.querySelectorAll(".tk-amount-input").forEach(input => {
        const nguon = input.dataset.nguon;
        if (nguon === entry.from || nguon === entry.to)
          input.value = formatVN(tkInputs[nguon], 2);
      });
      tkTransferLogData.splice(idx, 1);
      const anyPinned = tkTransferLogData.some(e => e.pinned);
      if (anyPinned) {
        localStorage.setItem("tkTransferPin", JSON.stringify(tkInputs));
        localStorage.setItem("tkTransferLog", JSON.stringify(tkTransferLogData));
      } else {
        localStorage.removeItem("tkTransferPin");
        localStorage.removeItem("tkTransferLog");
      }
      updateTransferPinUI(anyPinned);
      renderTransferLog();
      updateTransferIcons();
      showToast(`Gỡ ghim: ${entry.from} → ${entry.to}`, 2000);
    };
  });
}

function updateTransferPinUI(pinned) {
  // pin indicator removed — per-row ghim icons handle it
}

function updateTransferIcons() {
  const affected = new Set();
  tkTransferLogData.forEach(e => { affected.add(e.from); affected.add(e.to); });
  document.querySelectorAll(".tk-input-row-group").forEach(group => {
    const badge = group.querySelector(".tk-transfer-icon-badge");
    if (!badge) return;
    badge.style.display = affected.has(group.dataset.nguon) ? "inline" : "none";
  });
}

function resetTransfers() {
  tkTransferLogData.forEach(e => {
    tkInputs[e.from] = (tkInputs[e.from] || 0) + e.amount;
    tkInputs[e.to]   = (tkInputs[e.to]   || 0) - e.amount;
  });
  document.querySelectorAll(".tk-amount-input").forEach(input => {
    const nguon = input.dataset.nguon;
    if (nguon !== undefined && tkInputs[nguon] !== undefined)
      input.value = formatVN(tkInputs[nguon], 2);
  });
  tkTransferLogData = [];
  localStorage.removeItem("tkTransferPin");
  localStorage.removeItem("tkTransferLog");
  updateTransferPinUI(false);
  renderTransferLog();
  updateTransferIcons();
}

function populateTransferDropdowns() {
  const fromSel = document.getElementById("tk-transfer-from");
  const toSel   = document.getElementById("tk-transfer-to");
  if (!fromSel || !toSel) return;
  const options = nguonTienList
    .filter(n => n.active)
    .sort((a, b) => a.nguon_tien.localeCompare(b.nguon_tien, 'vi'))
    .map(n => `<option value="${n.nguon_tien}">${n.nguon_tien}</option>`)
    .join("");
  fromSel.innerHTML = options;
  toSel.innerHTML   = options;
  // Chọn 2 nguồn khác nhau mặc định
  if (toSel.options.length > 1) toSel.selectedIndex = 1;
}

document.getElementById("tk-transfer-toggle").onclick = () => {
  const panel  = document.getElementById("tk-transfer-panel");
  const toggle = document.getElementById("tk-transfer-toggle");
  const isOpen = panel.style.display !== "none";
  panel.style.display = isOpen ? "none" : "block";
  toggle.classList.toggle("open", !isOpen);
};

document.getElementById("tk-transfer-btn").onclick = () => {
  const from   = document.getElementById("tk-transfer-from").value;
  const to     = document.getElementById("tk-transfer-to").value;
  const raw    = document.getElementById("tk-transfer-amount").value;
  const amount = parseVN(raw);

  if (!from || !to) { showToast("Chọn nguồn tiền"); return; }
  if (from === to)  { showToast("Nguồn chuyển và nhận phải khác nhau"); return; }
  if (!amount || amount <= 0) { showToast("Nhập số tiền hợp lệ"); return; }

  tkInputs[from] = (tkInputs[from] || 0) - amount;
  tkInputs[to]   = (tkInputs[to]   || 0) + amount;

  // Cập nhật ngay giá trị hiển thị trong các input tương ứng
  document.querySelectorAll(".tk-amount-input").forEach(input => {
    const nguon = input.dataset.nguon;
    if (nguon === from || nguon === to) {
      input.value = formatVN(tkInputs[nguon], 2);
    }
  });

  document.getElementById("tk-transfer-amount").value = "";

  // Thêm vào log và hiển thị
  tkTransferLogData.push({ from, to, amount });
  renderTransferLog();
  updateTransferIcons();

  showToast(`✅ Chuyển ${formatVN(amount)} từ <b>${from}</b> → <b>${to}</b>`, 3000);
  // Nếu đang pin thì tự cập nhật pin + log luôn
  if (localStorage.getItem("tkTransferPin")) {
    localStorage.setItem("tkTransferPin", JSON.stringify(tkInputs));
    localStorage.setItem("tkTransferLog", JSON.stringify(tkTransferLogData));
  }
};

document.getElementById("tk-transfer-remember").onclick = () => {
  if (!tkTransferLogData.length) { showToast("Chưa có lần chuyển nào để ghi nhớ"); return; }
  tkTransferLogData.forEach(e => e.pinned = true);
  localStorage.setItem("tkTransferPin", JSON.stringify(tkInputs));
  localStorage.setItem("tkTransferLog", JSON.stringify(tkTransferLogData));
  updateTransferPinUI(true);
  renderTransferLog();
  showToast("📌 Đã ghi nhớ! Cập nhật vẫn giữ lại", 3000);
};

document.getElementById("tk-transfer-reset").onclick = () => {
  if (!tkTransferLogData.length) { showToast("Không có lần chuyển nào"); return; }
  resetTransfers();
  showToast("Đã xóa tất cả lần chuyển tiền");
};

// ================= MODAL SETTINGS =================

function renderModalCheckboxList(type) {
  console.log('renderModalCheckboxList called for:', type);
  const container = document.getElementById(`${type}-modal-checkbox-list`);
  
  if (!container) {
    console.error(`❌ Container not found: ${type}-modal-checkbox-list`);
    return;
  }
  
  let sourceList, fieldName;
  
  if (type === 'chi') {
    sourceList = loaiChiList
      .filter(item => item.active)
      .sort((a, b) => a.mo_ta_chi.localeCompare(b.mo_ta_chi, 'vi', { sensitivity: 'base' }));
    fieldName = 'mo_ta_chi';
  } else {
    sourceList = loaiThuList
      .filter(item => item.active)
      .sort((a, b) => a.mo_ta_thu.localeCompare(b.mo_ta_thu, 'vi', { sensitivity: 'base' }));
    fieldName = 'mo_ta_thu';
  }
  
  console.log('📊 Data check:', {
    type,
    sourceListLength: sourceList.length,
    checkedCount: (type === 'chi' ? loaiChiList : loaiThuList)
      .filter(i => i.sort_order >= 1 && i.sort_order <= 8).length
  });
  
  if (!sourceList || sourceList.length === 0) {
    console.warn('⚠️ No source data available');
    container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #888;">Chưa có dữ liệu</div>';
    return;
  }
  
  container.innerHTML = '';
  
  sourceList.forEach((item, index) => {
    const desc = type === 'chi' ? item.mo_ta_chi : item.mo_ta_thu;
    const isChecked = item.sort_order >= 1 && item.sort_order <= 8;
    
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

async function handleModalChipToggle(type, desc, checked) {
  const list      = type === 'chi' ? loaiChiList : loaiThuList;
  const table     = type === 'chi' ? 'mo_ta_chi' : 'loai_thu';
  const idField   = type === 'chi' ? 'id_mtc'    : 'id_lt';
  const descField = type === 'chi' ? 'mo_ta_chi' : 'mo_ta_thu';

  const item = list.find(i => i[descField] === desc);
  if (!item) { showToast('Không tìm thấy: ' + desc); return; }

  let newSortOrder;
  if (checked) {
    const usedSlots = list
      .filter(i => i.sort_order >= 1 && i.sort_order <= 8)
      .map(i => i.sort_order);
    if (usedSlots.length >= 8) {
      showToast('Chỉ được chọn tối đa 8 mô tả');
      const cb = document.querySelector(`input[data-desc="${desc}"]`);
      if (cb) cb.checked = false;
      return;
    }
    // Lấy slot nhỏ nhất còn trống trong 1–8
    for (let s = 1; s <= 8; s++) {
      if (!usedSlots.includes(s)) { newSortOrder = s; break; }
    }
  } else {
    newSortOrder = 0;
  }

  const r = await supaPatch(table, `${idField}=eq.${item[idField]}`, { sort_order: newSortOrder });
  if (r === null) return; // supaPatch đã log lỗi

  // Cập nhật local list ngay (không cần re-fetch)
  item.sort_order = newSortOrder;
  if (type === 'chi') setCached(CACHE_KEYS.LOAI_CHI, loaiChiList);
  else                setCached(CACHE_KEYS.LOAI_THU, loaiThuList);

  type === 'chi' ? renderChiChips() : renderThuChips();
  updateModalSelectedCount(type);
}

function updateModalSelectedCount(type) {
  const list = type === 'chi' ? loaiChiList : loaiThuList;
  const count = list.filter(item => item.sort_order >= 1 && item.sort_order <= 8).length;
  const countElement = document.getElementById(`${type}-dropdown-count`);
  if (countElement) countElement.textContent = count;
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
    // Populate icon select
    const iconSel = document.getElementById('chi-modal-new-icon');
    if (iconSel) iconSel.innerHTML = qlIconOptions();
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
        icon: document.getElementById('chi-modal-new-icon') ? document.getElementById('chi-modal-new-icon').value : '',
        note: note
      };
      
      console.log('📤 Insert loai_chi payload:', payload);
      
      const result = await postData('insert_loai_chi', payload);
      
      if (result && result.status === 'success') {
        showToast(`Đã thêm mô tả "${name}" thành công`, 3000);
        
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
  // Chips quản lý qua sort_order trong DB – reset = re-render từ dữ liệu hiện tại
  console.log(`🔄 Re-rendering ${type} chips from DB...`);
  if (type === 'chi') {
    renderChiChips();
    renderModalCheckboxList('chi');
    showToast('✅ Đã tải lại chip CHI từ CSDL');
  } else if (type === 'thu') {
    renderThuChips();
    renderModalCheckboxList('thu');
    showToast('✅ Đã tải lại chip THU từ CSDL');
  }
}

// ================= TAB QUẢN LÝ =================
function qlBadge(active) {
  return active
    ? '<span class="ql-badge ql-badge-on">● Bật</span>'
    : '<span class="ql-badge ql-badge-off">○ Tắt</span>';
}

const QL_ICONS = [
  ['💳','Thẻ'],['🏦','Ngân hàng'],['💵','Tiền mặt'],['💰','Túi tiền'],['👛','Ví'],
  ['🪙','Xu'],['📱','Điện thoại'],['🏧','ATM'],['💎','Kim cương'],['🏠','Nhà'],
  ['🚗','Xe hơi'],['🛵','Xe máy'],['✈️','Máy bay'],['🍜','Ăn uống'],['🛒','Mua sắm'],
  ['📦','Gói hàng'],['💊','Y tế'],['🎮','Giải trí'],['📚','Học hành'],['☕','Cà phê'],
  ['🏋️','Thể thao'],['💼','Công việc'],['🎁','Quà tặng'],['🐱','Mèo'],['🐶','Chó'],
  ['⭐','Sao'],['💡','Ý tưởng'],['🔑','Chìa khóa'],['📊','Biểu đồ'],['💸','Chi tiêu'],
  ['🏥','Bệnh viện'],['🍺','Đồ uống'],['🎵','Âm nhạc'],['🚌','Xe buýt'],['⛽','Xăng'],
  ['🧳','Du lịch'],['💻','Máy tính xách tay'],['📞','Điện thoại bàn'],['🏪','Cửa hàng'],['🎬','Phim'],
  ['🧴','Chăm sóc'],['👕','Quần áo'],['👟','Giày dép'],['🎓','Học phí'],['🌐','Internet'],
  ['🔧','Sửa chữa'],['⚡','Tiền điện'],['💧','Tiền nước'],['📡','Cước mạng'],['🧹','Vệ sinh'],
  ['🎂','Sinh nhật'],['🍎','Thực phẩm'],['🔒','Bảo hiểm'],['📷','Chụp ảnh'],['💐','Hoa'],
  ['🎯','Mục tiêu'],['🌿','Thiên nhiên'],['🪴','Cây cảnh'],['🏡','Sửa nhà'],['🎪','Sự kiện']
];

const QL_LOAI_THU = ['Dư năm trước','Ngân hàng','Cho mượn','Thu nhập','Khác'];

function qlIconOptions(selected = '') {
  return '<option value="">-- Icon --</option>' +
    QL_ICONS.map(([ic, lb]) =>
      `<option value="${ic}" ${selected === ic ? 'selected' : ''}>${ic} ${lb}</option>`
    ).join('');
}

function qlLoaiThuOptions(selected = '') {
  return '<option value="">-- Chọn nhóm --</option>' +
    QL_LOAI_THU.map(v =>
      `<option value="${v}" ${selected === v ? 'selected' : ''}>${v}</option>`
    ).join('');
}

async function reloadMasterData() {
  const [lc, lt, nt] = await Promise.all([
    fetchData("loai_chi"),
    fetchData("loai_thu"),
    fetchData("nguon_tien")
  ]);
  loaiChiList  = lc;
  loaiThuList  = lt;
  nguonTienList = nt;
  _nguonColorCache = null;
  setCached(CACHE_KEYS.LOAI_CHI,   lc);
  setCached(CACHE_KEYS.LOAI_THU,   lt);
  setCached(CACHE_KEYS.NGUON_TIEN, nt);
  populateChiDropdowns();
  populateThuDropdowns();
  renderChiChips();
  renderThuChips();
}

// ---- NGUỒN TIỀN ----
async function loadQLNguonTien() {
  showLoading(true);
  const data = await fetch(
    `${SUPA_URL}/rest/v1/nguon_tien?select=*&order=sort_order.asc,nguon_tien.asc`,
    { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
  ).then(r => r.json()).catch(() => []);
  showLoading(false);
  renderQLNguonTien(data);
}

function renderQLNguonTien(data) {
  const list = document.getElementById("ql-nt-list");
  if (!data || !data.length) {
    list.innerHTML = '<div class="ql-empty">Chưa có dữ liệu. Nhấn "Tải danh sách".</div>';
    return;
  }
  list.innerHTML = "";
  data.forEach(item => {
    const rowEl = document.createElement("div");
    rowEl.className = "tk-list-item";
    const ntBg     = getNguonBgColor(item.nguon_tien);
    const ntBorder = getNguonBorderColor(item.nguon_tien);
    rowEl.style.borderLeft   = `4px solid ${ntBorder}`;
    rowEl.style.background   = `linear-gradient(to right, ${ntBg}, rgba(255,255,255,0) 70%)`;
    rowEl.style.borderRadius = "8px";
    rowEl.style.marginBottom = "4px";
    const nhomOptions = ["", "Bank", "Cash", "Ví", "Khác"].map(n =>
      `<option value="${n}" ${item.nhom === n ? 'selected' : ''}>${n || '--'}</option>`
    ).join('');
    const nguoiOptions = `
      <option value="" ${!item.nguoi ? 'selected' : ''}>--</option>
      <option value="Mèo" ${ item.nguoi === 'Mèo' ? 'selected' : ''}>🐱 Mèo</option>
      <option value="Boé" ${ item.nguoi === 'Boé' ? 'selected' : ''}>🐶 Boé</option>
      <option value="Khác" ${ item.nguoi === 'Khác' ? 'selected' : ''}>Khác</option>
      <option value="Tổng hợp" ${ item.nguoi === 'Tổng hợp' ? 'selected' : ''}>Tổng hợp</option>`;
    rowEl.innerHTML = `
      <div class="tk-list-view" style="display:flex;align-items:center;gap:6px;padding:10px 12px;">
        <span style="font-size:18px">${item.icon || '💳'}</span>
        <span style="flex:1;font-weight:600">${item.nguon_tien}</span>
        ${item.nhom ? `<span class="ql-tag ql-tag-nhom">${item.nhom}</span>` : ''}
        ${item.nguoi ? `<span class="ql-tag ql-tag-nguoi">${item.nguoi}</span>` : ''}
        ${qlBadge(item.active)}
        <button class="tk-btn-edit" title="Sửa">✏️</button>
      </div>
      <div class="tk-list-edit" style="display:none;">
        <div class="tk-edit-row"><label>Nhóm</label><select class="input-std ql-edit-nhom">${nhomOptions}</select></div>
        <div class="tk-edit-row"><label>Người</label><select class="input-std ql-edit-nguoi">${nguoiOptions}</select></div>
        <div class="tk-edit-row"><label>Icon</label><select class="input-std ql-edit-icon">${qlIconOptions(item.icon)}</select></div>
        <div class="tk-edit-row"><label>Trạng thái</label><select class="input-std ql-edit-active">
          <option value="true" ${item.active ? 'selected' : ''}>● Bật</option>
          <option value="false" ${!item.active ? 'selected' : ''}>○ Tắt</option>
        </select></div>
        <div class="tk-edit-actions">
          <button class="btn-submit btn-green ql-btn-confirm" style="flex:1;margin-top:0;">✅ Xác nhận</button>
          <button class="btn-submit btn-gray ql-btn-cancel" style="flex:1;margin-top:0;">❌ Hủy</button>
        </div>
      </div>`;
    rowEl.querySelector(".tk-btn-edit").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "none";
      rowEl.querySelector(".tk-list-edit").style.display = "block";
    };
    rowEl.querySelector(".ql-btn-cancel").onclick = () => {
      rowEl.querySelector(".tk-list-view").style.display = "flex";
      rowEl.querySelector(".tk-list-edit").style.display = "none";
    };
    rowEl.querySelector(".ql-btn-confirm").onclick = async () => {
      const patch = {
        nguoi:  rowEl.querySelector(".ql-edit-nguoi").value || null,
        nhom:   rowEl.querySelector(".ql-edit-nhom").value || null,
        icon:   rowEl.querySelector(".ql-edit-icon").value,
        active: rowEl.querySelector(".ql-edit-active").value === "true"
      };
      const r = await postData("patch_nguon_tien", { nguon_tien: item.nguon_tien, patch });
      if (r && r.status === "success") {
        showToast("Đã cập nhật nguồn tiền", 2000);
        await reloadMasterData();
        await loadQLNguonTien();
      }
    };
    list.appendChild(rowEl);
  });
}

// ---- LOẠI THU ----
async function loadQLLoaiThu() {
  showLoading(true);
  const data = await fetch(
    `${SUPA_URL}/rest/v1/loai_thu?select=*&order=loai_thu.asc,mo_ta_thu.asc`,
    { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }
  ).then(r => r.json()).catch(() => []);
  showLoading(false);
  renderQLLoaiThu(data);
}

function renderQLLoaiThu(data) {
  const list = document.getElementById("ql-lt-list");
  if (!data || !data.length) {
    list.innerHTML = '<div class="ql-empty">Chưa có dữ liệu. Nhấn "Tải danh sách".</div>';
    return;
  }
  list.innerHTML = "";
  // Group by loai_thu
  const groups = {};
  data.forEach(item => {
    const g = item.loai_thu || 'Khác';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });
  Object.entries(groups).forEach(([group, items]) => {
    const ltColor = getGroupColor(LOAI_THU_COLOR_MAP, group);
    const header = document.createElement("div");
    header.className = "ql-group-header";
    header.style.color      = ltColor.border;
    header.style.background = `${ltColor.bg}99`;
    header.style.borderTopColor = `${ltColor.border}55`;
    header.style.borderRadius   = "4px";
    header.textContent = group;
    list.appendChild(header);
    items.forEach(item => {
      const rowEl = document.createElement("div");
      rowEl.className = "tk-list-item";
      rowEl.style.borderLeft   = `4px solid ${ltColor.border}`;
      rowEl.style.background   = `linear-gradient(to right, ${ltColor.bg}, rgba(255,255,255,0) 70%)`;
      rowEl.style.borderRadius = "8px";
      rowEl.style.marginBottom = "4px";
      rowEl.innerHTML = `
        <div class="tk-list-view" style="display:flex;align-items:center;gap:6px;padding:10px 12px;">
          <span style="font-size:16px">${item.icon || ''}</span>
          <span style="flex:1;font-weight:500">${item.mo_ta_thu}</span>
          <span class="ql-tag ql-tag-loai">${item.loai_thu}</span>
          ${qlBadge(item.active)}
          <button class="tk-btn-edit" title="Sửa">✏️</button>
        </div>
        <div class="tk-list-edit" style="display:none;">
          <div class="tk-edit-row"><label>Mô tả</label><input type="text" class="input-std ql-edit-mota" value="${item.mo_ta_thu}"></div>
          <div class="tk-edit-row"><label>Nhóm</label><select class="input-std ql-edit-loai">${qlLoaiThuOptions(item.loai_thu)}</select></div>
          <div class="tk-edit-row"><label>Icon</label><select class="input-std ql-edit-icon">${qlIconOptions(item.icon)}</select></div>
          <div class="tk-edit-row"><label>Trạng thái</label><select class="input-std ql-edit-active">
            <option value="true" ${item.active ? 'selected' : ''}>● Bật</option>
            <option value="false" ${!item.active ? 'selected' : ''}>○ Tắt</option>
          </select></div>
          <div class="tk-edit-actions">
            <button class="btn-submit btn-green ql-btn-confirm" style="flex:1;margin-top:0;">✅ Xác nhận</button>
            <button class="btn-submit btn-gray ql-btn-cancel" style="flex:1;margin-top:0;">❌ Hủy</button>
          </div>
        </div>`;
      rowEl.querySelector(".tk-btn-edit").onclick = () => {
        rowEl.querySelector(".tk-list-view").style.display = "none";
        rowEl.querySelector(".tk-list-edit").style.display = "block";
      };
      rowEl.querySelector(".ql-btn-cancel").onclick = () => {
        rowEl.querySelector(".tk-list-view").style.display = "flex";
        rowEl.querySelector(".tk-list-edit").style.display = "none";
      };
      rowEl.querySelector(".ql-btn-confirm").onclick = async () => {
        const patch = {
          mo_ta_thu: rowEl.querySelector(".ql-edit-mota").value.trim(),
          loai_thu:  rowEl.querySelector(".ql-edit-loai").value,
          icon:      rowEl.querySelector(".ql-edit-icon").value,
          active:    rowEl.querySelector(".ql-edit-active").value === "true"
        };
        if (!patch.mo_ta_thu || !patch.loai_thu) { showToast("Vui lòng điền đầy đủ thông tin"); return; }
        const r = await postData("patch_loai_thu", { id_lt: item.id_lt, patch });
        if (r && r.status === "success") {
          showToast("Đã cập nhật loại thu", 2000);
          await reloadMasterData();
          await loadQLLoaiThu();
        }
      };
      list.appendChild(rowEl);
    });
  });
}

// ---- MÔ TẢ CHI ----
async function loadQLMoTaChi() {
  showLoading(true);
  const data = await fetchData("loai_chi"); // v_loai_chi
  showLoading(false);
  renderQLMoTaChi(data);
}

function renderQLMoTaChi(data) {
  const list = document.getElementById("ql-mc-list");
  if (!data || !data.length) {
    list.innerHTML = '<div class="ql-empty">Chưa có dữ liệu. Nhấn "Tải danh sách".</div>';
    return;
  }
  list.innerHTML = "";
  const uniquePhanLoai = [...new Set(data.map(i => i.phan_loai).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'vi'));
  // Group by phan_loai
  const groups = {};
  data.forEach(item => {
    const g = item.phan_loai || 'Khác';
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });
  Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'vi')).forEach(([group, items]) => {
    const mcColor = getGroupColor(PHAN_LOAI_CHI_COLOR_MAP, group);
    const header = document.createElement("div");
    header.className = "ql-group-header";
    header.style.color      = mcColor.border;
    header.style.background = `${mcColor.bg}99`;
    header.style.borderTopColor = `${mcColor.border}55`;
    header.style.borderRadius   = "4px";
    header.textContent = group;
    list.appendChild(header);
    items.forEach(item => {
      const rowEl = document.createElement("div");
      rowEl.className = "tk-list-item";
      rowEl.style.borderLeft   = `4px solid ${mcColor.border}`;
      rowEl.style.background   = `linear-gradient(to right, ${mcColor.bg}, rgba(255,255,255,0) 70%)`;
      rowEl.style.borderRadius = "8px";
      rowEl.style.marginBottom = "4px";
      const plOptions = uniquePhanLoai.map(pl =>
        `<option value="${pl}" ${item.phan_loai === pl ? 'selected' : ''}>${pl}</option>`
      ).join('');
      rowEl.innerHTML = `
        <div class="tk-list-view" style="display:flex;align-items:center;gap:6px;padding:10px 12px;">
          <span style="font-size:16px">${item.icon || ''}</span>
          <span style="flex:1;font-weight:500">${item.mo_ta_chi}</span>
          <span class="ql-tag ql-tag-phanloai">${item.phan_loai || ''}</span>
          ${qlBadge(item.active)}
          <button class="tk-btn-edit" title="Sửa">✏️</button>
        </div>
        <div class="tk-list-edit" style="display:none;">
          <div class="tk-edit-row"><label>Mô tả</label><input type="text" class="input-std ql-edit-mota" value="${item.mo_ta_chi}"></div>
          <div class="tk-edit-row"><label>Phân loại</label><select class="input-std ql-edit-phanloai"><option value="">--</option>${plOptions}</select></div>
          <div class="tk-edit-row"><label>Icon</label><select class="input-std ql-edit-icon">${qlIconOptions(item.icon)}</select></div>
          <div class="tk-edit-row"><label>Trạng thái</label><select class="input-std ql-edit-active">
            <option value="true" ${item.active ? 'selected' : ''}>● Bật</option>
            <option value="false" ${!item.active ? 'selected' : ''}>○ Tắt</option>
          </select></div>
          <div class="tk-edit-actions">
            <button class="btn-submit btn-green ql-btn-confirm" style="flex:1;margin-top:0;">✅ Xác nhận</button>
            <button class="btn-submit btn-gray ql-btn-cancel" style="flex:1;margin-top:0;">❌ Hủy</button>
          </div>
        </div>`;
      rowEl.querySelector(".tk-btn-edit").onclick = () => {
        rowEl.querySelector(".tk-list-view").style.display = "none";
        rowEl.querySelector(".tk-list-edit").style.display = "block";
      };
      rowEl.querySelector(".ql-btn-cancel").onclick = () => {
        rowEl.querySelector(".tk-list-view").style.display = "flex";
        rowEl.querySelector(".tk-list-edit").style.display = "none";
      };
      rowEl.querySelector(".ql-btn-confirm").onclick = async () => {
        const newMoTa    = rowEl.querySelector(".ql-edit-mota").value.trim();
        const newPhanLoai = rowEl.querySelector(".ql-edit-phanloai").value;
        const newActive  = rowEl.querySelector(".ql-edit-active").value === "true";
        if (!newMoTa) { showToast("Vui lòng nhập mô tả"); return; }
        const r = await postData("patch_mo_ta_chi", {
          id_mtc:    item.id_mtc,
          patch:     { mo_ta_chi: newMoTa, active: newActive, icon: rowEl.querySelector(".ql-edit-icon").value },
          phan_loai: newPhanLoai !== item.phan_loai ? newPhanLoai : null
        });
        if (r && r.status === "success") {
          showToast("Đã cập nhật mô tả chi", 2000);
          await reloadMasterData();
          await loadQLMoTaChi();
        }
      };
      list.appendChild(rowEl);
    });
  });
}

function initQLTab() {
  // Populate icon selects trên form thêm mới
  document.getElementById("ql-nt-new-icon").innerHTML = qlIconOptions();
  document.getElementById("ql-lt-new-icon").innerHTML = qlIconOptions();
  document.getElementById("ql-mc-new-icon").innerHTML = qlIconOptions();

  // ---- NGUỒN TIỀN ----
  document.getElementById("ql-nt-load").onclick = loadQLNguonTien;
  const ntName   = document.getElementById("ql-nt-new-name");
  const ntNhom   = document.getElementById("ql-nt-new-nhom");
  const ntAddBtn = document.getElementById("ql-nt-add");
  const checkNT  = () => { ntAddBtn.disabled = !(ntName.value.trim() && ntNhom.value); };
  ntName.oninput  = checkNT;
  ntNhom.onchange = checkNT;
  ntAddBtn.onclick = async () => {
    const r = await postData("insert_nguon_tien", {
      nguon_tien: ntName.value.trim(),
      nhom:       ntNhom.value,
      nguoi:      document.getElementById("ql-nt-new-nguoi").value || null,
      icon:       document.getElementById("ql-nt-new-icon").value || ""
    });
    if (r && r.status === "success") {
      showToast("Đã thêm nguồn tiền", 2000);
      ntName.value = ""; ntNhom.value = "";
      document.getElementById("ql-nt-new-nguoi").value = "";
      document.getElementById("ql-nt-new-icon").value = "";
      ntAddBtn.disabled = true;
      await reloadMasterData();
      await loadQLNguonTien();
    }
  };

  // ---- LOẠI THU ----
  document.getElementById("ql-lt-load").onclick = loadQLLoaiThu;
  const ltMota   = document.getElementById("ql-lt-new-mota");
  const ltLoai   = document.getElementById("ql-lt-new-loai");
  const ltAddBtn = document.getElementById("ql-lt-add");
  const checkLT  = () => { ltAddBtn.disabled = !(ltMota.value.trim() && ltLoai.value); };
  ltMota.oninput  = checkLT;
  ltLoai.onchange = checkLT;
  ltAddBtn.onclick = async () => {
    const r = await postData("insert_loai_thu", {
      mo_ta_thu: ltMota.value.trim(),
      loai_thu:  ltLoai.value,
      icon:      document.getElementById("ql-lt-new-icon").value || ""
    });
    if (r && r.status === "success") {
      showToast("Đã thêm loại thu", 2000);
      ltMota.value = ""; ltLoai.value = "";
      document.getElementById("ql-lt-new-icon").value = "";
      ltAddBtn.disabled = true;
      await reloadMasterData();
      await loadQLLoaiThu();
    }
  };

  // ---- MÔ TẢ CHI ----
  document.getElementById("ql-mc-load").onclick = loadQLMoTaChi;
  const mcMota   = document.getElementById("ql-mc-new-mota");
  const mcPhanLoai = document.getElementById("ql-mc-new-phanloai");
  const mcAddBtn = document.getElementById("ql-mc-add");
  // Populate phan_loai dropdown từ loaiChiList
  const uniquePL = [...new Set((loaiChiList || []).map(i => i.phan_loai).filter(Boolean))].sort((a,b) => a.localeCompare(b,'vi'));
  uniquePL.forEach(pl => {
    const opt = document.createElement('option');
    opt.value = pl; opt.textContent = pl;
    mcPhanLoai.appendChild(opt);
  });
  const checkMC = () => { mcAddBtn.disabled = !(mcMota.value.trim() && mcPhanLoai.value); };
  mcMota.oninput     = checkMC;
  mcPhanLoai.onchange = checkMC;
  mcAddBtn.onclick = async () => {
    const r = await postData("insert_loai_chi", {
      mo_ta_chi: mcMota.value.trim(),
      phan_loai: mcPhanLoai.value,
      icon:      document.getElementById("ql-mc-new-icon").value || ""
    });
    if (r && r.status === "success") {
      showToast("Đã thêm mô tả chi", 2000);
      mcMota.value = ""; mcPhanLoai.value = "";
      document.getElementById("ql-mc-new-icon").value = "";
      mcAddBtn.disabled = true;
      await reloadMasterData();
      await loadQLMoTaChi();
    }
  };

  console.log("✅ QL tab initialized");
}

// ================= TAB BAR =================
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  if (tabId === 'chi') setTimeout(() => chiInput.focus(), 50);
  if (tabId === 'thu') setTimeout(() => thuInput.focus(), 50);
  if (tabId === 'bc') renderBaoCao();
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
  
  const [loaiChiData, nguonTienData, loaiThuData] = await Promise.all([
    getCachedOrFetch(CACHE_KEYS.LOAI_CHI,   'loai_chi'),
    getCachedOrFetch(CACHE_KEYS.NGUON_TIEN, 'nguon_tien'),
    getCachedOrFetch(CACHE_KEYS.LOAI_THU,   'loai_thu')
  ]);
  
  loaiChiList  = loaiChiData  || [];
  nguonTienList = nguonTienData || [];
  loaiThuList  = loaiThuData  || [];
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
  
  updateHeader(chiData, thuData);
  
  populateChiDropdowns();
  populateThuDropdowns();
  
  initModalEventListeners();
  initTabBar();
  initTKSortBars();
  initQLTab();

  console.log('✅ App initialized successfully');
};

// ================= BÁO CÁO =================
let bcChartThang = null;
let bcChartLine  = null;
let bcChartChi   = null;
let bcCachedChiData    = null;
let bcCachedThuData    = null;
let bcCachedTkData     = null;
let bcCachedTkSession  = null;
let bcMode       = 'thang';
let bcTgSub      = 'nam';   // 'nam' | 'thang'
let bcDrillLevel = 'nhom';

// Palette 30 mau, xen ke nong/lanh
const BC_PALETTE_BG = [
  'rgba(255,87,97,0.82)',   // #ff5761  nong
  'rgba(2,121,239,0.82)',   // #0279ef  lanh
  'rgba(250,0,234,0.82)',   // #fa00ea  nong
  'rgba(1,223,29,0.82)',    // #01df1d  lanh
  'rgba(206,59,255,0.82)',  // #ce3bff  nong
  'rgba(147,196,0,0.82)',   // #93c400  lanh
  'rgba(201,71,38,0.82)',   // #c94726  nong
  'rgba(68,207,255,0.82)',  // #44cfff  lanh
  'rgba(198,0,161,0.82)',   // #c600a1  nong
  'rgba(155,255,147,0.82)', // #9bff93  lanh
  'rgba(255,112,184,0.82)', // #ff70b8  nong
  'rgba(2,244,206,0.82)',   // #02f4ce  lanh
  'rgba(197,122,0,0.82)',   // #c57a00  nong
  'rgba(89,169,255,0.82)',  // #59a9ff  lanh
  'rgba(192,176,0,0.82)',   // #c0b000  nong
  'rgba(0,129,136,0.82)',   // #008188  lanh
  'rgba(255,182,109,0.82)', // #ffb66d  nong
  'rgba(120,209,210,0.82)', // #78d1d2  lanh
  'rgba(221,155,255,0.82)', // #dd9bff  nong
  'rgba(91,191,80,0.82)',   // #5bbf50  lanh
  'rgba(159,97,158,0.82)',  // #9f619e  nong
  'rgba(123,90,255,0.82)',  // #7b5aff  lanh
  'rgba(188,102,87,0.82)',  // #bc6657  nong
  'rgba(142,197,166,0.82)', // #8ec5a6  lanh
  'rgba(255,199,212,0.82)', // #ffc7d4  nong
  'rgba(221,255,125,0.82)', // #ddff7d  lanh
  'rgba(255,231,188,0.82)', // #ffe7bc  nong
  'rgba(87,142,64,0.82)',   // #578e40  lanh
  'rgba(132,128,147,0.82)', // #848093  neutral
  'rgba(234,247,255,0.82)'  // #eaf7ff  lanh
];
const BC_PALETTE_BD = [
  '#ff5761','#0279ef','#fa00ea','#01df1d','#ce3bff','#93c400',
  '#c94726','#44cfff','#c600a1','#9bff93','#ff70b8','#02f4ce',
  '#c57a00','#59a9ff','#c0b000','#008188','#ffb66d','#78d1d2',
  '#dd9bff','#5bbf50','#9f619e','#7b5aff','#bc6657','#8ec5a6',
  '#ffc7d4','#ddff7d','#ffe7bc','#578e40','#848093','#eaf7ff'
];
function bcPaletteBg(i)  { return BC_PALETTE_BG[i % BC_PALETTE_BG.length]; }
function bcPaletteBd(i)  { return BC_PALETTE_BD[i % BC_PALETTE_BD.length]; }

function bcFmtVN(n) {
  n = Math.round(n || 0);
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' tr';
  if (Math.abs(n) >= 1000) return Math.round(n / 1000) + 'k';
  return n.toLocaleString('vi-VN');
}
function bcNumSpan(n, sign) {
  const prefix = (sign && n > 0) ? '+' : '';
  const full  = prefix + formatVN(n);
  const short = prefix + bcFmtVN(n);
  if (short === full) return full;
  return `<span class="bc-num" data-full="${full}" title="Nhấn để xem đầy đủ" onclick="bcShowNumTip(this)">${short}</span>`;
}
function bcShowNumTip(el) {
  const existing = document.getElementById('bc-num-tip');
  if (existing) { existing.remove(); if (existing._src === el) return; }
  const tip = document.createElement('div');
  tip.id = 'bc-num-tip';
  tip._src = el;
  tip.textContent = el.dataset.full;
  document.body.appendChild(tip);
  const r = el.getBoundingClientRect();
  const tw = Math.min(180, window.innerWidth - 16);
  let left = r.left + r.width / 2 - tw / 2;
  if (left < 8) left = 8;
  if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
  tip.style.cssText = `left:${left + window.scrollX}px;top:${r.top + window.scrollY - 34}px;width:${tw}px`;
  setTimeout(() => document.addEventListener('click', function h(){ tip.remove(); document.removeEventListener('click', h); }, { capture: true, once: true }), 0);
}

async function ensureBcData() {
  if (!bcCachedChiData || !bcCachedThuData) {
    showLoading(true);
    // Đảm bảo loaiChiList đã có trước khi lọc
    if (!loaiChiList || !loaiChiList.length) {
      loaiChiList = (await fetchData('loai_chi')) || [];
    }
    const [chiRaw, thuRaw] = await Promise.all([
      fetchData('Chi_Tieu_2026'),
      fetchData('Thu_2026')
    ]);
    bcCachedChiData = chiRaw.filter(r => {
      if (!r.IDChi || !r.IDChi.trim()) return false;
      const lc = loaiChiList.find(l => l.mo_ta_chi === r.mo_ta_chi);
      const nhom = (lc && lc.nhom || '').trim();
      const phanLoai = (lc && lc.phan_loai || '').trim();
      return nhom !== 'Đầu tư' && phanLoai !== 'Đầu tư';
    });
    bcCachedThuData = thuRaw.filter(r => r.IDThu && r.IDThu.trim() && (r['Loại thu'] || '').trim() !== 'Hoàn vốn');
    showLoading(false);
  }
  if (!bcCachedTkData) {
    [bcCachedTkData, bcCachedTkSession] = await Promise.all([
      fetchData('tk_detail'),
      fetchData('tk_session')
    ]);
  }
}

function bcGetYears(chiData, thuData) {
  const years = new Set();
  [...chiData, ...thuData].forEach(r => {
    const d = new Date(r['Ngày']);
    if (d.getFullYear() > 2000) years.add(d.getFullYear());
  });
  return [...years].sort((a, b) => b - a);
}

// ---- Theo năm: bar chart Thu/Chi theo 12 tháng ----
function bcRenderThangNam(year) {
  const chi = bcCachedChiData || [];
  const thu = bcCachedThuData || [];
  const chiByMonth = Array(12).fill(0);
  const thuByMonth = Array(12).fill(0);
  chi.forEach(r => {
    const d = new Date(r['Ngày']);
    if (d.getFullYear() === year) chiByMonth[d.getMonth()] += parseFloat(r['Số tiền vnđ']) || 0;
  });
  thu.forEach(r => {
    const d = new Date(r['Ngày']);
    if (d.getFullYear() === year) thuByMonth[d.getMonth()] += parseFloat(r['Thu']) || 0;
  });
  const labels = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const ctx = document.getElementById('bc-chart-thang').getContext('2d');
  if (bcChartThang) { bcChartThang.destroy(); bcChartThang = null; }
  bcChartThang = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Thu', data: thuByMonth, backgroundColor: 'rgba(46,199,89,0.72)', borderColor: '#34c759', borderWidth: 1.5, borderRadius: 5 },
        { label: 'Chi', data: chiByMonth, backgroundColor: 'rgba(217,83,79,0.72)', borderColor: '#d9534f', borderWidth: 1.5, borderRadius: 5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatVN(c.raw)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { ticks: { callback: v => bcFmtVN(v), font: { size: 10 }, maxTicksLimit: 5 }, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
  let html = `<table class="bc-table"><thead><tr><th>Tháng</th><th class="bc-td-right">Thu</th><th class="bc-td-right">Chi</th><th class="bc-td-right">Chênh lệch</th></tr></thead><tbody>`;
  let totalThu = 0, totalChi = 0;
  for (let i = 0; i < 12; i++) {
    if (!chiByMonth[i] && !thuByMonth[i]) continue;
    const cl = thuByMonth[i] - chiByMonth[i];
    totalThu += thuByMonth[i]; totalChi += chiByMonth[i];
    html += `<tr><td>${i+1}</td><td class="bc-td-right bc-td-green">${bcNumSpan(thuByMonth[i])}</td><td class="bc-td-right bc-td-red">${bcNumSpan(chiByMonth[i])}</td><td class="bc-td-right ${cl>=0?'bc-td-green':'bc-td-red'}">${bcNumSpan(cl, true)}</td></tr>`;
  }
  const totalCl = totalThu - totalChi;
  html += `</tbody><tfoot><tr style="font-weight:700;background:#f8f4ff;"><td>Tổng</td><td class="bc-td-right bc-td-green">${bcNumSpan(totalThu)}</td><td class="bc-td-right bc-td-red">${bcNumSpan(totalChi)}</td><td class="bc-td-right ${totalCl>=0?'bc-td-green':'bc-td-red'}">${bcNumSpan(totalCl, true)}</td></tr></tfoot></table>`;
  document.getElementById('bc-table-thang').innerHTML = html;
}

// ---- Theo tháng: line chart, mỗi line = một mo_ta_chi ----
function bcRenderThangLine(year, month) {
  const chi = bcCachedChiData || [];

  // Gom tổng theo mo_ta_chi cho tháng đã chọn
  const totals = {};
  chi.forEach(r => {
    const d = new Date(r['Ngày']);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return;
    const key = r.mo_ta_chi || 'Khác';
    totals[key] = (totals[key] || 0) + (parseFloat(r['Số tiền vnđ']) || 0);
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const tableEl = document.getElementById('bc-table-line');
  const canvas  = document.getElementById('bc-chart-line');
  if (bcChartLine) { bcChartLine.destroy(); bcChartLine = null; }
  canvas.style.height = '';
  if (!sorted.length) {
    tableEl.innerHTML = '<div class="bc-empty">Không có dữ liệu chi cho tháng này</div>';
    return;
  }

  const total = sorted.reduce((s, [, v]) => s + v, 0);
  // Top 10 truoc, neu 'Con lai' > bar tren no thi lay them cho den khi thoa man
  const thirdVal1 = sorted.length > 2 ? sorted[2][1] : Infinity;
  const chartItems = sorted.slice(0, 10);
  let rest = sorted.slice(10);
  while (rest.length > 0) {
    const conLai = rest.reduce((s, [, v]) => s + v, 0);
    const lastVal = chartItems[chartItems.length - 1][1];
    if (conLai <= lastVal * 6 && conLai < thirdVal1) break;
    chartItems.push(rest.shift());
  }
  const conLaiVal = rest.reduce((s, [, v]) => s + v, 0);
  if (conLaiVal > 0) chartItems.push(['Còn lại', conLaiVal]);

  const catLabels = chartItems.map(([k]) => k);
  const chartVals = chartItems.map(([, v]) => v);
  const maxVal    = chartVals[0] || 1;

  // Moi bar cao = 1.2x chieu cao chu (font 11px → line ~14px → bar 14px)
  // slot = bar / (categoryPercentage * barPercentage) = 14 / (1.0 * 0.6) = 23px
  // parent height = numBars * slot + 20px padding
  const SLOT_H = 23;
  const wrap = canvas.parentElement;
  wrap.style.height = (catLabels.length * SLOT_H + 20) + 'px';
  canvas.style.height = '';

  // Inline plugin: hien so tien cuoi moi bar
  const barLabelPlugin = {
    id: 'bcBarLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#555';
      ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const v = chartVals[i];
        if (v > 0) ctx.fillText(bcFmtVN(v), bar.x + 5, bar.y);
      });
      ctx.restore();
    }
  };

  bcChartLine = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        data: chartVals,
        backgroundColor: catLabels.map((lbl, i) => lbl === 'Còn lại' ? 'rgba(180,180,180,0.7)' : bcPaletteBg(i)),
        borderColor:      catLabels.map((lbl, i) => lbl === 'Còn lại' ? '#999' : bcPaletteBd(i)),
        borderWidth: 1.5,
        borderRadius: 3
      }]
    },
    plugins: [barLabelPlugin],
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 90, top: 4, bottom: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${formatVN(c.raw)} (${(c.raw/total*100).toFixed(1)}%)` } }
      },
      scales: {
        x: { display: false, max: maxVal * 1.35 },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
          categoryPercentage: 1.0,
          barPercentage: 0.6
        }
      }
    }
  });

  let html = `<table class="bc-table"><thead><tr><th>Mô tả chi</th><th class="bc-td-right">Tổng tháng</th></tr></thead><tbody>`;
  sorted.forEach(([name, val], i) => {
    const clr = bcPaletteBd(i);
    html += `<tr><td><span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:${clr};margin-right:6px;vertical-align:middle"></span>${name}</td><td class="bc-td-right bc-td-red">${formatVN(val)}</td></tr>`;
  });
  html += `</tbody><tfoot><tr style="font-weight:700;background:#f8f4ff;"><td>Tổng</td><td class="bc-td-right bc-td-red">${formatVN(total)}</td></tr></tfoot></table>`;
  tableEl.innerHTML = html;
}

// ---- Phân tích chi: donut với màu đa dạng ----
function bcRenderChi(monthFilter, yearFilter, level) {
  const chi = bcCachedChiData || [];
  const filtered = chi.filter(r => {
    const d = new Date(r['Ngày']);
    if (yearFilter && d.getFullYear() !== yearFilter) return false;
    if (monthFilter && monthFilter > 0 && (d.getMonth() + 1) !== monthFilter) return false;
    return true;
  });
  const groups = {};
  filtered.forEach(r => {
    let key;
    const lc = loaiChiList.find(l => l.mo_ta_chi === r.mo_ta_chi);
    if (level === 'nhom') key = (lc && lc.nhom) || 'Khác';
    else if (level === 'phanloai') key = (lc && lc.phan_loai) || 'Khác';
    else key = r.mo_ta_chi || 'Khác';
    groups[key] = (groups[key] || 0) + (parseFloat(r['Số tiền vnđ']) || 0);
  });
  const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  const tableEl = document.getElementById('bc-table-chi');
  if (!sorted.length) {
    if (bcChartChi) { bcChartChi.destroy(); bcChartChi = null; }
    tableEl.innerHTML = '<div class="bc-empty">Không có dữ liệu chi</div>';
    return;
  }
  // Gom con lai: top 10, mo rong neu con lai > bar tren * 6 hoac >= gia tri thu 3
  const thirdVal2 = sorted.length > 2 ? sorted[2][1] : Infinity;
  const chartItems = sorted.slice(0, 10);
  let rest = sorted.slice(10);
  while (rest.length > 0) {
    const conLai = rest.reduce((s, [, v]) => s + v, 0);
    const lastVal = chartItems[chartItems.length - 1][1];
    if (conLai <= lastVal * 6 && conLai < thirdVal2) break;
    chartItems.push(rest.shift());
  }
  const conLaiVal = rest.reduce((s, [, v]) => s + v, 0);
  if (conLaiVal > 0) chartItems.push(['Còn lại', conLaiVal]);

  const chartLabels  = chartItems.map(([k]) => k);
  const chartValues  = chartItems.map(([, v]) => v);
  const bgColors     = chartLabels.map((lbl, i) => lbl === 'Còn lại' ? 'rgba(180,180,180,0.7)' : bcPaletteBg(i));
  const borderColors = chartLabels.map((lbl, i) => lbl === 'Còn lại' ? '#999' : bcPaletteBd(i));

  const ctx = document.getElementById('bc-chart-chi').getContext('2d');
  if (bcChartChi) { bcChartChi.destroy(); bcChartChi = null; }
  bcChartChi = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{ data: chartValues, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 5 } },
        tooltip: { callbacks: { label: c => ` ${formatVN(c.raw)} (${(c.raw/total*100).toFixed(1)}%)` } }
      }
    }
  });
  let html = `<table class="bc-table"><thead><tr><th>Mục chi</th><th class="bc-td-right">Số tiền</th><th class="bc-td-right">%</th></tr></thead><tbody>`;
  sorted.forEach(([k, v], i) => {
    const pct = total > 0 ? (v / total * 100).toFixed(1) : 0;
    const barW = Math.max(4, Math.round(v / total * 64));
    const clr = bcPaletteBd(i);
    html += `<tr><td><span class="bc-mini-bar" style="width:${barW}px;background:${clr}"></span> ${k}</td><td class="bc-td-right bc-td-red">${formatVN(v)}</td><td class="bc-td-right" style="color:#888">${pct}%</td></tr>`;
  });
  html += `</tbody><tfoot><tr style="font-weight:700;background:#f8f4ff;"><td>Tổng</td><td class="bc-td-right bc-td-red">${formatVN(total)}</td><td></td></tr></tfoot></table>`;
  tableEl.innerHTML = html;
}

// ---- Tổng kết xem lại: chia theo người, màu nguồn, + so_du_lt + chenhlech ----
function bcRenderTongKet(ngayTk) {
  const rows    = (bcCachedTkData    || []).filter(r => r.ngay_tk && r.ngay_tk.startsWith(ngayTk));
  const session = (bcCachedTkSession || []).find(s => s.ngay_tk && s.ngay_tk.startsWith(ngayTk));
  const el      = document.getElementById('bc-tk-detail');
  const sumEl   = document.getElementById('bc-tk-summary');
  if (!rows.length) {
    sumEl.innerHTML = '';
    el.innerHTML = '<div class="bc-empty">Không có dữ liệu</div>';
    return;
  }

  // Summary: so_du_lt, so_du_tt, chenhlech từ tk_session
  if (session) {
    const lt  = parseFloat(session.so_du_lt) || 0;
    const tt  = parseFloat(session.so_du_tt) || 0;
    const cl  = tt - lt;
    const clSign = cl >= 0 ? '+' : '';
    sumEl.innerHTML = `
      <div class="bc-summary-row">
        <div class="bc-summary-chip bc-sd-lt"><span>Số dư LT</span><span>${formatVN(lt)}</span></div>
        <div class="bc-summary-chip bc-sd-tt"><span>Số dư TT</span><span>${formatVN(tt)}</span></div>
        <div class="bc-summary-chip ${cl >= 0 ? 'bc-sd-pos' : 'bc-sd-neg'}"><span>Chênh lệch</span><span>${clSign}${formatVN(cl)}</span></div>
      </div>`;
  } else {
    sumEl.innerHTML = '';
  }

  // Group theo người
  const NGUOI_ORDER = ['Mèo', 'Boé'];
  const NGUOI_GROUP_COLORS = {
    'Mèo':  { title: '#c2185b', bar: '#f48fb1' },
    'Boé':  { title: '#1565c0', bar: '#90caf9' },
  };

  // Lấy thông tin nguoi từ nguonTienList
  const getNguoi = (nguon) => {
    const n = nguonTienList.find(x => x.nguon_tien === nguon);
    return n ? (n.nguoi || 'Khác') : 'Khác';
  };

  // Sắp xếp rows theo người
  const sorted = [...rows].sort((a, b) => {
    const ai = NGUOI_ORDER.indexOf(getNguoi(a.nguon_tien));
    const bi = NGUOI_ORDER.indexOf(getNguoi(b.nguon_tien));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = '';
  let currentNguoi = null;
  let groupTotal = 0;
  let groupRows = '';

  const flushGroup = (nguoi, total, rowsHtml) => {
    const gc = NGUOI_GROUP_COLORS[nguoi] || { title: '#546e7a', bar: '#b0bec5' };
    html += `<div class="bc-nguoi-group">
      <div class="bc-nguoi-label" style="color:${gc.title};border-bottom:2px solid ${gc.bar}">${nguoi || 'Khác'}</div>
      ${rowsHtml}
      <div class="bc-group-total">Tổng <span>${formatVN(total)}</span></div>
    </div>`;
  };

  sorted.forEach(r => {
    const nguoi = getNguoi(r.nguon_tien);
    if (nguoi !== currentNguoi) {
      if (currentNguoi !== null) flushGroup(currentNguoi, groupTotal, groupRows);
      currentNguoi = nguoi;
      groupTotal = 0;
      groupRows = '';
    }
    const v = parseFloat(r.so_tien) || 0;
    groupTotal += v;
    const bg  = getNguonBgColor(r.nguon_tien);
    const brd = getNguonBorderColor(r.nguon_tien);
    groupRows += `<div class="bc-tk-row" style="background:${bg};border-left:3px solid ${brd}">
      <span class="bc-tk-label">${r.nguon_tien}</span>
      <span class="bc-tk-val">${formatVN(v)}</span>
    </div>`;
  });
  if (currentNguoi !== null) flushGroup(currentNguoi, groupTotal, groupRows);

  el.innerHTML = html;
}

async function initBcTab() {
  await ensureBcData();
  const chi   = bcCachedChiData || [];
  const thu   = bcCachedThuData || [];
  const years = bcGetYears(chi, thu);
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  // "tháng trước" là default cho phân tích chi
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear  = curMonth === 1 ? curYear - 1 : curYear;

  // ---- Theo năm ----
  const yearSel = document.getElementById('bc-year-select');
  yearSel.innerHTML = (years.length ? years : [curYear]).map(y => `<option value="${y}"${y===curYear?' selected':''}>${y}</option>`).join('');
  yearSel.onchange = () => bcRenderThangNam(parseInt(yearSel.value));

  // ---- Theo tháng (line) ----
  const tgYearSel  = document.getElementById('bc-tg-year');
  const tgMonthSel = document.getElementById('bc-tg-month');
  tgYearSel.innerHTML = (years.length ? years : [curYear]).map(y => `<option value="${y}"${y===curYear?' selected':''}>${y}</option>`).join('');
  tgMonthSel.innerHTML = Array.from({length:12},(_,i)=>`<option value="${i+1}"${i+1===curMonth?' selected':''}>${'Tháng '+(i+1)}</option>`).join('');
  const reRenderLine = () => bcRenderThangLine(parseInt(tgYearSel.value), parseInt(tgMonthSel.value));
  tgYearSel.onchange  = reRenderLine;
  tgMonthSel.onchange = reRenderLine;

  // Sub-pills Theo thời gian
  document.querySelectorAll('#bc-tg-sub-bar .bc-drill-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#bc-tg-sub-bar .bc-drill-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bcTgSub = btn.dataset.tgsub;
      document.getElementById('bc-tg-nam').style.display   = bcTgSub === 'nam'   ? '' : 'none';
      document.getElementById('bc-tg-thang').style.display = bcTgSub === 'thang' ? '' : 'none';
      if (bcTgSub === 'nam')   bcRenderThangNam(parseInt(yearSel.value));
      if (bcTgSub === 'thang') reRenderLine();
    });
  });

  // ---- Phân tích chi ----
  const chiYearSel  = document.getElementById('bc-chi-year');
  const chiMonthSel = document.getElementById('bc-chi-month');
  chiYearSel.innerHTML  = (years.length ? years : [curYear]).map(y => `<option value="${y}"${y===prevYear?' selected':''}>${y}</option>`).join('');
  chiMonthSel.innerHTML = `<option value="0">Tất cả</option>` + Array.from({length:12},(_,i)=>`<option value="${i+1}"${i+1===prevMonth?' selected':''}>${'Tháng '+(i+1)}</option>`).join('');
  const reRenderChi = () => bcRenderChi(parseInt(chiMonthSel.value), parseInt(chiYearSel.value), bcDrillLevel);
  chiYearSel.onchange  = reRenderChi;
  chiMonthSel.onchange = reRenderChi;

  document.querySelectorAll('.bc-drill-pill[data-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bc-drill-pill[data-level]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bcDrillLevel = btn.dataset.level;
      reRenderChi();
    });
  });

  // ---- Tổng kết ----
  const tkSel = document.getElementById('bc-tk-select');
  // Normalize to YYYY-MM-DD (cả tk_session lẫn tk_detail có thể dùng timestamp)
  const normDate = d => d ? d.slice(0, 10) : '';
  const tkDates = [...new Set(
    [...(bcCachedTkSession||[]), ...(bcCachedTkData||[])].map(r => normDate(r.ngay_tk)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));
  tkSel.innerHTML = tkDates.length
    ? tkDates.map(d=>`<option value="${d}">${new Date(d + 'T00:00:00').toLocaleDateString('vi-VN')}</option>`).join('')
    : `<option value="">-- Chưa có dữ liệu --</option>`;
  tkSel.onchange = () => { if (tkSel.value) bcRenderTongKet(tkSel.value); };

  // Mode pills
  document.querySelectorAll('#bc-section-bar .bc-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#bc-section-bar .bc-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.bc-mode-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('bc-mode-' + btn.dataset.mode).classList.add('active');
      bcMode = btn.dataset.mode;
      if (bcMode === 'thang')   bcRenderThangNam(parseInt(yearSel.value));
      if (bcMode === 'chi')     reRenderChi();
      if (bcMode === 'tongket' && tkDates.length) bcRenderTongKet(tkSel.value || tkDates[0]);
    });
  });

  // Render mặc định
  bcRenderThangNam(curYear);
  reRenderChi();
  if (tkDates.length) bcRenderTongKet(tkDates[0]);
}

async function renderBaoCao() {
  bcCachedChiData   = null;
  bcCachedThuData   = null;
  bcCachedTkData    = null;
  bcCachedTkSession = null;
  await initBcTab();
}

