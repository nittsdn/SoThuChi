/*
  VERSION: v1.2.1 (GAS API + Keep Old UI)
  BUILD: 2026-02-03
*/

const APP_VERSION = 'v1.2.1';
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

const QUICK_DESC = ['Ăn sáng', 'Ăn chiều', 'Ăn lễ', 'Ăn chơi với bạn bè', 'Đi chợ', 'Đi chợ tết', 'Siêu thị', 'Điện nhà', 'Điện mẹ', 'Điện nhà trọ'];

let chiStack = [], thuStack = [];
let chiDate = new Date();
let thuDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 APP ${APP_VERSION}`);
    initDates();
    renderStaticUI();
    setupEvents();
    loadSheetData();
});

function initDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('chi-date').value = today;
    document.getElementById('thu-date').value = today;
    chiDate = new Date(today);
    thuDate = new Date(today);
}

function handleBackDate(type) {
    const input = document.getElementById(`${type}-date`);
    const d = new Date(input.value);
    d.setDate(d.getDate() - 1);
    input.value = d.toISOString().split('T')[0];
    
    if (type === 'chi') {
        chiDate = new Date(input.value);
    } else {
        thuDate = new Date(input.value);
    }
}

async function loadSheetData() {
    try {
        // Load last chi
        const resChiSheet = await fetch(`${GAS_ENDPOINT}?sheet=Chi_Tieu_2026`);
        const jsonChi = await resChiSheet.json();
        
        if (jsonChi.status === 'success' && jsonChi.data.length > 0) {
            const rows = jsonChi.data;
            
            // Find last valid chi
            for (let i = rows.length - 1; i >= 0; i--) {
                const vnd = parseFloat(rows[i]['Số tiền vnđ']) || 0;
                if (vnd > 0) {
                    const moTa = rows[i].mo_ta_chi || '';
                    const ngay = rows[i]['Ngày'] || '';
                    const soDu = parseFloat(rows[i]['Số dư lý thuyết']) || 0;
                    
                    document.getElementById('last-trans').innerText = 
                        `Chi cuối: ${moTa} - ${formatDateShort(ngay)} - ${vnd.toLocaleString()} đ (Số dư: ${soDu.toLocaleString()} đ)`;
                    break;
                }
            }
        }
        
        // Load nguồn tiền for dropdowns
        const resNguon = await fetch(`${GAS_ENDPOINT}?sheet=nguon_tien`);
        const jsonNguon = await resNguon.json();
        
        if (jsonNguon.status === 'success') {
            const nguonList = jsonNguon.data.filter(row => row.active === true);
            const optionsHTML = '<option value="">-- Chọn nguồn tiền --</option>' + 
                nguonList.map(n => `<option value="${n.nguon_tien}">${n.nguon_tien}</option>`).join('');
            
            // Không có select nguồn tiền trong code cũ, bỏ qua
        }
        
        // Load loai_chi for dropdown
        const resLoaiChi = await fetch(`${GAS_ENDPOINT}?sheet=loai_chi`);
        const jsonLoaiChi = await resLoaiChi.json();
        
        if (jsonLoaiChi.status === 'success') {
            const loaiChiList = jsonLoaiChi.data.filter(row => row.active === true);
            const dropdown = document.getElementById('chi-dropdown');
            dropdown.innerHTML = '<option value="">-- Chọn danh mục --</option>' + 
                loaiChiList.map(item => `<option value="${item.mo_ta_chi}">${item.mo_ta_chi}</option>`).join('');
        }
        
        console.log('✅ Data loaded');
    } catch (e) {
        console.error('❌ Load failed:', e);
        document.getElementById('last-trans').innerText = 'Lỗi tải dữ liệu';
    }
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderStaticUI() {
    document.getElementById('chi-checkboxes').innerHTML = QUICK_DESC.map(d => 
        `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');
    
    const thuOpt = '<option value="">-- Chọn danh mục --</option>' + 
        ['Lương', 'Thưởng', 'Lãi Tech', 'Lãi HD', 'Ba mẹ đưa', 'Hoàn tiền', 'Khác'].map(d => 
            `<option value="${d}">${d}</option>`
        ).join('');
    document.getElementById('thu-dropdown').innerHTML = thuOpt;
}

