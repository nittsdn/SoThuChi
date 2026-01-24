// 1. CẤU HÌNH KẾT NỐI
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiJRc_a2AXC68LMk519SyKY35qLt6ypgoM7BWbjEIytFF1IsLDruPF0HfImq--Opuh/exec';

let sheetData = [];
let chiTemp = [];
let thuTemp = [];
let editIndex = -1;
let currentType = '';

// Danh sách 8 mô tả mặc định (có thể thay đổi trong Settings)
let quickDescriptions = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadDataFromSheet();
});

function initApp() {
    // Hiển thị ngày hiện tại
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dateStr = `${days[now.getDay()]}- ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() % 100}`;
    document.getElementById('current-date').innerText = 'Ngày: ' + dateStr;

    // Render checkboxes chi tiêu
    renderCheckboxes();
}

// 2. ĐỌC DỮ LIỆU (READ)
async function loadDataFromSheet() {
    try {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        // Parse CSV đơn giản
        sheetData = text.split('\n').map(row => {
            // Xử lý trường hợp có dấu phẩy trong ngoặc kép (số tiền định dạng VN)
            return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        });
        
        updateUI();
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu từ Sheet:', error);
    }
}

function updateUI() {
    // Tính số dư lý thuyết (Tổng Thu J - Tổng Chi D)
    let totalThu = 0;
    let totalChi = 0;

    sheetData.slice(1).forEach(row => {
        if (row[3]) totalChi += parseFloat(row[3].replace(/\./g, '')) || 0; // Cột D
        if (row[9]) totalThu += parseFloat(row[9].replace(/\./g, '')) || 0; // Cột J
    });

    const balance = totalThu - totalChi;
    document.getElementById('balance').innerText = balance.toLocaleString('vi-VN') + ' VND';

    // Cập nhật dropdown mô tả (Lấy từ các cột Chi tiêu hoặc Nguồn tiền đã có)
    const existingDesc = [...new Set(sheetData.slice(1).map(r => r[1] || r[11]).filter(x => x))];
    const chiDrop = document.getElementById('chi-dropdown');
    const thuDrop = document.getElementById('thu-dropdown');
    
    const optionsHtml = '<option value="">Chọn mô tả khác...</option>' + 
                        existingDesc.map(d => `<option value="${d}">${d}</option>`).join('');
    
    if (chiDrop) chiDrop.innerHTML = optionsHtml;
    if (thuDrop) thuDrop.innerHTML = optionsHtml;
}

// 3. XỬ LÝ NHẬP LIỆU TẠM THỜI
function addToTemp(type) {
    const input = document.getElementById(`${type}-amount`);
    const val = parseFloat(input.value);
    if (!val) return;

    if (editIndex > -1 && currentType === type) {
        if (type === 'chi') chiTemp[editIndex] = val;
        else thuTemp[editIndex] = val;
        editIndex = -1;
        document.getElementById(`${type}-add`).innerText = '+';
    } else {
        if (type === 'chi') chiTemp.push(val);
        else thuTemp.push(val);
    }

    input.value = '';
    renderTempList(type);
}

function renderTempList(type) {
    const list = type === 'chi' ? chiTemp : thuTemp;
    const container = document.getElementById(`${type}-list`);
    const descSection = document.getElementById(`${type}-desc`);

    if (list.length > 0) {
        descSection.style.display = 'block';
        container.innerHTML = list.map((amt, idx) => `
            <div class="temp-item" onclick="editTempItem('${type}', ${idx})">
                ${type === 'chi' ? '-' : '+'} ${amt}.000đ
            </div>
        `).join('');
    } else {
        descSection.style.display = 'none';
        container.innerHTML = '';
    }
}

function editTempItem(type, idx) {
    editIndex = idx;
    currentType = type;
    const list = type === 'chi' ? chiTemp : thuTemp;
    document.getElementById(`${type}-amount`).value = list[idx];
    document.getElementById(`${type}-add`).innerText = 'V';
}

function clearTemp(type) {
    if (type === 'chi') chiTemp = [];
    else thuTemp = [];
    renderTempList(type);
}

// 4. GỬI DỮ LIỆU LÊN DATABASE (WRITE)
async function submitData(type) {
    const btn = document.getElementById(`${type}-submit`);
    btn.disabled = true;
    btn.innerText = 'Đang lưu...';

    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dateStr = `${days[now.getDay()]}- ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() % 100}`;

    let rowData = [];
    
    if (type === 'chi') {
        const checks = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(c => c.value);
        const drop = document.getElementById('chi-dropdown').value;
        const text = document.getElementById('chi-text').value;
        const fullDesc = [...checks, drop, text].filter(x => x).join(', ');
        const totalK = chiTemp.reduce((a, b) => a + b, 0);

        // Cấu trúc cột Sheet: STT, Chi tiêu, Số tiền (k), *1000, Ngày
        rowData = [sheetData.length, fullDesc, totalK, totalK * 1000, dateStr];
    } else {
        const totalK = thuTemp.reduce((a, b) => a + b, 0);
        const source = document.getElementById('thu-dropdown').value || document.getElementById('thu-text').value;
        
        // Theo CSV mẫu: Thu ở cột J (index 9), Ngày K (10), Nguồn L (11)
        rowData = Array(12).fill("");
        rowData[9] = totalK * 1000;
        rowData[10] = dateStr;
        rowData[11] = source;
    }

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ type: type, data: rowData })
        });

        document.getElementById(`${type}-message`).innerText = `Đã thêm thành công!`;
        clearTemp(type);
        setTimeout(() => {
            document.getElementById(`${type}-message`).innerText = '';
            loadDataFromSheet(); // Reload để cập nhật số dư
        }, 2000);

    } catch (e) {
        alert('Lỗi kết nối database!');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Thêm';
    }
}

// 5. CÁC HÀM BỔ TRỢ
function renderCheckboxes() {
    const container = document.getElementById('chi-checkboxes');
    if (container) {
        container.innerHTML = quickDescriptions.map(d => `
            <label><input type="checkbox" value="${d}"> ${d}</label>
        `).join('');
    }
}

// Gán sự kiện cho các nút (nếu chưa gán trong HTML)
document.getElementById('chi-add').onclick = () => addToTemp('chi');
document.getElementById('thu-add').onclick = () => addToTemp('thu');
document.getElementById('chi-clear').onclick = () => clearTemp('chi');
document.getElementById('thu-clear').onclick = () => clearTemp('thu');
document.getElementById('chi-submit').onclick = () => submitData('chi');
document.getElementById('thu-submit').onclick = () => submitData('thu');