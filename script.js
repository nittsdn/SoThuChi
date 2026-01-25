// --- CẤU HÌNH ---
// ✅ Đã cập nhật Link CSV mới của bạn:
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';

// Link Google Apps Script (Giữ nguyên)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// DỮ LIỆU CỨNG (Mô tả nhanh)
const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

// BIẾN LƯU TRỮ TẠM (STACK)
let chiStack = [];
let thuStack = [];
let sheetData = [];

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    renderStaticUI();
    setupEvents();
    loadSheetData(); // Load số dư
});

// --- 1. GIAO DIỆN & DATA BAN ĐẦU ---
function renderStaticUI() {
    // Checkbox Chi
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => 
        `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');

    // Dropdown (Dùng chung cho Thu/Chi)
    const html = '<option value="">-- Chọn danh mục --</option>' + 
                 DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = html;
    document.getElementById('thu-dropdown').innerHTML = html;
}

function updateDate() {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
}

// --- 2. XỬ LÝ NÚT CỘNG (+) ---
// Chỉ gom tiền vào Stack, chưa gửi đi
function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);

    if (val > 0) {
        // Thêm vào mảng tạm
        if (type === 'chi') chiStack.push(val);
        else thuStack.push(val);

        // Xóa ô nhập, focus lại để nhập tiếp
        input.value = "";
        input.focus();
        
        // Cập nhật giao diện
        updateStackDisplay(type);
        checkSubmitState(type);
    }
}

// Hiển thị dãy số: "25.000 + 50.000"
function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const display = document.getElementById(`${type}-stack-display`);
    
    if (stack.length > 0) {
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

    // Điều kiện 1: Có tiền (trong Stack HOẶC đang nhập dở trong ô)
    const hasMoney = stack.length > 0 || (inputVal > 0);

    // Điều kiện 2: Có mô tả
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

    // Bật/Tắt nút Lưu
    btn.disabled = !(hasMoney && hasDesc);
    if (!btn.disabled) btn.classList.add('active-submit');
    else btn.classList.remove('active-submit');
}

// --- 4. GỬI DỮ LIỆU (SUBMIT) ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const input = document.getElementById(`${type}-amount`);
    
    // A. CHỐT TIỀN (Gom Stack + Số đang nhập dở)
    let finalStack = type === 'chi' ? [...chiStack] : [...thuStack];
    const currentVal = parseFloat(input.value);
    if (currentVal > 0) finalStack.push(currentVal);

    if (finalStack.length === 0) return; // An toàn

    const total = finalStack.reduce((a, b) => a + b, 0);
    const totalFull = total * 1000;

    // B. CHỐT MÔ TẢ
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

    // C. GỬI ĐI
    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";
    
    // Chuẩn bị dữ liệu gửi (Truyền Date object để Google Sheet tự format)
    const today = new Date(); 
    let payloadData = [];

    if (type === 'chi') {
        // Cấu trúc Chi: [STT, Mô tả, Tiền(k), Tiền(full), Ngày]
        // STT để 0, Script sẽ tự tính
        payloadData = [[0, desc, total, totalFull, today]];
    } else {
        // Cấu trúc Thu: [Tiền(full), Ngày, Nguồn]
        // Đúng thứ tự cột J, K, L
        payloadData = [[totalFull, today, desc]];
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Bắt buộc
            body: JSON.stringify({ type: type, data: payloadData })
        });

        // D. THÔNG BÁO THÀNH CÔNG
        const formula = finalStack.join(' + ');
        msg.innerHTML = `✅ <b>${desc}</b><br>${formula} = <b>${total}k</b>`;
        msg.className = "status-msg success";

        // E. RESET FORM
        resetForm(type);
        
        // Load lại số dư sau 2s
        setTimeout(() => { loadSheetData(); }, 2000);

    } catch (e) {
        msg.innerText = "❌ Lỗi kết nối!";
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

// --- 5. SETUP SỰ KIỆN ---
function setupEvents() {
    // Nút Cộng
    document.getElementById('chi-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('chi'); };
    document.getElementById('thu-btn-plus').onclick = (e) => { e.preventDefault(); handlePlus('thu'); };

    // Nút Lưu
    document.getElementById('chi-submit').onclick = (e) => { e.preventDefault(); submitData('chi'); };
    document.getElementById('thu-submit').onclick = (e) => { e.preventDefault(); submitData('thu'); };

    // Nút Xóa Hết
    document.getElementById('chi-reset').onclick = (e) => { e.preventDefault(); resetForm('chi'); };
    document.getElementById('thu-reset').onclick = (e) => { e.preventDefault(); resetForm('thu'); };

    // Sự kiện nhập liệu (để bật/tắt nút Lưu)
    const events = ['input', 'change'];
    events.forEach(evt => {
        // Chi
        document.getElementById('chi-amount').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-text').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-dropdown').addEventListener(evt, () => checkSubmitState('chi'));
        document.getElementById('chi-checkboxes').addEventListener(evt, () => checkSubmitState('chi'));

        // Thu
        document.getElementById('thu-amount').addEventListener(evt, () => checkSubmitState('thu'));
        document.getElementById('thu-text').addEventListener(evt, () => checkSubmitState('thu'));
        document.getElementById('thu-dropdown').addEventListener(evt, () => checkSubmitState('thu'));
    });
}

// --- LOAD DATA SỐ DƯ (Đã tối ưu hóa lỗi Permission) ---
async function loadSheetData() {
    const balanceEl = document.getElementById('balance');
    try {
        // cache: "no-store" để luôn lấy dữ liệu mới nhất
        const res = await fetch(CSV_URL, { cache: "no-store" });
        
        if (!res.ok) throw new Error("Lỗi tải CSV");
        const text = await res.text();

        // Kiểm tra nếu bị Google chặn trả về trang HTML Login
        if (text.includes("<!DOCTYPE html>")) throw new Error("Cần quyền Public Sheet");

        sheetData = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        let thu = 0, chi = 0;
        if (sheetData.length > 1) {
            sheetData.slice(1).forEach(r => {
                const cVal = r[3] ? r[3].replace(/[\."]/g, '') : "0"; // Cột D (Chi Full)
                const tVal = r[9] ? r[9].replace(/[\."]/g, '') : "0"; // Cột J (Thu Full)
                chi += parseFloat(cVal) || 0;
                thu += parseFloat(tVal) || 0;
            });
        }
        balanceEl.innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        
    } catch (e) {
        console.error(e);
        balanceEl.innerText = "Offline";
    }
}