function handlePlus(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (val > 0) {
        (type === 'chi' ? chiStack : thuStack).push(val);
        input.value = ""; 
        input.focus();
        updateStackDisplay(type);
        checkSubmitState(type);
    }
}

function updateStackDisplay(type) {
    const stack = type === 'chi' ? chiStack : thuStack;
    const disp = document.getElementById(`${type}-stack-display`);
    
    if (stack.length > 0) {
        const total = stack.reduce((a,b) => a+b, 0);
        disp.innerText = `Đang cộng: ${stack.join(' + ')} = ${total} x 1000 = ${(total * 1000).toLocaleString()} đ`;
        disp.style.display = 'block';
    } else {
        disp.innerText = "";
        disp.style.display = 'none';
    }
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
    
    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";

    try {
        let payload;
        
        if (type === 'chi') {
            const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
            const dropdown = document.getElementById('chi-dropdown').value;
            const text = document.getElementById('chi-text').value;
            const desc = [...checks, dropdown, text].filter(x => x).join(', ');
            
            const formula = stack.length > 1 ? `=${stack.join('+')}` : total;
            
            payload = {
                action: 'insert_chi',
                payload: {
                    moTa: desc,
                    loaiChi: '',
                    nguon: 'Tiền mặt', // Default vì code cũ không có select nguồn
                    soTien1000: formula,
                    ngay: dateVal
                }
            };
        } else {
            const dropdown = document.getElementById('thu-dropdown').value;
            const text = document.getElementById('thu-text').value;
            const desc = [dropdown, text].filter(x => x).join(', ');
            
            const totalFull = total * 1000;
            
            payload = {
                action: 'insert_thu',
                payload: {
                    soTienVND: totalFull,
                    ngay: dateVal,
                    moTa: desc,
                    nguon: 'Chuyển khoản', // Default
                    loaiThu: dropdown || 'Khác'
                }
            };
        }
        
        console.log('📤 Sending:', payload);
        
        const res = await fetch(GAS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        
        if (result.status === 'success') {
            msg.innerHTML = `✅ Đã lưu: ${total}${type === 'chi' ? 'k' : ''}`;
            msg.className = "status-msg success";
            resetForm(type);
            setTimeout(loadSheetData, 2000);
            setTimeout(() => { msg.className = "status-msg"; }, 3000);
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (e) {
        console.error('❌ Submit failed:', e);
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
    
    // Live preview on input
    document.getElementById('chi-amount').addEventListener('input', () => {
        const currentVal = parseFloat(document.getElementById('chi-amount').value) || 0;
        const stack = [...chiStack];
        if (currentVal > 0) stack.push(currentVal);
        
        const disp = document.getElementById('chi-stack-display');
        if (stack.length > 0) {
            const total = stack.reduce((a,b) => a+b, 0);
            disp.innerText = `Đang cộng: ${stack.join(' + ')} = ${total} x 1000 = ${(total * 1000).toLocaleString()} đ`;
            disp.style.display = 'block';
        }
        
        checkSubmitState('chi');
    });
    
    document.getElementById('thu-amount').addEventListener('input', () => {
        checkSubmitState('thu');
    });
    
    // Reset buttons
    document.getElementById('chi-reset').onclick = () => {
        chiStack = [];
        document.getElementById('chi-amount').value = '';
        document.getElementById('chi-stack-display').textContent = '';
        document.getElementById('chi-stack-display').style.display = 'none';
        document.querySelectorAll('#chi-checkboxes input').forEach(cb => cb.checked = false);
        document.getElementById('chi-dropdown').value = '';
        document.getElementById('chi-text').value = '';
        checkSubmitState('chi');
    };
    
    document.getElementById('thu-reset').onclick = () => {
        thuStack = [];
        document.getElementById('thu-amount').value = '';
        document.getElementById('thu-dropdown').value = '';
        document.getElementById('thu-text').value = '';
        checkSubmitState('thu');
    };
}