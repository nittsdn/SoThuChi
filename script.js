const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

const QUICK_DESC = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc', 'Xăng xe', 'Cafe'];
const DEFAULT_DROPDOWN = ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'];

let chiStack = [], thuStack = [];

// Hàm làm mới ứng dụng
function forceUpdate() {
    if (confirm("Làm mới ứng dụng và xóa cache?")) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (let r of regs) r.unregister();
            });
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

// --- LOAD DATA ---
async function loadSheetData() {
    try {
        const res = await fetch(CSV_URL + '?t=' + Date.now());
        const text = await res.text();
        const rows = text
            .split(/\r?\n/)
            .map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));

        let thu = 0, chi = 0;
        let lastChiStr = "Chưa có dữ liệu";

        if (rows.length > 1) {
            // Tổng thu / chi (GIỮ NGUYÊN)
            rows.slice(1).forEach(r => {
                const chiFull = r[3] ? parseFloat(r[3].replace(/[\."]/g, '')) : 0;
                const thuFull = r[9] ? parseFloat(r[9].replace(/[\."]/g, '')) : 0;
                chi += chiFull || 0;
                thu += thuFull || 0;
            });

            // ==== LẤY CHI TIÊU CUỐI (ĐÃ FIX) ====
            for (let i = rows.length - 1; i > 0; i--) {
                const r = rows[i];

                const kVal = parseFloat((r[2] || '').replace(/"/g, ''));
                if (!kVal || kVal <= 0) continue;

                const desc = (r[1] || '').replace(/"/g, '').trim();
                const dateObj = new Date(r[4]);
                if (isNaN(dateObj)) continue;

                const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
                const dateLabel =
                    `${days[dateObj.getDay()]} ngày ` +
                    `${String(dateObj.getDate()).padStart(2, '0')}.` +
                    `${String(dateObj.getMonth() + 1).padStart(2, '0')}.` +
                    `${dateObj.getFullYear()}`;

                const detail = (r[3] || '').replace(/"/g, '').trim();
                let moneyStr = '';

                // có nhiều khoản cộng
                if (detail.includes('+')) {
                    const parts = detail
                        .split('+')
                        .map(v => parseFloat(v))
                        .filter(v => !isNaN(v));

                    if (parts.length > 1) {
                        const partStr = parts
                            .map(v => (v * 1000).toLocaleString('vi-VN'))
                            .join(' + ');
                        const totalStr = (kVal * 1000).toLocaleString('vi-VN');
                        moneyStr = `${partStr} = ${totalStr} vnđ`;
                    }
                }

                // fallback: chỉ 1 số
                if (!moneyStr) {
                    moneyStr = `${(kVal * 1000).toLocaleString('vi-VN')} vnđ`;
                }

                lastChiStr = `Chi tiêu cuối ${desc} ${dateLabel}: ${moneyStr}`;
                break;
            }
        }

        document.getElementById('balance').innerText =
            (thu - chi).toLocaleString('vi-VN') + ' đ';
        document.getElementById('last-trans').innerText = lastChiStr;

    } catch (e) {
        console.error(e);
    }
}

// --- UI + SUBMIT (GIỮ NGUYÊN) ---
function renderStaticUI() {
    document.getElementById('chi-checkboxes').innerHTML =
        QUICK_DESC.map(d => `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`).join('');
    const opt =
        '<option value="">-- Danh mục --</option>' +
        DEFAULT_DROPDOWN.map(d => `<option value="${d}">${d}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = opt;
    document.getElementById('thu-dropdown').innerHTML = opt;
}

function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (val > 0) {
        (type === 'chi' ? chiStack : thuStack).push(val);
        input.value = "";
        updateStackDisplay(type);
        checkSubmitState(type);
        input.focus();
    }
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const disp = document.getElementById(`${type}-stack-display`);
    if (stack.length === 0) {
        disp.style.display = 'none';
        return;
    }
    disp.innerText = `Đang cộng: ${stack.join(' + ')}`;
    disp.style.display = 'block';
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
        desc = [...checks, document.getElementById('chi-dropdown').value, document.getElementById('chi-text').value]
            .filter(x => x)
            .join(', ');
    } else {
        desc = [document.getElementById('thu-dropdown').value, document.getElementById('thu-text').value]
            .filter(x => x)
            .join(', ');
    }

    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";

    try {
        const formulaK = stack.length > 1 ? `=${stack.join('+')}` : total;
        const formulaFull = stack.length > 1 ? `=(${stack.join('+')})*1000` : totalFull;
        const payload = type === 'chi'
            ? [[0, desc, formulaK, formulaFull, dateVal]]
            : [[formulaFull, dateVal, desc]];

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
    if (type === 'chi') chiStack = [];
    else thuStack = [];
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
