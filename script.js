const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

let chiStack = [], thuStack = [];

// Hàm làm mới ứng dụng (tích hợp vào nút thùng rác)
function forceUpdate() {
    if (confirm("Làm mới ứng dụng và xóa cache?")) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.unregister(); });
        }
        window.location.reload(true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDates();
    renderStaticUI();
    setupEvents();
    loadSheetData();
});

// --- LOGIC UI NGÀY THÁNG ---
function initDates() {
    const today = new Date().toISOString().split('T')[0];
    ['chi', 'thu'].forEach(type => {
        const input = document.getElementById(`${type}-date`);
        input.value = today;
        updateDateText(type, today);
    });
}

function updateDateText(type, dateStr) {
    const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
    const d = new Date(dateStr);
    const p = dateStr.split('-');
    const fullLabel = `${days[d.getDay()]} ngày ${p[2]}.${p[1]}.${p[0]}`;
    document.getElementById(`${type}-date-text`).innerText = fullLabel;
}

function handleDateChange(type) {
    const input = document.getElementById(`${type}-date`);
    updateDateText(type, input.value);
    input.blur();
}

function changeDate(type, delta) {
    const input = document.getElementById(`${type}-date`);
    const d = new Date(input.value);
    d.setDate(d.getDate() + delta);
    const newVal = d.toISOString().split('T')[0];
    input.value = newVal;
    updateDateText(type, newVal);
}

