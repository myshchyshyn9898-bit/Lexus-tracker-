// === 1. ПАМ'ЯТЬ ТА НАЛАШТУВАННЯ ===
let balances = JSON.parse(localStorage.getItem('lexus_balances')) || {
    total: 4250.00,
    work: 1200.00,
    taxi: 450.00,
    comp: 280.00,
    gas: 280.00,
    // Дані по автомобілю
    carTotal: 35000,
    carPaid: 10000 
};

let settings = JSON.parse(localStorage.getItem('lexus_settings')) || {
    hourlyRate: 24,
    kmRate: 0.80,
    gasPrice: 3.80,
    isMonthlyLease: false // false = Тиждень, true = Місяць
};

let currentLeasePage = 1; // Поточна сторінка лізингу
let maxLeasePages = 1;    // Максимальна кількість сторінок

function saveData() {
    localStorage.setItem('lexus_balances', JSON.stringify(balances));
    localStorage.setItem('lexus_settings', JSON.stringify(settings));
}

function formatMoney(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Форматування дати з великої літери (напр. "25 Червня")
function formatDateUa(dateObj) {
    const formatter = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
    let parts = formatter.formatToParts(dateObj);
    let day = parts.find(p => p.type === 'day').value;
    let month = parts.find(p => p.type === 'month').value;
    month = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} ${month}`;
}

// === 2. ЛОГІКА І МАТЕМАТИКА ЛІЗИНГУ ===

function renderLeasingList() {
    const listContainer = document.getElementById('leasing-list');
    const titleContainer = document.getElementById('leasing-page-title');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Очищуємо старі плашки
    titleContainer.innerText = `Виплати Лізинг (Стор. ${currentLeasePage})`;

    // Математика залишку
    const remainingDebt = balances.carTotal - balances.carPaid; // 25 000 zł
    const stepAmount = settings.isMonthlyLease ? 2400 : 600;
    const periodName = settings.isMonthlyLease ? "Місяць" : "Тиждень";
    
    // Рахуємо, скільки всього платежів потрібно, щоб закрити борг
    const totalPaymentsNeeded = Math.ceil(remainingDebt / stepAmount);
    
    // Рахуємо, скільки це сторінок (по 4 плашки на сторінку)
    maxLeasePages = Math.ceil(totalPaymentsNeeded / 4);
    if (maxLeasePages === 0) maxLeasePages = 1;

    // Запобіжник, якщо сторінка виходить за межі
    if (currentLeasePage > maxLeasePages) currentLeasePage = maxLeasePages;

    const itemsPerPage = 4;
    const startIdx = (currentLeasePage - 1) * itemsPerPage;

    // Базова дата, від якої рахуємо (сьогодні)
    const baseDate = new Date();

    for (let i = 1; i <= itemsPerPage; i++) {
        const currentNum = startIdx + i;
        
        // Якщо ми дійшли до кінця виплат — перериваємо цикл, не малюємо зайві
        if (currentNum > totalPaymentsNeeded) break;

        // Рахуємо суму платежу (останній платіж може бути меншим за 600 чи 2400)
        let currentAmount = stepAmount;
        if (currentNum === totalPaymentsNeeded) {
            const remainder = remainingDebt % stepAmount;
            if (remainder !== 0) currentAmount = remainder;
        }

        // Генеруємо дату
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (currentNum * (settings.isMonthlyLease ? 30 : 7)));
        const dateStr = formatDateUa(date);

        const html = `
            <div class="bg-white rounded-[24px] p-4 flex justify-between items-center modern-shadow border border-white">
                <div>
                    <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-1">${periodName} ${currentNum}</p>
                    <p class="text-[20px] font-black text-[#1c1c1e]">${formatMoney(currentAmount)} zł</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="bg-[#f2f4f7] text-[#1c1c1e] px-3 py-1.5 rounded-[10px] text-[11px] font-bold">${dateStr}</div>
                    <div class="bg-[#e2f5ec] w-10 h-10 rounded-[12px] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#20b26c" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    }
}

// Кнопки сторінок лізингу
function nextLeasePage() {
    if (currentLeasePage < maxLeasePages) {
        currentLeasePage++;
        renderLeasingList();
    }
}

function prevLeasePage() {
    if (currentLeasePage > 1) {
        currentLeasePage--;
        renderLeasingList();
    }
}

// === 3. ОНОВЛЕННЯ ІНТЕРФЕЙСУ ===

function updateDashboard() {
    if (!document.getElementById('val-total')) return;
    document.getElementById('val-total').innerText = formatMoney(balances.total) + '.00 zł';
    document.getElementById('val-work').innerText = '+ ' + formatMoney(balances.work);
    document.getElementById('val-taxi').innerText = '+ ' + formatMoney(balances.taxi);
    document.getElementById('val-comp').innerText = '+ ' + formatMoney(balances.comp);
    document.getElementById('val-gas').innerText = '- ' + formatMoney(balances.gas);
    renderLeasingList(); // Малюємо плашки при завантаженні
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
    if (!rateHours) return; // Працює тільки на сторінці налаштувань

    rateHours.addEventListener('input', (e) => { settings.hourlyRate = parseFloat(e.target.value) || 0; saveData(); });
    document.getElementById('rate-km').addEventListener('input', (e) => { settings.kmRate = parseFloat(e.target.value) || 0; saveData(); });
    document.getElementById('rate-gas').addEventListener('input', (e) => { settings.gasPrice = parseFloat(e.target.value) || 0; saveData(); });

    document.getElementById('leasing-toggle').addEventListener('change', (e) => {
        settings.isMonthlyLease = e.target.checked;
        document.getElementById('leasing-desc').innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
        saveData();
    });
}

// === 5. МЕНЮ ТА МАТЕМАТИКА (+) (-) ===

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

function addIncome(type) {
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
}

function addExpense(type) {
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
}
