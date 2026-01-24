// Google Sheets API setup (thay YOUR_API_KEY và YOUR_SHEET_ID)
const API_KEY = 'YOUR_API_KEY'; // Lấy từ Google Cloud Console
const SHEET_ID = '2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc'; // Từ link
const RANGE = 'Sheet1!A:J'; // Giả định sheet có 10 cột

let data = [];
let chiList = [];
let thuList = [];
let selectedDescriptions = ['Ăn sáng', 'Đi chợ', 'Nạp điện thoại', 'Tiền điện', 'Tiền nước', 'Quà tết', 'Mua ccq', 'Tóc'];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateDate();
    setupEventListeners();
});

async function loadData() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`);
        const result = await response.json();
        data = result.values || [];
        updateBalance();
        updateLastSummary();
        populateDropdowns();
    } catch (error) {
        console.error('Lỗi load data:', error);
    }
}

function updateBalance() {
    const income = data.slice(1).reduce((sum, row) => sum + (parseFloat(row[9]) || 0), 0); // Cột J
    const expenses = data.slice(1).reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0); // Cột E (*1000)
    document.getElementById('balance').textContent = (income - expenses).toLocaleString() + ' VND';
}

function updateLastSummary() {
    // Giả định dòng cuối là tổng kết, parse từ data
    const lastRow = data[data.length - 1];
    document.getElementById('last-summary').textContent = `Ngày ${lastRow[0]} - ${lastRow[1]}`; // Giả định
}

function populateDropdowns() {
    const allDesc = [...new Set(data.slice(1).map(row => row[1]).filter(d => d))]; // Cột B
    const chiDropdown = document.getElementById('chi-dropdown');
    const thuDropdown = document.getElementById('thu-dropdown');
    const settingsCheckboxes = document.getElementById('settings-checkboxes');
    
    chiDropdown.innerHTML = '<option>Chọn mô tả</option>' + allDesc.map(d => `<option>${d}</option>`).join('');
    thuDropdown.innerHTML = '<option>Chọn mô tả</option>' + allDesc.map(d => `<option>${d}</option>`).join('');
    
    settingsCheckboxes.innerHTML = allDesc.map(d => `<label><input type="checkbox" value="${d}" ${selectedDescriptions.includes(d) ? 'checked' : ''}> ${d}</label>`).join('');
    updateChiCheckboxes();
}

function updateChiCheckboxes() {
    const checkboxes = document.getElementById('chi-checkboxes');
    checkboxes.innerHTML = selectedDescriptions.map(d => `<label><input type="checkbox" value="${d}"> ${d}</label>`).join('');
}

function setupEventListeners() {
    // Chi
    document.getElementById('chi-add').addEventListener('click', () => addToList('chi'));
    document.getElementById('chi-clear').addEventListener('click', () => clearList('chi'));
    document.getElementById('chi-submit').addEventListener('click', () => submitChi());
    
    // Thu
    document.getElementById('thu-add').addEventListener('click', () => addToList('thu'));
    document.getElementById('thu-clear').addEventListener('click', () => clearList('thu'));
    document.getElementById('thu-submit').addEventListener('click', () => submitThu());
    
    // Tổng kết
    document.getElementById('new-summary').addEventListener('click', newSummary);
    
    // Settings
    document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'block');
    document.getElementById('settings-close').addEventListener('click', () => document.getElementById('settings-modal').style.display = 'none');
    document.getElementById('settings-save').addEventListener('click', saveSettings);
}

function addToList(type) {
    const input = document.getElementById(`${type}-amount`);
    const amount = parseFloat(input.value);
    if (!amount) return;
    const list = type === 'chi' ? chiList : thuList;
    list.push(amount);
    renderList(type);
    input.value = '';
    document.getElementById(`${type}-desc`).style.display = 'block';
}

function renderList(type) {
    const listEl = document.getElementById(`${type}-list`);
    const list = type === 'chi' ? chiList : thuList;
    listEl.innerHTML = list.map((amt, i) => `<p class="clickable" onclick="editItem('${type}', ${i})">${type === 'chi' ? 'Chi' : 'Thu'} ${new Date().toLocaleDateString('vi-VN')}: ${amt.toLocaleString()}.000</p>`).join('');
}

function editItem(type, index) {
    const input = document.getElementById(`${type}-amount`);
    const btn = document.getElementById(`${type}-add`);
    input.value = (type === 'chi' ? chiList : thuList)[index];
    btn.textContent = 'V';
    btn.onclick = () => confirmEdit(type, index);
}

function confirmEdit(type, index) {
    const input = document.getElementById(`${type}-amount`);
    const list = type === 'chi' ? chiList : thuList;
    list[index] = parseFloat(input.value);
    renderList(type);
    input.value = '';
    document.getElementById(`${type}-add`).textContent = '+';
    document.getElementById(`${type}-add`).onclick = () => addToList(type);
}

function clearList(type) {
    if (type === 'chi') chiList = [];
    else thuList = [];
    renderList(type);
    document.getElementById(`${type}-desc`).style.display = 'none';
    document.getElementById(`${type}-amount`).value = '';
}

async function submitChi() {
    const checkboxes = Array.from(document.querySelectorAll('#chi-checkboxes input:checked')).map(cb => cb.value);
    const dropdown = document.getElementById('chi-dropdown').value;
    const text = document.getElementById('chi-text').value;
    const desc = [...checkboxes, dropdown, text].filter(d => d && d !== 'Chọn mô tả').join(', ');
    const total = chiList.reduce((sum, amt) => sum + amt, 0) * 1000;
    
    // Append to sheet
    await appendToSheet([new Date().toISOString(), desc, chiList.join(','), total, new Date().toLocaleDateString('vi-VN')]);
    
    document.getElementById('chi-message').textContent = `Đã thêm chi ${desc} ${chiList.map(a => `${a}.000`).join(' + ')} = ${total.toLocaleString()} ngày ${new Date().toLocaleDateString('vi-VN')} thành công!`;
    clearList('chi');
    loadData();
}

async function submitThu() {
    const dropdown = document.getElementById('thu-dropdown').value;
    const text = document.getElementById('thu-text').value;
    const desc = [dropdown, text].filter(d => d && d !== 'Chọn mô tả').join(', ');
    const total = thuList.reduce((sum, amt) => sum + amt, 0) * 1000;
    
    await appendToSheet(['', '', '', '', '', '', '', '', '', total, new Date().toLocaleDateString('vi-VN'), desc]);
    
    document.getElementById('thu-message').textContent = `Đã thêm thu ${desc} ${thuList.map(a => `${a}.000`).join(' + ')} = ${total.toLocaleString()} ngày ${new Date().toLocaleDateString('vi-VN')} thành công!`;
    clearList('thu');
    loadData();
}

async function newSummary() {
    const accounts = prompt('Nhập số dư thực tế, cách nhau bằng dấu phẩy (vd: acb:100000,hd:50000)');
    const realBalances = accounts.split(',').reduce((sum, acc) => sum + parseFloat(acc.split(':')[1]), 0);
    const theoretical = parseFloat(document.getElementById('balance').textContent.replace(/[^0-9]/g, ''));
    const deficit = theoretical - realBalances;
    
    await appendToSheet(['Tổng kết', new Date().toLocaleDateString('vi-VN'), accounts, realBalances, deficit]);
    
    document.getElementById('new-summary-result').textContent = `Tổng kết mới: ${new Date().toLocaleDateString('vi-VN')} - ${accounts}, Tổng ${realBalances.toLocaleString()}, ${deficit >= 0 ? 'Thừa' : 'Thiếu'} ${Math.abs(deficit).toLocaleString()}`;
    loadData();
}

async function appendToSheet(values) {
    // Sử dụng Sheets API append (cần auth token, giả định có)
    const token = localStorage.getItem('googleToken'); // Giả định auth riêng
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}:append?valueInputOption=RAW&key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] })
    });
}

function saveSettings() {
    selectedDescriptions = Array.from(document.querySelectorAll('#settings-checkboxes input:checked')).map(cb => cb.value);
    updateChiCheckboxes();
    document.getElementById('settings-modal').style.display = 'none';
}

function updateDate() {
    document.getElementById('current-date').textContent = `Ngày: ${new Date().toLocaleDateString('vi-VN')}`;
}