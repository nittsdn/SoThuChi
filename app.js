// Configuration
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-_-I6LLrifbZZPscBDUN9jufEyYrtf2tIIjtGihIScCU2tFp-HtuIgLkw6NqU0mUfOsEe9lIBTnIc/pub?gid=1944311512&single=true&output=csv';
const DEFAULT_CHECKBOXES = ['ăn sáng', 'đi chợ', 'nạp điện thoại', 'tiền điện', 'tiền nước', 'quà tết', 'mua ccq', 'tóc'];

// State management
let expenseList = [];
let incomeList = [];
let allDescriptions = [];
let selectedCheckboxes = [];
let currentEditingExpense = null;
let currentEditingIncome = null;
let sheetData = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadSheetData();
});

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('selectedCheckboxes');
    if (saved) {
        selectedCheckboxes = JSON.parse(saved);
    } else {
        selectedCheckboxes = DEFAULT_CHECKBOXES;
    }
}

// Load and parse Google Sheets data
async function loadSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        sheetData = parseCSV(csvText);
        
        extractDescriptions();
        updateCheckboxes();
        updateDropdowns();
        calculateBalance();
        displayLastSummary();
    } catch (error) {
        console.error('Error loading sheet data:', error);
        document.getElementById('balance-amount').textContent = 'Lỗi tải dữ liệu';
    }
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        data.push(row);
    }
    
    return data;
}

// Extract unique descriptions from sheet
function extractDescriptions() {
    const descriptions = new Set();
    sheetData.forEach(row => {
        if (row['Mô tả'] || row['Mo ta'] || row['Description']) {
            const desc = row['Mô tả'] || row['Mo ta'] || row['Description'];
            if (desc && desc !== '') {
                descriptions.add(desc);
            }
        }
    });
    allDescriptions = Array.from(descriptions).sort();
}

