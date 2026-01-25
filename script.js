// --- CẤU HÌNH ---
// 1. Link CSV (để xem số dư)
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';

// 2. Link Script (để lưu dữ liệu - LINK BẠN CUNG CẤP)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// DỮ LIỆU CỐ ĐỊNH
const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

let chiStack = [];
let thuStack = [];

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    renderStaticUI();
    setupEvents();
    loadSheetData(); 
});

// --- 1. LOAD DATA ---
async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const rows = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        let thu = 0, chi = 0;
        if (rows.length > 1) {
            rows.slice(1).forEach(r => {
                const cVal = r[3] ? r[3].replace(/[\."]/g, '') : "0"; 
                const tVal = r[9] ? r[9].replace(/[\."]/g, '') : "0"; 
                chi += parseFloat(cVal) || 0;
                thu += parseFloat(tVal) || 0;
            });
        }
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
    } catch (e) {
        document.getElementById('balance').innerText = "Offline";
    }
}

// --- 2. GIAO DIỆN ---
function renderStaticUI() {
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => 
        `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');
    
    const html = '<option value="">-- Chọn danh mục --</option>' + 
                 DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = html;
    document.getElementById('thu-dropdown').innerHTML = html;
}

function updateDate() {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
}

// --- 3. XỬ LÝ CỘNG DỒN ---
function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (val > 0) {
        type === 'chi' ? chiStack.push(val) : thuStack.push(val);
        input.value = "";
        input.focus();
        updateStackDisplay(type);
        checkSubmitState(type);
    }
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const display = document.getElementById(`${type}-stack-display`);
    if (stack.length > 0) {
        display.innerText = `Đang cộng: ${stack.map(n => n.toLocaleString('vi-VN')).join(' + ')}`;
        display.style.display = 'block';
    } else {
        display.innerText = "";
        display.style.display = 'none';
    }
}

function checkSubmitState(type) {
    const btn = document.getElementById(`${type}-submit`);
    const inputVal = parseFloat(document.getElementById(`${type}-amount`).value);
    const stack = type === 'chi' ? chiStack : thuStack;
    const hasMoney = stack.length > 0 || (inputVal > 0);
    
    let hasDesc = false;
    if (type === 'chi') {
        const checked = document.querySelectorAll('#chi-checkboxes input:checked').length > 0;
        const drop = document.getElementById('chi-dropdown').value !== "";
        const text = document.getElementById('chi-text').value.trim() !== "";
        hasDesc = checked || drop || text;
    } else {
        const drop = document.getElementById('thu-dropdown').value !== "";
        const text = document.getElementById('thu-text').value.trim() !== "";
        hasDesc = drop || text;
    }
    
    btn.disabled = !(hasMoney && hasDesc);
    btn.classList.toggle('active-submit', !btn.disabled);
}

// --- 4. GỬI DỮ LIỆU ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const input = document.getElementById(`${type}-amount`);
    
    // Gom tiền
    let finalStack = type === 'chi' ? [...chiStack] : [...thuStack];
    const currentVal = parseFloat(input.value);
    if (currentVal > 0) finalStack.push(currentVal);
    
    if (finalStack.length === 0) return;

    const total = finalStack.reduce((a, b) => a + b, 0);
    const totalFull = total * 1000;

    // Gom mô tả
    let desc = "";
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const drop = document.getElementById('chi-dropdown').value;
        const text = document.getElementById('chi-text').value;
        desc = [...checks, drop, text].filter(x => x).join(', ');
    } else {
        const drop = document.getElementById('thu-dropdown').value;
        const text = document.getElementById('thu-text').value;
        desc = [drop, text].filter(x => x).join(', ');
    }

    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";
    
    const today = new Date(); 
    let payloadData = [];

    // CẤU TRÚC GỬI (KHỚP VỚI BACKEND)
    if (type === 'chi') {
        // [STT, Mô tả, Tiền(k), Tiền(full), Ngày]
        payloadData = [[0, desc, total, totalFull, today]];
    } else {
        // [Tiền(full), Ngày, Nguồn]
        payloadData = [[totalFull, today, desc]];
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            // Dùng text/plain để tránh lỗi CORS
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ type: type, data: payloadData })
        });

        const result = await response.json(); 

        if (result.status === 'success') {
            msg.innerHTML = `✅ <b>${desc}</b><br>Đã lưu: <b>${total}k</b>`;
            msg.className = "status-msg success";
            resetForm(type);
            setTimeout(() => { loadSheetData(); }, 2000); 
        } else {
            throw new Error(result.msg);
        }

    } catch (e) {
        msg.innerText = "❌ Lỗi: " + e.message;
        msg.className = "status-msg error";
    } finally {
        btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU";
        checkSubmitState(type);
    }
}

function resetForm(type) {
    if (type === 'chi') {
        chiStack = [];
        document.querySelectorAll('#chi-checkboxes input').forEach(c => c.checked = false);
        document.getElementById('chi-dropdown').value = "";
        document.getElementById('chi-text').value = "";
    } else {
        thuStack = [];
        document.getElementById('thu-dropdown').value = "";
        document.getElementById('thu-text').value = "";
    }
    document.getElementById(`${type}-amount`).value = "";
    updateStackDisplay(type);
}

// --- 5. SỰ KIỆN ---
function setupEvents() {
    document.getElementById('chi-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('chi'); };
    document.getElementById('thu-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('thu'); };
    document.getElementById('chi-submit').onclick = (e) => { e.preventDefault(); submitData('chi'); };
    document.getElementById('thu-submit').onclick = (e) => { e.preventDefault(); submitData('thu'); };
    document.getElementById('chi-reset').onclick = (e) => { e.preventDefault(); resetForm('chi'); };
    document.getElementById('thu-reset').onclick = (e) => { e.preventDefault(); resetForm('thu'); };

    const events = ['input', 'change'];
    events.forEach(evt => {
        ['chi', 'thu'].forEach(type => {
            document.getElementById(`${type}-amount`).addEventListener(evt, () => checkSubmitState(type));
            document.getElementById(`${type}-text`).addEventListener(evt, () => checkSubmitState(type));
            document.getElementById(`${type}-dropdown`).addEventListener(evt, () => checkSubmitState(type));
        });
        document.getElementById('chi-checkboxes').addEventListener(evt, () => checkSubmitState('chi'));
    });
}