// --- LOGIC NHẬP LIỆU ---
function renderStaticUI() {
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`).join('');
    const opt = '<option value="">-- Danh mục --</option>' + DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = opt;
    document.getElementById('thu-dropdown').innerHTML = opt;
}

function setupEvents() {
    ['chi', 'thu'].forEach(type => {
        const input = document.getElementById(`${type}-amount`);
        input.oninput = () => { updateStackDisplay(type); checkSubmitState(type); };
        document.getElementById(`${type}-btn-plus`).onclick = () => {
            const val = parseFloat(input.value);
            if (val > 0) {
                (type === 'chi' ? chiStack : thuStack).push(val);
                input.value = ""; updateStackDisplay(type); checkSubmitState(type); input.focus();
            }
        };
        document.getElementById(`${type}-submit`).onclick = () => submitData(type);
    });
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const current = parseFloat(document.getElementById(`${type}-amount`).value) || 0;
    const disp = document.getElementById(`${type}-stack-display`);
    if (stack.length === 0 && current === 0) { disp.style.display = 'none'; return; }
    const total = stack.reduce((a, b) => a + b, 0) + current;
    disp.innerText = stack.length > 0 ? `Đang cộng: ${stack.join(' + ')}${current > 0 ? ' + '+current : ''} = ${total}k` : `Đang nhập: ${current}k`;
    disp.style.display = 'block';
}

function checkSubmitState(type) {
    const hasData = (type === 'chi' ? chiStack : thuStack).length > 0 || (parseFloat(document.getElementById(`${type}-amount`).value) > 0);
    document.getElementById(`${type}-submit`).disabled = !hasData;
}

// --- HÀM TẢI DỮ LIỆU ĐÃ FIX LỖI LOGIC & IPHONE ---
async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL + '?t=' + Date.now());
        const text = await res.text();
        
        // Tách dòng an toàn cho cả Win/Linux/Mac/iOS
        const rows = text.split(/\r\n|\n/).map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        let thu = 0, chi = 0, lastChiStr = "Chưa có dữ liệu";

        if (rows.length > 1) {
            // 1. TÍNH SỐ DƯ
            rows.slice(1).forEach(r => {
                if (r.length < 3) return;
                // Dùng Cột C (Index 2) cho Chi: Chứa số thuần túy 55
                const cK = r[2] ? r[2].replace(/[",\.]/g, '') : "0";
                // Cột J (Index 9) cho Thu
                const tVal = r[9] ? r[9].replace(/[",\.]/g, '') : "0"; 
                
                chi += (parseFloat(cK) || 0) * 1000; 
                thu += parseFloat(tVal) || 0;
            });

            // 2. TÌM CHI TIÊU CUỐI (Duyệt từ dưới lên)
            for (let i = rows.length - 1; i > 0; i--) {
                const r = rows[i];
                if (r.length < 3) continue;

                // QUAN TRỌNG: Check Cột C (Index 2) chứa "55" -> Là SỐ
                const rawK = r[2] ? r[2].replace(/[",\.]/g, '') : "0";
                const moneyK = parseFloat(rawK);

                if (moneyK > 0) {
                    const desc = r[1] ? r[1].replace(/"/g, '') : "Không tên"; // Cột B
                    const dateRaw = r[4] ? r[4].replace(/"/g, '') : "";       // Cột E (Ngày)
                    const formulaRaw = r[3] ? r[3] : "";                      // Cột D (Công thức)

                    // Hiển thị chi tiết từ công thức nếu có
                    let detailStr = moneyK + "k";
                    if (formulaRaw && formulaRaw.includes("=(")) {
                         const match = formulaRaw.match(/\=\((.*?)\)/);
                         if (match && match[1]) {
                             detailStr = match[1].replace(/\+/g, ' + ') + " = " + moneyK + "k";
                         }
                    }

                    const dateDisplay = formatVNDateFromDB(dateRaw);
                    lastChiStr = `Chi tiêu cuối: ${desc} tổng ${detailStr} ${dateDisplay}`;
                    break; 
                }
            }
        }
        
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        document.getElementById('last-trans').innerText = lastChiStr;
        
    } catch (e) { 
        console.error(e); 
        document.getElementById('last-trans').innerText = "Lỗi đọc dữ liệu";
    }
}

// Hàm format ngày (giữ lại vì code cũ hiển thị xấu)
function formatVNDateFromDB(dateStr) {
    if (!dateStr) return "";
    if (dateStr.toLowerCase().includes('thứ') || dateStr.toLowerCase().includes('thu')) return dateStr;
    
    let d = new Date(dateStr);
    if (isNaN(d.getTime()) && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (isNaN(d.getTime())) return dateStr;

    const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return `${days[d.getDay()]} ngày ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

// --- HÀM GỬI DỮ LIỆU ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const amountInput = document.getElementById(`${type}-amount`);
    const dateVal = document.getElementById(`${type}-date`).value;
    
    let stack = type === 'chi' ? [...chiStack] : [...thuStack];
    if (parseFloat(amountInput.value) > 0) stack.push(parseFloat(amountInput.value));
    
    const totalK = stack.reduce((a, b) => a + b, 0);
    let desc = "";
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        desc = [...checks, document.getElementById('chi-dropdown').value, document.getElementById('chi-text').value].filter(x=>x).join(', ');
    } else {
        desc = [document.getElementById('thu-dropdown').value, document.getElementById('thu-text').value].filter(x=>x).join(', ');
    }

    btn.disabled = true; btn.innerText = "ĐANG LƯU...";
    try {
        const formulaFull = stack.length > 1 ? `=(${stack.join('+')})*1000` : totalK * 1000;
        const payload = type === 'chi' ? [[0, desc, totalK, formulaFull, dateVal]] : [[formulaFull, dateVal, desc]];
        
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ type, data: payload }) });
        const result = await res.json();
        
        if (result.status === 'success') {
            const moneyLine = stack.map(v => (v * 1000).toLocaleString('vi-VN')).join(' + ');
            const dateDisplay = document.getElementById(`${type}-date-text`).innerText;
            msg.innerHTML = `✅ Đã lưu: ${desc ? desc + ': ' : ''}${moneyLine}${stack.length > 1 ? ' = ' + (totalK*1000).toLocaleString('vi-VN') : ''} đ<br><small>${dateDisplay}</small>`;
            msg.className = "status-msg success";
            resetForm(type);
            setTimeout(loadSheetData, 2000);
        }
    } catch (e) { msg.innerText = "❌ Lỗi: " + e.message; msg.className = "status-msg error"; btn.disabled = false; }
    finally { btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU"; }
}

function resetForm(type) {
    if (type === 'chi') chiStack = []; else thuStack = [];
    document.getElementById(`${type}-amount`).value = "";
    document.getElementById(`${type}-submit`).disabled = true;
    if (type === 'chi') {
        document.querySelectorAll('#chi-checkboxes input').forEach(cb => cb.checked = false);
        document.getElementById('chi-dropdown').selectedIndex = 0;
        document.getElementById('chi-text').value = "";
    } else {
        document.getElementById('thu-dropdown').selectedIndex = 0;
        document.getElementById('thu-text').value = "";
    }
    updateStackDisplay(type);
}