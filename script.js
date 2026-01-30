const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

let chiStack = [], thuStack = [];

document.addEventListener('DOMContentLoaded', () => {
    initDates();
    renderStaticUI();
    setupEvents();
    loadSheetData();
});

function initDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('chi-date').value = today;
    document.getElementById('thu-date').value = today;
}

function handleBackDate(type) {
    const input = document.getElementById(`${type}-date`);
    const d = new Date(input.value);
    d.setDate(d.getDate() - 1);
    input.value = d.toISOString().split('T')[0];
}

async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const rows = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        let thu = 0, chi = 0, lastChi = "Chưa có dữ liệu";

        if (rows.length > 1) {
            rows.slice(1).forEach(r => {
                const cVal = r[3] ? r[3].replace(/[\."]/g, '') : "0";
                const tVal = r[9] ? r[9].replace(/[\."]/g, '') : "0";
                chi += parseFloat(cVal) || 0; thu += parseFloat(tVal) || 0;
            });
            // Lấy dòng chi cuối
            for (let i = rows.length - 1; i > 0; i--) {
                const money = rows[i][3] ? parseFloat(rows[i][3].replace(/[\."]/g, '')) : 0;
                if (money > 0) {
                    lastChi = `Ghi nhận chi cuối: ${money.toLocaleString()} đ ngày ${rows[i][4].replace(/"/g, '')}`;
                    break;
                }
            }
        }
        document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
        document.getElementById('last-trans').innerText = lastChi;
    } catch (e) { console.error(e); }
}

function renderStaticUI() {
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`).join('');
    const opt = '<option value="">-- Chọn danh mục --</option>' + DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = opt;
    document.getElementById('thu-dropdown').innerHTML = opt;
}

function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (val > 0) {
        (type === 'chi' ? chiStack : thuStack).push(val);
        input.value = ""; input.focus();
        updateStackDisplay(type);
        checkSubmitState(type);
    }
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const disp = document.getElementById(`${type}-stack-display`);
    disp.innerText = stack.length > 0 ? `Đang cộng: ${stack.join(' + ')}` : "";
    disp.style.display = stack.length > 0 ? 'block' : 'none';
}

function checkSubmitState(type) {
    const inputVal = parseFloat(document.getElementById(`${type}-amount`).value);
    const hasMoney = (type === 'chi' ? chiStack : thuStack).length > 0 || inputVal > 0;
    document.getElementById(`${type}-submit`).disabled = !hasMoney;
}

async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const amountInput = document.getElementById(`${type}-amount`);
    const dateVal = document.getElementById(`${type}-date`).value;
    
    let stack = type === 'chi' ? [...chiStack] : [...thuStack];
    if (parseFloat(amountInput.value) > 0) stack.push(parseFloat(amountInput.value));
    
    const total = stack.reduce((a, b) => a + b, 0);
    const totalFull = total * 1000;
    
    let desc = "";
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        desc = [...checks, document.getElementById('chi-dropdown').value, document.getElementById('chi-text').value].filter(x => x).join(', ');
    } else {
        desc = [document.getElementById('thu-dropdown').value, document.getElementById('thu-text').value].filter(x => x).join(', ');
    }

    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";

    try {
        const formulaK = stack.length > 1 ? `=${stack.join('+')}` : total;
        const formulaFull = stack.length > 1 ? `=(${stack.join('+')})*1000` : totalFull;
        
        const payload = type === 'chi' ? [[0, desc, formulaK, formulaFull, dateVal]] : [[formulaFull, dateVal, desc]];
        
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ type, data: payload })
        });
        const result = await res.json();
        if (result.status === 'success') {
            msg.innerHTML = `✅ Đã lưu: ${total}k`;
            msg.className = "status-msg success";
            resetForm(type);
            setTimeout(loadSheetData, 2000);
            setTimeout(() => { msg.className = "status-msg"; }, 3000);
        }
    } catch (e) {
        msg.innerText = "❌ Lỗi: " + e.message;
        msg.className = "status-msg error";
    } finally {
        btn.disabled = false;
        btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU";
    }
}

function resetForm(type) {
    if (type === 'chi') chiStack = []; else thuStack = [];
    document.getElementById(`${type}-amount`).value = "";
    updateStackDisplay(type);
    initDates();
}

function setupEvents() {
    document.getElementById('chi-btn-plus').onclick = () => handlePlus('chi');
    document.getElementById('thu-btn-plus').onclick = () => handlePlus('thu');
    document.getElementById('chi-submit').onclick = () => submitData('chi');
    document.getElementById('thu-submit').onclick = () => submitData('thu');
}