// Update expense checkboxes
function updateCheckboxes() {
    const container = document.getElementById('expense-checkboxes');
    container.innerHTML = '';
    
    selectedCheckboxes.forEach(desc => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" value="${desc}" onchange="handleCheckboxChange()">
            <span>${desc}</span>
        `;
        container.appendChild(label);
    });
}

// Update dropdowns with all descriptions
function updateDropdowns() {
    const expenseDropdown = document.getElementById('expense-dropdown');
    const incomeDropdown = document.getElementById('income-dropdown');
    
    // Clear existing options (except first)
    expenseDropdown.innerHTML = '<option value="">-- Chọn từ danh sách --</option>';
    incomeDropdown.innerHTML = '<option value="">-- Chọn từ danh sách --</option>';
    
    allDescriptions.forEach(desc => {
        const option1 = document.createElement('option');
        option1.value = desc;
        option1.textContent = desc;
        expenseDropdown.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = desc;
        option2.textContent = desc;
        incomeDropdown.appendChild(option2);
    });
}

// Handle checkbox change
function handleCheckboxChange() {
    // Uncheck all other checkboxes when one is selected
    const checkboxes = document.querySelectorAll('#expense-checkboxes input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.checked) {
            checkboxes.forEach(other => {
                if (other !== cb) other.checked = false;
            });
        }
    });
}

// Add expense to temporary list
function addExpenseToList() {
    const amountInput = document.getElementById('expense-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        return;
    }
    
    if (currentEditingExpense !== null) {
        // Update existing expense
        expenseList[currentEditingExpense].amount = amount;
        currentEditingExpense = null;
        document.getElementById('expense-add-btn').textContent = '+';
    } else {
        // Add new expense
        expenseList.push({ amount: amount });
    }
    
    amountInput.value = '';
    displayExpenseList();
}

// Display expense list
function displayExpenseList() {
    const container = document.getElementById('expense-list');
    container.innerHTML = '';
    
    expenseList.forEach((expense, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `Chi : ${formatCurrency(expense.amount)}`;
        item.onclick = () => editExpense(index);
        container.appendChild(item);
    });
}

// Edit expense
function editExpense(index) {
    const expense = expenseList[index];
    document.getElementById('expense-amount').value = expense.amount;
    currentEditingExpense = index;
    document.getElementById('expense-add-btn').textContent = '✓';
}

// Clear expense list
function clearExpenseList() {
    expenseList = [];
    currentEditingExpense = null;
    document.getElementById('expense-add-btn').textContent = '+';
    displayExpenseList();
}

// Submit expenses
async function submitExpenses() {
    if (expenseList.length === 0) {
        alert('Vui lòng thêm ít nhất một khoản chi');
        return;
    }
    
    const description = getSelectedDescription('expense');
    if (!description) {
        alert('Vui lòng chọn hoặc nhập mô tả');
        return;
    }
    
    const total = expenseList.reduce((sum, e) => sum + e.amount, 0);
    
    // In a real implementation, this would append to Google Sheets via API
    // For now, we'll simulate success
    const message = `✅ Đã thêm ${expenseList.length} khoản chi. Tổng: ${formatCurrency(total)}`;
    document.getElementById('expense-message').textContent = message;
    
    // Clear form
    clearExpenseList();
    document.getElementById('expense-custom').value = '';
    document.getElementById('expense-dropdown').value = '';
    uncheckAll('expense-checkboxes');
    
    // Hide message after 3 seconds
    setTimeout(() => {
        document.getElementById('expense-message').textContent = '';
    }, 3000);
    
    // Reload data
    setTimeout(() => loadSheetData(), 1000);
}

// Add income to temporary list
function addIncomeToList() {
    const amountInput = document.getElementById('income-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ');
        return;
    }
    
    if (currentEditingIncome !== null) {
        // Update existing income
        incomeList[currentEditingIncome].amount = amount;
        currentEditingIncome = null;
        document.getElementById('income-add-btn').textContent = '+';
    } else {
        // Add new income
        incomeList.push({ amount: amount });
    }
    
    amountInput.value = '';
    displayIncomeList();
}

// Display income list
function displayIncomeList() {
    const container = document.getElementById('income-list');
    container.innerHTML = '';
    
    incomeList.forEach((income, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `Thu : ${formatCurrency(income.amount)}`;
        item.onclick = () => editIncome(index);
        container.appendChild(item);
    });
}

// Edit income
function editIncome(index) {
    const income = incomeList[index];
    document.getElementById('income-amount').value = income.amount;
    currentEditingIncome = index;
    document.getElementById('income-add-btn').textContent = '✓';
}

// Clear income list
function clearIncomeList() {
    incomeList = [];
    currentEditingIncome = null;
    document.getElementById('income-add-btn').textContent = '+';
    displayIncomeList();
}

// Submit income
async function submitIncome() {
    if (incomeList.length === 0) {
        alert('Vui lòng thêm ít nhất một khoản thu');
        return;
    }
    
    const description = getSelectedDescription('income');
    if (!description) {
        alert('Vui lòng chọn hoặc nhập mô tả');
        return;
    }
    
    const total = incomeList.reduce((sum, i) => sum + i.amount, 0);
    
    // In a real implementation, this would append to Google Sheets via API
    // For now, we'll simulate success
    const message = `✅ Đã thêm ${incomeList.length} khoản thu. Tổng: ${formatCurrency(total)}`;
    document.getElementById('income-message').textContent = message;
    
    // Clear form
    clearIncomeList();
    document.getElementById('income-custom').value = '';
    document.getElementById('income-dropdown').value = '';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        document.getElementById('income-message').textContent = '';
    }, 3000);
    
    // Reload data
    setTimeout(() => loadSheetData(), 1000);
}

// Get selected description
function getSelectedDescription(type) {
    if (type === 'expense') {
        // Check checkboxes first
        const checked = document.querySelector('#expense-checkboxes input[type="checkbox"]:checked');
        if (checked) return checked.value;
        
        // Then dropdown
        const dropdown = document.getElementById('expense-dropdown').value;
        if (dropdown) return dropdown;
        
        // Finally custom input
        const custom = document.getElementById('expense-custom').value.trim();
        if (custom) return custom;
    } else {
        // For income: dropdown first, then custom
        const dropdown = document.getElementById('income-dropdown').value;
        if (dropdown) return dropdown;
        
        const custom = document.getElementById('income-custom').value.trim();
        if (custom) return custom;
    }
    
    return null;
}

// Uncheck all checkboxes
function uncheckAll(containerId) {
    const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = false);
}

// Calculate balance
function calculateBalance() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    sheetData.forEach(row => {
        const type = row['Loại'] || row['Type'] || '';
        const amount = parseFloat(row['Số tiền'] || row['Amount'] || row['So tien'] || 0);
        
        if (type.toLowerCase().includes('thu')) {
            totalIncome += amount;
        } else if (type.toLowerCase().includes('chi')) {
            totalExpense += amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    document.getElementById('balance-amount').textContent = formatCurrency(balance);
}

// Display last summary
function displayLastSummary() {
    const summaries = sheetData.filter(row => {
        const type = row['Loại'] || row['Type'] || '';
        return type.toLowerCase().includes('tổng kết') || type.toLowerCase().includes('summary');
    });
    
    if (summaries.length > 0) {
        const last = summaries[summaries.length - 1];
        const date = last['Ngày'] || last['Date'] || '';
        const amount = last['Số tiền'] || last['Amount'] || '';
        const desc = last['Mô tả'] || last['Description'] || '';
        
        document.getElementById('last-summary').innerHTML = `
            <p><strong>Ngày:</strong> ${date}</p>
            <p><strong>Số dư:</strong> ${formatCurrency(parseFloat(amount) || 0)}</p>
            <p><strong>Chi tiết:</strong> ${desc}</p>
        `;
    } else {
        document.getElementById('last-summary').innerHTML = '<p>Chưa có tổng kết nào</p>';
    }
}

// Create new summary
function createNewSummary() {
    const balance = document.getElementById('balance-amount').textContent;
    const accounts = prompt('Nhập số dư thực tế các tài khoản (VD: Ví: 500.000, Ngân hàng: 1.000.000):');
    
    if (!accounts) return;
    
    // In a real implementation, this would calculate deficit and append to Google Sheets
    const message = `✅ Đã tạo tổng kết mới. Số dư lý thuyết: ${balance}`;
    document.getElementById('summary-message').textContent = message;
    
    setTimeout(() => {
        document.getElementById('summary-message').textContent = '';
        loadSheetData();
    }, 3000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Settings modal functions
function openSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
    
    // Populate settings checkboxes
    const container = document.getElementById('settings-checkboxes');
    container.innerHTML = '';
    
    allDescriptions.forEach(desc => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const checked = selectedCheckboxes.includes(desc) ? 'checked' : '';
        label.innerHTML = `
            <input type="checkbox" value="${desc}" ${checked}>
            <span>${desc}</span>
        `;
        container.appendChild(label);
    });
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveSettings() {
    const checkboxes = document.querySelectorAll('#settings-checkboxes input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    if (selected.length !== 8) {
        alert('Vui lòng chọn đúng 8 mô tả');
        return;
    }
    
    selectedCheckboxes = selected;
    localStorage.setItem('selectedCheckboxes', JSON.stringify(selectedCheckboxes));
    
    updateCheckboxes();
    closeSettings();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('settings-modal');
    if (event.target === modal) {
        closeSettings();
    }
}
