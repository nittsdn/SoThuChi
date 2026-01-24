// --- CẤU HÌNH ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiJRc_a2AXC68LMk519SyKY35qLt6ypgoM7BWbjEIytFF1IsLDruPF0HfImq--Opuh/exec';

let sheetData = [];
let chiTemp = [];
let thuTemp = [];
let editIndex = -1;
let currentType = '';
let selectedDescriptions = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];

// Khởi chạy
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    loadData();
    renderCheckboxes();
    setupEventListeners();
});

// --- PHẦN 1: ĐỌC DỮ LIỆU (READ) ---
async function loadData() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        // Regex tách CSV chuẩn, xử lý dấu phẩy trong ngoặc kép
        sheetData = text.split('\n').map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
        
        calculateBalance();
        updateDropdowns();
        console.log("Đã tải dữ liệu thành công");
    } catch (error) {
        console.error('Lỗi load data:', error);
        document.getElementById('balance').textContent = "Lỗi tải!";
    }
}

function calculateBalance() {
    let totalThu = 0;
    let totalChi = 0;

    sheetData.slice(1).forEach(row => {
        // Cột D (index 3) là Chi, Cột J (index 9) là Thu
        // Xóa dấu chấm (.) và dấu ngoặc kép (") để parse số đúng chuẩn VN
        const chiRaw = row[3] ? row[3].replace(/\./g, '').replace(/"/g, '') : "0";
        const thuRaw = row[9] ? row[9].replace(/\./g, '').replace(/"/g, '') : "0";

        totalChi += parseFloat(chiRaw) || 0;
        totalThu += parseFloat(thuRaw) || 0;
    });

    const balance = totalThu - totalChi;
    // Format hiển thị lại có dấu chấm
    document.getElementById('balance').textContent = balance.toLocaleString('vi-VN') + ' VND';
}

// --- PHẦN 2: XỬ LÝ GIAO DIỆN TẠM (TEMP LIST) ---
function addToTemp(type) {
    const inputId = type === 'chi' ? 'chi-amount' : 'thu-amount';
    const input = document.getElementById(inputId);
    const val = parseFloat(input.value);
    
    if (!val) {
        alert("Vui lòng nhập số tiền!");
        return;
    }

    if (editIndex > -1 && currentType === type) {
        // Đang sửa
        type === 'chi' ? chiTemp[editIndex] = val : thuTemp[editIndex] = val;
        editIndex = -1;
        document.getElementById(`${type}-add`).textContent = '+';
    } else {
        // Thêm mới
        type === 'chi' ? chiTemp.push(val) : thuTemp.push(val);
    }

    input.value = '';
    renderList(type);
}

function renderList(type) {
    const list = type === 'chi' ? chiTemp : thuTemp;
    const listEl = document.getElementById(`${type}-list`);
    const descEl = document.getElementById(`${type}-desc`);

    if (list.length > 0) {
        descEl.style.display = 'block'; // Hiện phần nhập mô tả
        listEl.innerHTML = list.map((v, i) => 
            `<div class="temp-item" onclick="editItem('${type}', ${i})">
                ${type === 'chi' ? '-' : '+'} ${v}.000 <span style="font-size:12px; color:#999">(Sửa)</span>
            </div>`
        ).join('');
    } else {
        descEl.style.display = 'none'; // Ẩn phần nhập mô tả
        listEl.innerHTML = '';
    }
}

function editItem(type, index) {
    editIndex = index;
    currentType = type;
    const list = type === 'chi' ? chiTemp : thuTemp;
    document.getElementById(`${type}-amount`).value = list[index];
    document.getElementById(`${type}-add`).textContent = 'OK';
    document.getElementById(`${type}-amount`).focus();
}

function clearTemp(type) {
    if(type === 'chi') chiTemp = []; else thuTemp = [];
    renderList(type);
}

// --- PHẦN 3: GỬI DỮ LIỆU (WRITE) ---
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    // Tạo ngày tháng
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dateStr = `${days[now.getDay()]}- ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() % 100}`;

    let finalRow = [];
    const tongK = (type === 'chi' ? chiTemp : thuTemp).reduce((a, b) => a + b, 0);

    if (type === 'chi') {
        // Lấy mô tả chi
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const drop = document.getElementById('chi-dropdown').value;
        const text = document.getElementById('chi-text').value;
        
        const fullDesc = [...checks, drop, text].filter(x => x && x !== "").join(', ');
        
        // Cấu trúc: [STT, Chi tiêu, Số tiền (k), *1000, Ngày]
        finalRow = [sheetData.length, fullDesc, tongK, tongK * 1000, dateStr];
    } else {
        // Lấy mô tả thu
        const drop = document.getElementById('thu-dropdown').value;
        const text = document.getElementById('thu-text').value;
        const fullSource = [drop, text].filter(x => x && x !== "").join(', ');

        // Cấu trúc: [..., Thu(J), Ngày(K), Nguồn(L)]
        finalRow = Array(12).fill("");
        finalRow[9] = tongK * 1000;
        finalRow[10] = dateStr;
        finalRow[11] = fullSource;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Quan trọng để ko bị chặn
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, data: finalRow })
        });

        // Xử lý sau khi gửi
        document.getElementById(`${type}-message`).textContent = "✅ Đã lưu! Đợi 2s cập nhật...";
        document.getElementById(`${type}-message`).style.color = "green";
        
        clearTemp(type); // Xóa list tạm
        // Reset inputs
        if(type==='chi') {
            document.querySelectorAll('#chi-checkboxes input').forEach(c => c.checked = false);
            document.getElementById('chi-text').value = '';
            document.getElementById('chi-dropdown').value = '';
        } else {
            document.getElementById('thu-text').value = '';
            document.getElementById('thu-dropdown').value = '';
        }

        setTimeout(() => {
            document.getElementById(`${type}-message`).textContent = "";
            loadData(); // Tải lại số dư mới
        }, 3000);

    } catch (e) {
        alert("Lỗi kết nối: " + e);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Thêm';
    }
}

