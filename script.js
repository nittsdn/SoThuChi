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
    ['chi', 'thu'].forEach(type => {
        const input = document.getElementById(`${type}-date`);
        input.value = today;
        updateDateText(type, today);
    });
}

function updateDateText(type, dateStr) {
    const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const d = new Date(dateStr);
    const parts = dateStr.split('-');
    const label = `${days[d.getDay()]} ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    document.getElementById(`${type}-date-text`).innerText = label;
}

function handleDateChange(type) {
    const val = document.getElementById(`${type}-date`).value;
    updateDateText(type, val);
}

function changeDate(type, delta) {
    const input = document.getElementById(`${type}-date`);
    const d = new Date(input.value);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split('T')[0];
    input.value = newDate;
    updateDateText(type, newDate);
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
        if (type === 'chi') chiStack.push(val); else thuStack.push(val);
        input.value = ""; 
        updateStackDisplay(type);
        checkSubmitState(type);
        input.focus();
    }
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const currentInput = parseFloat(document.getElementById(`${type}-amount`).value) || 0;
    const disp = document.getElementById(`${type}-stack-display`);
    
    if (stack.length === 0 && currentInput === 0) {
        disp.style.display = 'none';
        return;
    }

    const total = stack.reduce((a, b) => a + b, 0) + currentInput;
    let text = "";
    if (stack.length > 0) {
        text = `Đang cộng: ${stack.join(' + ')}${currentInput > 0 ? ' + ' + currentInput : ''} = ${total}k`;
    } else {
        text = `Đang nhập: ${currentInput}k`;
    }
    
    disp.innerText = text;
    disp.style.display = 'block';
}

function checkSubmitState(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const currentInput = parseFloat(document.getElementById(`${type}-amount`).value) || 0;
    document.getElementById(`${type}-submit`).disabled = (stack.length === 0 && currentInput === 0);
}

async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    const amountInput = document.getElementById(`${type}-amount`);
    const dateVal = document.getElementById(`${type}-date`).value;
    
    let stack = type === 'chi' ? [...chiStack] : [...thuStack];
    const currentVal = parseFloat(amountInput.value);
    if (currentVal > 0) stack.push(currentVal);
    
    const totalK = stack.reduce((a, b) => a + b, 0);
    
    let descParts = [];
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        descParts = [...checks, document.getElementById('chi-dropdown').value, document.getElementById('chi-text').value];
    } else {
        descParts = [document.getElementById('thu-dropdown').value, document.getElementById('thu-text').value];
    }
    const finalDesc = descParts.filter(x => x).join(', ');

    btn.disabled = true;
    btn.innerText = "ĐANG LƯU...";

    try {
        const formulaFull = stack.length > 1 ? `=(${stack.join('+')})*1000` : totalK * 1000;
        const payload = type === 'chi' ? [[0, finalDesc, totalK, formulaFull, dateVal]] : [[formulaFull, dateVal, finalDesc]];
        
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ type, data: payload })
        });
        const result = await res.json();
        
        if (result.status === 'success') {
            const moneyLine = stack.map(v => (v * 1000).toLocaleString('vi-VN')).join(' + ');
            const totalStr = (totalK * 1000).toLocaleString('vi-VN');
            const dateText = document.getElementById(`${type}-date-text`).innerText;

            msg.innerHTML = `✅ Đã lưu thành công ${type === 'chi' ? 'chi tiêu' : 'thu nhập'}:<br><b>${finalDesc ? finalDesc + ': ' : ''}${moneyLine}${stack.length > 1 ? ' = ' + totalStr : ''}</b><br><small>${dateText}</small>`;
            msg.className = "status-msg success";
            
            resetForm(type);
            setTimeout(loadSheetData, 2000);
        }
    } catch (e) {
        msg.innerText = "❌ Lỗi kết nối: " + e.message;
        msg.className = "status-msg error";
        btn.disabled = false;
    } finally {
        btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU";
    }
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

function setupEvents() {
    ['chi', 'thu'].forEach(type => {
        const input = document.getElementById(`${type}-amount`);
        input.oninput = () => {
            updateStackDisplay(type);
            checkSubmitState(type);
        };
        document.getElementById(`${type}-btn-plus`).onclick = () => handlePlus(type);
        document.getElementById(`${type}-submit`).onclick = () => submitData(type);
    });
}

async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        const rows = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        let total = 0;
        if (rows.length > 1) {
            rows.slice(1).forEach(r => {
                const chi = parseFloat(r[3]?.replace(/[\."]/g, '')) || 0;
                const thu = parseFloat(r[9]?.replace(/[\."]/g, '')) || 0;
                total += (thu - chi);
            });
        }
        document.getElementById('balance').innerText = total.toLocaleString('vi-VN') + ' đ';
    } catch (e) { console.log("Load balance error"); }
}