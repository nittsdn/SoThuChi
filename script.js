// Cấu hình kết nối
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiJRc_a2AXC68LMk519SyKY35qLt6ypgoM7BWbjEIytFF1IsLDruPF0HfImq--Opuh/exec';

let sheetData = [];
let chiTemp = [];
let thuTemp = [];
let editIndex = -1;
let currentType = '';
let selectedDescriptions = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    loadData();
    setupEventListeners();
    renderCheckboxes();
});

// LOAD DỮ LIỆU TỪ SHEET (READ)
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        // Parse CSV đơn giản
        sheetData = text.split('\n').map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        calculateBalance();
        updateDropdowns();
    } catch (error) {
        console.error('Không thể load dữ liệu:', error);
    }
}

// TÍNH SỐ DƯ LÝ THUYẾT (Cột J - Cột D)
function calculateBalance() {
    let totalThu = 0;
    let totalChi = 0;

    sheetData.slice(1).forEach(row => {
        // Cột D (index 3) là Chi, Cột J (index 9) là Thu
        const chiVal = parseFloat(row[2]?.replace(/[^0-9.-]+/g, "")) || 0; 
        const thuVal = parseFloat(row[9]?.replace(/[^0-9.-]+/g, "")) || 0;
        totalChi += chiVal;
        totalThu += thuVal;
    });

    const balance = (totalThu - totalChi) * 1000;
    document.getElementById('balance').textContent = balance.toLocaleString('vi-VN') + ' VND';
}

// QUẢN LÝ DANH SÁCH TẠM (LOGIC CHI/THU)
function addToTemp(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (!val) return;

    if (editIndex > -1 && currentType === type) {
        type === 'chi' ? chiTemp[editIndex] = val : thuTemp[editIndex] = val;
        editIndex = -1;
        document.getElementById(`${type}-add`).textContent = '+';
    } else {
        type === 'chi' ? chiTemp.push(val) : thuTemp.push(val);
    }

    input.value = '';
    renderList(type);
}

function renderList(type) {
    const list = type === 'chi' ? chiTemp : thuTemp;
    const container = document.getElementById(`${type}-list`);
    const descSection = document.getElementById(`${type}-desc`);

    if (list.length > 0) {
        descSection.style.display = 'block';
        container.innerHTML = list.map((v, i) => 
            `<div class="temp-item" style="color:#007aff; padding:8px; border-bottom:1px solid #eee" onclick="editItem('${type}', ${i})">
                ${type.toUpperCase()} ${v}.000đ (Sửa)
            </div>`
        ).join('');
    } else {
        descSection.style.display = 'none';
        container.innerHTML = '';
    }
}

function editItem(type, index) {
    editIndex = index;
    currentType = type;
    const list = type === 'chi' ? chiTemp : thuTemp;
    document.getElementById(`${type}-amount`).value = list[index];
    document.getElementById(`${type}-add`).textContent = 'V';
}

// GỬI DỮ LIỆU LÊN DATABASE (WRITE)
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() % 100}`;
    const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][now.getDay()];
    const fullDate = `${dayOfWeek}- ${dateStr}`;

    let finalRow = [];

    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const dropdown = document.getElementById('chi-dropdown').value;
        const text = document.getElementById('chi-text').value;
        const moTa = [...checks, dropdown, text].filter(x => x).join(', ');
        const tongK = chiTemp.reduce((a, b) => a + b, 0);

        // Định dạng cột: STT, Chi tiêu, Số tiền (k), *1000, Ngày
        finalRow = [sheetData.length, moTa, tongK, (tongK * 1000).toLocaleString('vi-VN'), fullDate];
    } else {
        const tongK = thuTemp.reduce((a, b) => a + b, 0);
        const nguon = document.getElementById('thu-dropdown').value || document.getElementById('thu-text').value;
        
        // Định dạng cột Thu: Cột J(9)=Tiền, K(10)=Ngày, L(11)=Nguồn
        finalRow = Array(12).fill("");
        finalRow[9] = (tongK * 1000).toLocaleString('vi-VN');
        finalRow[10] = fullDate;
        finalRow[11] = nguon;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ data: finalRow })
        });

        document.getElementById(`${type}-message`).textContent = "Đã lưu thành công!";
        if(type === 'chi') chiTemp = []; else thuTemp = [];
        renderList(type);
        setTimeout(() => {
            document.getElementById(`${type}-message`).textContent = "";
            loadData(); // Load lại để cập nhật số dư
        }, 2000);
    } catch (e) {
        alert("Lỗi kết nối!");
    } finally {
        btn.disabled = false;
        btn.textContent = "Thêm";
    }
}

// UI HELPER
function renderCheckboxes() {
    const container = document.getElementById('chi-checkboxes');
    container.innerHTML = selectedDescriptions.map(d => 
        `<label style="margin-right:10px"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');
}

function updateDropdowns() {
    const options = [...new Set(sheetData.slice(1).map(r => r[1] || r[11]).filter(x => x))];
    const html = `<option value="">Chọn mô tả...</option>` + options.map(o => `<option>${o}</option>`).join('');
    document.getElementById('chi-dropdown').innerHTML = html;
    document.getElementById('thu-dropdown').innerHTML = html;
}

function setupEventListeners() {
    document.getElementById('chi-add').onclick = () => addToTemp('chi');
    document.getElementById('thu-add').onclick = () => addToTemp('thu');
    document.getElementById('chi-submit').onclick = () => submitData('chi');
    document.getElementById('thu-submit').onclick = () => submitData('thu');
    document.getElementById('chi-clear').onclick = () => { chiTemp = []; renderList('chi'); };
    document.getElementById('thu-clear').onclick = () => { thuTemp = []; renderList('thu'); };
}

function updateDate() {
    document.getElementById('current-date').textContent = "Ngày: " + new Date().toLocaleDateString('vi-VN');
}
