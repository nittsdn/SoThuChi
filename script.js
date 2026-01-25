// --- CẤU HÌNH ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// DỮ LIỆU CỨNG
const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

// BIẾN LƯU TRỮ TẠM (Chỉ lưu số tiền)
let chiStack = [];
let thuStack = [];
let sheetData = [];

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    renderStaticUI();
    setupEvents();
    loadSheetData();
});

// --- 1. GIAO DIỆN & DATA BAN ĐẦU ---
function renderStaticUI() {
    // Checkbox Chi
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => 
        `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');

    // Dropdown
    const html = '<option value="">-- Chọn danh mục --</option>' + 
                 DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = html;
    document.getElementById('thu-dropdown').innerHTML = html;
}

function updateDate() {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
}

// --- 2. XỬ LÝ NÚT CỘNG (+) ---
// Chỉ thêm số tiền vào mảng, không quan tâm mô tả
function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);

    if (val > 0) {
        // Thêm vào mảng tương ứng
        if (type === 'chi') chiStack.push(val);
        else thuStack.push(val);

        // Xóa ô nhập và focus lại
        input.value = "";
        input.focus();
        
        // Cập nhật giao diện
        updateStackDisplay(type);
        checkSubmitState(type);
    }
}

// Hiển thị dãy số: 25 + 50 ...
function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const display = document.getElementById(`${type}-stack-display`);
    
    if (stack.length > 0) {
        // Hiển thị dạng: 25.000 + 50.000
        const text = stack.map(n => n.toLocaleString('vi-VN')).join(' + ');
        display.innerText = `Đang cộng: ${text}`;
        display.style.display = 'block';
    } else {
        display.innerText = "";
        display.style.display = 'none';
    }
}

// --- 3. KIỂM TRA ĐIỀU KIỆN NÚT LƯU ---
function checkSubmitState(type) {
    const btn = document.getElementById(`${type}-submit`);
    const inputVal = parseFloat(document.getElementById(`${type}-amount`).value);
    const stack = type === 'chi' ? chiStack : thuStack;

    // Điều kiện 1: Phải có tiền (trong Stack HOẶC đang nhập trong ô)
    const hasMoney = stack.length > 0 || (inputVal > 0);

    // Điều kiện 2: Phải có mô tả
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

    // Enable nút Lưu nếu đủ 2 điều kiện
    btn.disabled = !(hasMoney && hasDesc);
    if (!btn.disabled) btn.classList.add('active-submit');
    else btn.classList.remove('active-submit');
}

// --- 4. GỬI DỮ LIỆU (SUBMIT) ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const input = document.getElementById(`${type}-amount`);
    
    // 1. GOM TIỀN
    // Lấy stack hiện tại + số trong ô input (nếu quên bấm +)
    let finalStack = type === 'chi' ? [...chiStack] : [...thuStack];
    const currentVal = parseFloat(input.value);
    if (currentVal > 0) finalStack.push(currentVal);

    if (finalStack.length === 0) return;

    // Tính tổng
    const total = finalStack.reduce((a, b) => a + b, 0);
    const totalFull = total * 1000;

    // 2. GOM MÔ TẢ
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

    // 3. CHUẨN BỊ GỬI
    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";
    
    // Tạo Payload đúng chuẩn Script
    // Lưu ý: Truyền new Date() để Script bên kia tự parse
    const today = new Date(); 
    let payloadData = [];

    if (type === 'chi') {
        // Cấu trúc Chi: [STT(0), Mô tả, Tiền(k), Tiền(full), Ngày]
        payloadData = [[0, desc, total, totalFull, today]];
    } else {
        // Cấu trúc Thu: [Tiền(full), Ngày, Nguồn]
        payloadData = [[totalFull, today, desc]];
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Quan trọng
            body: JSON.stringify({ type: type, data: payloadData })
        });

        // 4. THÀNH CÔNG
        const formula = finalStack.join(' + ');
        msg.innerHTML = `✅ <b>${desc}</b><br>${formula} = <b>${total}k</b>`;
        msg.className = "status-msg success";

        // Reset toàn bộ form sau khi lưu
        resetForm(type);

    } catch (e) {
        msg.innerText = "❌ Lỗi kết nối!";
        msg.className = "status-msg error";
    } finally {
        btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU";
        // Check lại state để disable nút
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

// --- 5. SETUP SỰ KIỆN ---
function setupEvents() {
    // Nút Cộng
    document.getElementById('chi-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('chi'); };
    document.getElementById('thu-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('thu'); };

    // Nút Lưu
    document.getElementById('chi-submit').onclick = (e) => { e.preventDefault(); submitData('chi'); };
    document.getElementById('thu-submit').onclick = (e) => { e.preventDefault(); submitData('thu'); };

    // Nút Reset
    document.getElementById('chi-reset').onclick = (e) => { e.preventDefault(); resetForm('chi'); };
    document.getElementById('thu-reset').onclick = (e) => { e.preventDefault(); resetForm('thu'); };

    // Sự kiện nhập liệu để check trạng thái nút Lưu
    const events = ['input', 'change'];
    events.forEach(evt => {
        // Chi inputs
        document.getElementById('chi-amount').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-text').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-dropdown').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-checkboxes').addEventListener(evt, () => checkSubmitState('chi')); // Event delegation tốt hơn click

        // Thu inputs
        document.getElementById('thu-amount').addEventListener(evt, () => checkSubmitState('thu'));
        document.getElementById('thu-text').addEventListener(evt, () => checkSubmitState('thu'));
        document.getElementById('thu-dropdown').addEventListener(evt, () => checkSubmitState('thu'));
    });
}

// --- LOAD DATA SỐ DƯ (GIỮ NGUYÊN) ---
async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        sheetData = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        let thu = 0, chi = 0;
        sheetData.slice(1).forEach(r => {
            const c = r[3] ? parseFloat(r[3].replace(/[\."]/g, '')) : 0;
            const t = r[9] ? parseFloat(r[9].replace(/[\."]/g, '')) : 0;
            chi += c; thu += t;
        });
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        
        // Cập nhật dropdown từ lịch sử (nếu cần)
    } catch (e) {
        document.getElementById('balance').innerText = "Offline";
    }
}