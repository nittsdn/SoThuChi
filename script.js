// --- CẤU HÌNH ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTF_rWGi_1G9b7zlldKzXLj_AJtcxzxQArrF4eIvIOnz_3WYudFAmMYhXwkTAb2hNgJkFbbO4hRwrIX/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjor1H_-TcN6hDtV2_P4yhSyi46zpoHZsy2WIaT-hJfoZbC0ircbB9zi3YIO388d1Q/exec';

// Dữ liệu mặc định để load ngay lập tức (tránh việc chờ fetch CSV lâu)
let sheetData = [];
let chiTemp = [];
let thuTemp = [];
const quickDesc = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];
const defaultDropdown = ['Lãi Tech', 'Lương', 'Thưởng', 'Lãi HD', 'Ba mẹ đưa', 'Khác']; 

// KHỞI CHẠY APP
document.addEventListener('DOMContentLoaded', () => {
    console.log("App đang khởi động...");
    updateDate();
    renderCheckboxes(); // Load checkbox ngay
    fillDropdowns(defaultDropdown); // Load dropdown mặc định ngay lập tức
    setupValidation(); 
    setupEvents();
    loadData(); // Sau đó mới load dữ liệu thực từ Sheet
});

// --- 1. LOAD DATA ---
async function loadData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        sheetData = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        calcBalance();
        // Cập nhật lại dropdown với dữ liệu thực tế từ sheet
        const realOptions = extractOptionsFromData();
        if (realOptions.length > 0) fillDropdowns(realOptions);
        
        console.log("Đã tải dữ liệu thành công");
    } catch (e) {
        console.error("Lỗi load CSV:", e);
        document.getElementById('balance').innerText = "Offline Mode";
    }
}

function extractOptionsFromData() {
    const set = new Set();
    // Bỏ qua dòng tiêu đề (slice 1)
    if(sheetData.length > 1) {
        sheetData.slice(1).forEach(r => { 
            if(r[1]) set.add(r[1]); // Cột mô tả Chi
            if(r[11]) set.add(r[11]); // Cột nguồn Thu
        });
    }
    return [...set];
}

