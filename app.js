// === 1. ПАМ'ЯТЬ ТА НАЛАШТУВАННЯ ===
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

let currentLeasePage = 1; // Поточна сторінка лізингу

function saveData() {
    localStorage.setItem('lexus_balances', JSON.stringify(balances));
    localStorage.setItem('lexus_settings', JSON.stringify(settings));
}

function formatMoney(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// === 2. ЛОГІКА ПАГІНАЦІЇ ЛІЗИНГУ ===

function renderLeasingList() {
    const listContainer = document.getElementById('leasing-list');
    const titleContainer = document.getElementById('leasing-page-title');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Очищуємо старі плашки
    titleContainer.innerText = `Виплати Лізинг (Стор. ${currentLeasePage})`;

    const amount = settings.isMonthlyLease ? 2400 : 600;
    const periodName = settings.isMonthlyLease ? "Місяць" : "Тиждень";
    const itemsPerPage = 4;
    const startIdx = (currentLeasePage - 1) * itemsPerPage;

    for (let i = 1; i <= itemsPerPage; i++) {
        const currentNum = startIdx + i;
        
        // Генерація дати (проста логіка: +7 днів або +30 днів від умовної дати)
        const date = new Date();
        date.setDate(date.getDate() + (currentNum * (settings.isMonthlyLease ? 30 : 7)));
        const dateStr = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });

        const isOverdue = currentNum === 1 && currentLeasePage === 1; // Тільки перша плашка "протермінована" для дизайну

        const html = `
            <div class="bg-white rounded-[24px] p-4 flex justify-between items-center modern-shadow border ${isOverdue ? 'border-[#ff5252]/20' : 'border-white'}">
                <div>
                    <p class="text-[10px] font-extrabold ${isOverdue ? 'text-[#ff5252]' : 'text-[#8e8e93]'} uppercase tracking-wider mb-1">
                        ${isOverdue ? 'Протерміновано' : periodName + ' ' + currentNum}
                    </p>
                    <p class="text-[20px] font-black ${isOverdue ? 'text-[#ff5252]' : 'text-[#1c1c1e]'}">${formatMoney(amount)} zł</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="${isOverdue ? 'bg-[#fff0f0] text-[#ff5252]' : 'bg-[#f2f4f7] text-[#1c1c1e]'} px-3 py-1.5 rounded-[10px] text-[11px] font-bold">${dateStr}</div>
                    <div class="${isOverdue ? 'bg-[#ff5252] shadow-red-500/30' : 'bg-[#e2f5ec]'} w-10 h-10 rounded-[12px] flex items-center justify-center">
                        ${isOverdue 
                            ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
                            : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#20b26c" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                        }
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    }
}

window.nextLeasePage = function() {
    currentLeasePage++;
    renderLeasingList();
};

window.prevLeasePage = function() {
    if (currentLeasePage > 1) {
        currentLeasePage--;
        renderLeasingList();
    }
};

// === 3. ОНОВЛЕННЯ ІНТЕРФЕЙСУ ===

function updateDashboard() {
    if (!document.getElementById('val-total')) return;
    document.getElementById('val-total').innerText = formatMoney(balances.total) + '.00 zł';
    document.getElementById('val-work').innerText = '+ ' + formatMoney(balances.work);
    document.getElementById('val-taxi').innerText = '+ ' + formatMoney(balances.taxi);
    document.getElementById('val-comp').innerText = '+ ' + formatMoney(balances.comp);
    document.getElementById('val-gas').innerText = '- ' + formatMoney(balances.gas);
    renderLeasingList();
}

function updateSettingsUI() {
    if (!document.getElementById('rate-hours')) return;
    document.getElementById('rate-hours').value = settings.hourlyRate;
    document.getElementById('rate-km').value = settings.kmRate;
    document.getElementById('rate-gas').value = settings.gasPrice;

    const toggle = document.getElementById('leasing-toggle');
    const desc = document.getElementById('leasing-desc');
    toggle.checked = settings.isMonthlyLease;
    desc.innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
}

document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    updateSettingsUI();
    setupSettingsListeners();
});

// === 4. СЛУХАЧІ В НАЛАШТУВАННЯХ ===

function setupSettingsListeners() {
    const rateHours = document.getElementById('rate-hours');
    if (!rateHours) return;

    rateHours.addEventListener('input', (e) => { settings.hourlyRate = parseFloat(e.target.value) || 0; saveData(); });
    document.getElementById('rate-km').addEventListener('input', (e) => { settings.kmRate = parseFloat(e.target.value) || 0; saveData(); });
    document.getElementById('rate-gas').addEventListener('input', (e) => { settings.gasPrice = parseFloat(e.target.value) || 0; saveData(); });

    document.getElementById('leasing-toggle').addEventListener('change', (e) => {
        settings.isMonthlyLease = e.target.checked;
        document.getElementById('leasing-desc').innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
        saveData();
    });
}

// === 5. МЕНЮ ТА МАТЕМАТИКА ===

window.toggleMenu = function(menuId) {
    const overlay = document.getElementById('overlay');
    const plusMenu = document.getElementById('plusMenu');
    const minusMenu = document.getElementById('minusMenu');

    plusMenu.classList.replace('menu-visible', 'menu-hidden');
    minusMenu.classList.replace('menu-visible', 'menu-hidden');
    
    document.getElementById(menuId).classList.replace('menu-hidden', 'menu-visible');
    overlay.classList.replace('overlay-hidden', 'overlay-visible');
};

window.closeMenus = function() {
    document.getElementById('plusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('minusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay').classList.replace('overlay-visible', 'overlay-hidden');
};

window.addIncome = function(type) {
    let inputId, value, addedAmount = 0;

    if (type === 'hours') {
        inputId = 'input-hours';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) addedAmount = value * settings.hourlyRate;
    } else if (type === 'km') {
        inputId = 'input-km';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) addedAmount = value * settings.kmRate;
    } else if (type === 'taxi') {
        inputId = 'input-taxi';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) addedAmount = value;
    } else if (type === 'other') {
        inputId = 'input-other-plus';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) addedAmount = value;
    }

    if (addedAmount > 0) {
        balances.total += addedAmount;
        if (type === 'hours' || type === 'other') balances.work += addedAmount;
        if (type === 'km') balances.comp += addedAmount;
        if (type === 'taxi') balances.taxi += addedAmount;
        
        document.getElementById(inputId).value = '';
        saveData();
        updateDashboard();
        closeMenus();
    }
};

window.addExpense = function(type) {
    let inputId, value, subtractedAmount = 0;

    if (type === 'gas') {
        inputId = 'input-gas-liters';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) subtractedAmount = value * settings.gasPrice;
    } else if (type === 'other') {
        inputId = 'input-other-minus';
        value = parseFloat(document.getElementById(inputId).value);
        if (value) subtractedAmount = value;
    }

    if (subtractedAmount > 0) {
        balances.total -= subtractedAmount;
        balances.gas += subtractedAmount;
        document.getElementById(inputId).value = '';
        saveData();
        updateDashboard();
        closeMenus();
    }
};
