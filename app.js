// === 1. ПАМ'ЯТЬ ТЕЛЕФОНУ (LocalStorage) ===
let balances = JSON.parse(localStorage.getItem('lexus_balances')) || {
    total: 4250.00,
    work: 1200.00,
    taxi: 450.00,
    comp: 280.00,
    gas: 280.00
};

let settings = JSON.parse(localStorage.getItem('lexus_settings')) || {
    hourlyRate: 24,
    kmRate: 0.80,
    gasPrice: 3.80,
    isMonthlyLease: false
};

// Збереження даних
function saveData() {
    localStorage.setItem('lexus_balances', JSON.stringify(balances));
    localStorage.setItem('lexus_settings', JSON.stringify(settings));
}

// Форматування чисел (пробіли замість ком)
function formatMoney(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// === 2. ОНОВЛЕННЯ ІНТЕРФЕЙСУ ===
function updateDashboard() {
    if (!document.getElementById('val-total')) return; // Тільки для Dashboard.html
    document.getElementById('val-total').innerText = formatMoney(balances.total) + '.00 zł';
    document.getElementById('val-work').innerText = '+ ' + formatMoney(balances.work);
    document.getElementById('val-taxi').innerText = '+ ' + formatMoney(balances.taxi);
    document.getElementById('val-comp').innerText = '+ ' + formatMoney(balances.comp);
    document.getElementById('val-gas').innerText = '- ' + formatMoney(balances.gas);
}

function updateSettingsUI() {
    if (!document.getElementById('rate-hours')) return; // Тільки для settings.html
    document.getElementById('rate-hours').value = settings.hourlyRate;
    document.getElementById('rate-km').value = settings.kmRate;
    document.getElementById('rate-gas').value = settings.gasPrice;

    const toggle = document.getElementById('leasing-toggle');
    const desc = document.getElementById('leasing-desc');
    toggle.checked = settings.isMonthlyLease;
    desc.innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
}

// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    updateSettingsUI();
    setupSettingsListeners();
});

// === 3. СЛУХАЧІ В НАЛАШТУВАННЯХ ===
function setupSettingsListeners() {
    if (!document.getElementById('rate-hours')) return;

    document.getElementById('rate-hours').addEventListener('input', (e) => {
        settings.hourlyRate = parseFloat(e.target.value) || 0;
        saveData();
    });
    document.getElementById('rate-km').addEventListener('input', (e) => {
        settings.kmRate = parseFloat(e.target.value) || 0;
        saveData();
    });
    document.getElementById('rate-gas').addEventListener('input', (e) => {
        settings.gasPrice = parseFloat(e.target.value) || 0;
        saveData();
    });

    document.getElementById('leasing-toggle').addEventListener('change', (e) => {
        settings.isMonthlyLease = e.target.checked;
        document.getElementById('leasing-desc').innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
        saveData();
    });
}

// === 4. АНІМАЦІЇ МЕНЮ ===
function toggleMenu(menuId) {
    const overlay = document.getElementById('overlay');
    const plusMenu = document.getElementById('plusMenu');
    const minusMenu = document.getElementById('minusMenu');

    if (plusMenu) plusMenu.classList.replace('menu-visible', 'menu-hidden');
    if (minusMenu) minusMenu.classList.replace('menu-visible', 'menu-hidden');
    
    const targetMenu = document.getElementById(menuId);
    if (targetMenu) targetMenu.classList.replace('menu-hidden', 'menu-visible');
    if (overlay) overlay.classList.replace('overlay-hidden', 'overlay-visible');
}

function closeMenus() {
    const overlay = document.getElementById('overlay');
    const plusMenu = document.getElementById('plusMenu');
    const minusMenu = document.getElementById('minusMenu');

    if (plusMenu) plusMenu.classList.replace('menu-visible', 'menu-hidden');
    if (minusMenu) minusMenu.classList.replace('menu-visible', 'menu-hidden');
    if (overlay) overlay.classList.replace('overlay-visible', 'overlay-hidden');
}

// === 5. МАТЕМАТИКА: ДОХОДИ (+) ===
function addIncome(type) {
    let inputId, value, addedAmount = 0;

    if (type === 'hours') {
        inputId = 'input-hours';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { addedAmount = value * settings.hourlyRate; balances.work += addedAmount; }
    } else if (type === 'km') {
        inputId = 'input-km';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { addedAmount = value * settings.kmRate; balances.comp += addedAmount; }
    } else if (type === 'taxi') {
        inputId = 'input-taxi';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { addedAmount = value; balances.taxi += addedAmount; }
    } else if (type === 'other') {
        inputId = 'input-other-plus';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { addedAmount = value; balances.work += addedAmount; }
    }

    if (addedAmount > 0) {
        balances.total += addedAmount;
        document.getElementById(inputId).value = '';
        saveData();
        updateDashboard();
        closeMenus();
    }
}

// === 6. МАТЕМАТИКА: ВИТРАТИ (-) ===
function addExpense(type) {
    let inputId, value, subtractedAmount = 0;

    if (type === 'gas') {
        inputId = 'input-gas-liters';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { subtractedAmount = value * settings.gasPrice; balances.gas += subtractedAmount; }
    } else if (type === 'other') {
        inputId = 'input-other-minus';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) { subtractedAmount = value; balances.gas += subtractedAmount; }
    }

    if (subtractedAmount > 0) {
        balances.total -= subtractedAmount;
        document.getElementById(inputId).value = '';
        saveData();
        updateDashboard();
        closeMenus();
    }
}