// --- CÁC HÀM PHỤ TRỢ ---
function renderCheckboxes() {
    const div = document.getElementById('chi-checkboxes');
    if (!div) return;
    div.innerHTML = selectedDescriptions.map(d => 
        `<label class="cb-item"><input type="checkbox" value="${d}"> ${d}</label>`
    ).join('');
}

function updateDropdowns() {
    // Lấy list mô tả duy nhất từ dữ liệu cũ để gợi ý
    const descs = new Set();
    sheetData.slice(1).forEach(r => {
        if(r[1]) descs.add(r[1]); // Cột B Chi tiêu
        if(r[11]) descs.add(r[11]); // Cột L Nguồn tiền
    });
    
    const html = '<option value="">-- Chọn danh mục cũ --</option>' + 
                 [...descs].map(d => `<option value="${d}">${d}</option>`).join('');
    
    const chiDrop = document.getElementById('chi-dropdown');
    const thuDrop = document.getElementById('thu-dropdown');
    if(chiDrop) chiDrop.innerHTML = html;
    if(thuDrop) thuDrop.innerHTML = html;
}

function setupEventListeners() {
    // Nút thêm số tiền
    document.getElementById('chi-add')?.addEventListener('click', () => addToTemp('chi'));
    document.getElementById('thu-add')?.addEventListener('click', () => addToTemp('thu'));
    
    // Nút xóa hết
    document.getElementById('chi-clear')?.addEventListener('click', () => clearTemp('chi'));
    document.getElementById('thu-clear')?.addEventListener('click', () => clearTemp('thu'));
    
    // Nút Submit lên Sheet
    document.getElementById('chi-submit')?.addEventListener('click', () => submitData('chi'));
    document.getElementById('thu-submit')?.addEventListener('click', () => submitData('thu'));
}

function updateDate() {
    const el = document.getElementById('current-date');
    if(el) el.textContent = 'Ngày: ' + new Date().toLocaleDateString('vi-VN');
}