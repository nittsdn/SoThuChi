// --- CẤU HÌNH ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiJRc_a2AXC68LMk519SyKY35qLt6ypgoM7BWbjEIytFF1IsLDruPF0HfImq--Opuh/exec';

let sheetData = [];
let chiTemp = [];
let thuTemp = [];
let editIndex = -1;
let currentType = '';
const quickDesc = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    loadData();
    renderCheckboxes();
    setupEvents();
});

// 1. ĐỌC DỮ LIỆU
async function loadData() {
    try {
        const res = await fetch(CSV_URL);
        const text = await res.text();
        // Regex xử lý CSV chuẩn (bỏ qua dấu phẩy trong ngoặc kép)
        sheetData = text.split('\n').map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        calcBalance();
        fillDropdowns();
    } catch (e) {
        document.getElementById('balance').innerText = "Lỗi mạng!";
    }
}

function calcBalance() {
    let thu = 0, chi = 0;
    sheetData.slice(1).forEach(r => {
        // Xóa dấu chấm và ngoặc kép để parse số
        const c = r[3] ? parseFloat(r[3].replace(/[\."]/g, '')) : 0;
        const t = r[9] ? parseFloat(r[9].replace(/[\."]/g, '')) : 0;
        chi += c; thu += t;
    });
    // Format hiển thị tiền Việt
    document.getElementById('balance').innerText = (thu - chi).toLocaleString('vi-VN');
}

// 2. XỬ LÝ LIST TẠM
function addToTemp(type) {
    const input = document.getElementById(type + '-amount');
    const val = parseFloat(input.value);
    if (!val) return alert("Chưa nhập số tiền!");

    if (editIndex > -1 && currentType === type) {
        type === 'chi' ? chiTemp[editIndex] = val : thuTemp[editIndex] = val;
        editIndex = -1;
        document.getElementById(type + '-add').innerText = '+';
    } else {
        type === 'chi' ? chiTemp.push(val) : thuTemp.push(val);
    }
    input.value = '';
    renderList(type);
}

function renderList(type) {
    const list = type === 'chi' ? chiTemp : thuTemp;
    const container = document.getElementById(type + '-list');
    const descArea = document.getElementById(type + '-desc');

    if (list.length > 0) {
        descArea.style.display = 'block';
        container.innerHTML = list.map((v, i) => 
            `<div class="temp-item" onclick="editItem('${type}', ${i})">
                ${type === 'chi' ? '-' : '+'} ${v.toLocaleString('vi-VN')}.000 
                <span class="edit-hint">(Sửa)</span>
            </div>`
        ).join('');
    } else {
        descArea.style.display = 'none';
        container.innerHTML = '';
    }
}

function editItem(type, i) {
    editIndex = i;
    currentType = type;
    const list = type === 'chi' ? chiTemp : thuTemp;
    document.getElementById(type + '-amount').value = list[i];
    document.getElementById(type + '-add').innerText = 'OK';
}

function clearTemp(type) {
    if(type === 'chi') chiTemp = []; else thuTemp = [];
    renderList(type);
}

// 3. GỬI DATA (WRITE)
async function submitData(type) {
    const btn = document.getElementById(type + '-submit');
    const msg = document.getElementById(type + '-message');
    btn.disabled = true;
    btn.innerText = "ĐANG LƯU...";

    const now = new Date();
    const dateStr = `Thứ ${['Hai','Ba','Tư','Năm','Sáu','Bảy','CN'][now.getDay()-1]||'CN'}- ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()%100}`;
    const total = (type === 'chi' ? chiTemp : thuTemp).reduce((a,b)=>a+b, 0);

    let row = [];
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const drop = document.getElementById('chi-dropdown').value;
        const txt = document.getElementById('chi-text').value;
        const desc = [...checks, drop, txt].filter(x => x).join(', ');
        
        // Cấu trúc Chi: [STT, Mô tả, Tiền(k), Tiền(full), Ngày]
        row = [sheetData.length, desc, total, total*1000, dateStr];
    } else {
        const src = document.getElementById('thu-dropdown').value || document.getElementById('thu-text').value;
        // Cấu trúc Thu: [..., Thu(J), Ngày(K), Nguồn(L)]
        row = Array(12).fill("");
        row[9] = total*1000; row[10] = dateStr; row[11] = src;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({type: type, data: row})
        });

        msg.innerText = "✅ Đã lưu thành công!";
        if(type==='chi') { chiTemp=[]; document.getElementById('chi-text').value=''; }
        else { thuTemp=[]; document.getElementById('thu-text').value=''; }
        
        renderList(type);
        setTimeout(() => { msg.innerText = ""; loadData(); }, 2500);
    } catch (e) {
        msg.innerText = "❌ Lỗi kết nối!";
    }
    btn.disabled = false;
    btn.innerText = type === 'chi' ? "LƯU KHOẢN CHI" : "LƯU KHOẢN THU";
}

// 4. UI HELPERS
function renderCheckboxes() {
    document.getElementById('chi-checkboxes').innerHTML = quickDesc.map(d => 
        `<label><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');
}

function fillDropdowns() {
    const set = new Set();
    sheetData.slice(1).forEach(r => { if(r[1]) set.add(r[1]); if(r[11]) set.add(r[11]); });
    const html = '<option value="">-- Chọn danh mục cũ --</option>' + [...set].map(o=>`<option>${o}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = html;
    document.getElementById('thu-dropdown').innerHTML = html;
}

function updateDate() {
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN');
}

function setupEvents() {
    document.getElementById('chi-add').onclick = () => addToTemp('chi');
    document.getElementById('thu-add').onclick = () => addToTemp('thu');
    document.getElementById('chi-clear').onclick = () => clearTemp('chi');
    document.getElementById('thu-clear').onclick = () => clearTemp('thu');
    document.getElementById('chi-submit').onclick = () => submitData('chi');
    document.getElementById('thu-submit').onclick = () => submitData('thu');
}