function calcBalance() {
    let thu = 0, chi = 0;
    if(sheetData.length > 1) {
        sheetData.slice(1).forEach(r => {
            const c = r[3] ? parseFloat(r[3].replace(/[\."]/g, '')) : 0;
            const t = r[9] ? parseFloat(r[9].replace(/[\."]/g, '')) : 0;
            chi += c; thu += t;
        });
    }
    document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN') + ' đ';
}

// --- 2. UI HELPER (RENDER) ---
function renderCheckboxes() {
    const container = document.getElementById('chi-checkboxes');
    if(container) {
        container.innerHTML = quickDesc.map(d => 
            `<label class="cb-chip"><input type="checkbox" value="${d}"> ${d}</label>`
        ).join('');
    }
}

function fillDropdowns(options) {
    const html = '<option value="">-- Chọn hoặc nhập dưới --</option>' + options.map(o => `<option value="${o}">${o}</option>`).join('');
    const chiDrop = document.getElementById('chi-dropdown');
    const thuDrop = document.getElementById('thu-dropdown');
    
    if(chiDrop) chiDrop.innerHTML = html;
    if(thuDrop) thuDrop.innerHTML = html;
}

// --- 3. VALIDATION ---
function setupValidation() {
    // SỬA: Thêm event riêng cho từng element để trigger đúng
    const chiAmount = document.getElementById('chi-amount');
    const chiText = document.getElementById('chi-text');
    const chiDropdown = document.getElementById('chi-dropdown');
    const chiCheckboxes = document.querySelectorAll('#chi-checkboxes input');
    
    if(chiAmount) {
        chiAmount.addEventListener('input', checkChiState);
        chiAmount.addEventListener('change', checkChiState);
    }
    if(chiText) chiText.addEventListener('input', checkChiState);
    if(chiDropdown) chiDropdown.addEventListener('change', checkChiState);
    chiCheckboxes.forEach(cb => cb.addEventListener('change', checkChiState)); // SỬA: Event cho từng checkbox
    
    const thuAmount = document.getElementById('thu-amount');
    const thuText = document.getElementById('thu-text');
    const thuDropdown = document.getElementById('thu-dropdown');
    
    if(thuAmount) {
        thuAmount.addEventListener('input', checkThuState);
        thuAmount.addEventListener('change', checkThuState);
    }
    if(thuText) thuText.addEventListener('input', checkThuState);
    if(thuDropdown) thuDropdown.addEventListener('change', checkThuState);
}

function checkChiState() {
    const amt = parseFloat(document.getElementById('chi-amount').value);
    const checks = document.querySelectorAll('#chi-checkboxes input:checked').length > 0;
    const drop = document.getElementById('chi-dropdown').value !== "";
    const text = document.getElementById('chi-text').value.trim() !== "";
    
    toggleBtn('chi-add', amt > 0 && (checks || drop || text));
}

function checkThuState() {
    const amt = parseFloat(document.getElementById('thu-amount').value);
    const drop = document.getElementById('thu-dropdown').value !== "";
    const text = document.getElementById('thu-text').value.trim() !== "";
    
    toggleBtn('thu-add', amt > 0 && (drop || text));
}

function toggleBtn(id, enable) {
    const btn = document.getElementById(id);
    if(btn) {
        btn.disabled = !enable;
        if (enable) btn.classList.add('active'); else btn.classList.remove('active');
    }
}

// --- 4. LOGIC THÊM VÀO LIST TẠM ---
function addToTemp(type) {
    console.log(`Đang thêm ${type}...`);
    const amtInput = document.getElementById(`${type}-amount`);
    const amtVal = parseFloat(amtInput.value);
    const msg = document.getElementById(`${type}-message`);
    
    // Lấy mô tả
    let descStr = "";
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const drop = document.getElementById('chi-dropdown').value;
        const text = document.getElementById('chi-text').value;
        descStr = [...checks, drop, text].filter(x => x).join(', ');
    } else {
        const drop = document.getElementById('thu-dropdown').value;
        const text = document.getElementById('thu-text').value;
        descStr = [drop, text].filter(x => x).join(', ');
    }

    if (!descStr) descStr = "Không mô tả";

    // Thêm vào mảng
    const item = { amount: amtVal, desc: descStr };
    if (type === 'chi') chiTemp.push(item); else thuTemp.push(item);

    // THÔNG BÁO
    if(msg) {
        msg.innerText = `✅ Đã thêm: ${descStr} (${amtVal}k)`;
        msg.className = "status-msg success";
        setTimeout(() => { msg.innerText = ""; }, 3000);
    }

    // RESET Ô TIỀN
    amtInput.value = ""; 
    amtInput.focus(); 
    
    // Validate lại
    if(type === 'chi') checkChiState(); else checkThuState();
    
    renderList(type);
}

function renderList(type) {
    const list = type === 'chi' ? chiTemp : thuTemp;
    const container = document.getElementById(`${type}-list`);
    const wrap = document.getElementById(`${type}-list-container`);
    
    if (list.length > 0) {
        if(wrap) wrap.style.display = 'block';
        if(container) {
            container.innerHTML = list.map((item, i) => `
                <div class="temp-item">
                    <div class="item-info">
                        <span class="t-desc">${item.desc}</span>
                        <span class="t-amt">${item.amount.toLocaleString('vi-VN')}.000</span>
                    </div>
                    <span class="remove-btn" onclick="removeItem('${type}', ${i})">✕</span>
                </div>
            `).join('');
        }
    } else {
        if(wrap) wrap.style.display = 'none';
    }
}

function removeItem(type, idx) {
    if (type === 'chi') chiTemp.splice(idx, 1); else thuTemp.splice(idx, 1);
    renderList(type);
}

// --- 5. GỬI DATABASE ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    const msg = document.getElementById(`${type}-message`);
    btn.disabled = true;
    btn.innerText = "ĐANG GỬI...";

    const list = type === 'chi' ? chiTemp : thuTemp;
    const now = new Date();
    const dateStr = `Thứ ${['Hai','Ba','Tư','Năm','Sáu','Bảy','CN'][now.getDay()-1]||'CN'}- ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()%100}`;
    
    let rowsToSend = [];
    if (type === 'chi') {
        rowsToSend = list.map(item => [0, item.desc, item.amount, item.amount * 1000, dateStr]);
    } else {
        rowsToSend = list.map(item => [item.amount * 1000, dateStr, item.desc]);
    }

    try {
        console.log("Đang gửi dữ liệu...", rowsToSend);
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ type: type, data: rowsToSend })
        });

        const total = list.reduce((a,b) => a + b.amount, 0);
        if(msg) {
            msg.innerText = `🎉 Đã lưu thành công (${total}k)!`;
            msg.className = "status-msg success";
        }
        
        // Gửi xong mới reset toàn bộ
        if (type === 'chi') {
            chiTemp = [];
            document.querySelectorAll('#chi-checkboxes input').forEach(c => c.checked = false);
            document.getElementById('chi-text').value = "";
            document.getElementById('chi-dropdown').value = "";
            document.getElementById('chi-amount').value = "";
        } else {
            thuTemp = [];
            document.getElementById('thu-text').value = "";
            document.getElementById('thu-dropdown').value = "";
            document.getElementById('thu-amount').value = "";
        }
        
        renderList(type);
        setTimeout(() => { 
            if(msg) msg.innerText = ""; 
            loadData(); 
        }, 3000);

    } catch (e) {
        console.error("Lỗi gửi:", e);
        if(msg) {
            msg.innerText = "❌ Lỗi kết nối!";
            msg.className = "status-msg error";
        }
    } finally {
        btn.disabled = false;
        btn.innerText = type === 'chi' ? "LƯU TẤT CẢ VÀO DATABASE" : "LƯU THU VÀO DATABASE";
    }
}

// SETUP EVENTS
function updateDate() { 
    const el = document.getElementById('current-date');
    if(el) el.innerText = new Date().toLocaleDateString('vi-VN'); 
}

function setupEvents() {
    // Sử dụng preventDefault để tránh reload trang
    document.getElementById('chi-add').onclick = (e) => { e.preventDefault(); addToTemp('chi'); };
    document.getElementById('thu-add').onclick = (e) => { e.preventDefault(); addToTemp('thu'); };
    
    document.getElementById('chi-submit').onclick = (e) => { e.preventDefault(); submitData('chi'); };
    document.getElementById('thu-submit').onclick = (e) => { e.preventDefault(); submitData('thu'); };
    
    document.getElementById('chi-clear-all').onclick = (e) => {
        e.preventDefault();
        document.getElementById('chi-amount').value = "";
        document.querySelectorAll('#chi-checkboxes input').forEach(c => c.checked = false);
        document.getElementById('chi-text').value = "";
        document.getElementById('chi-dropdown').value = "";
        checkChiState();
    };
}