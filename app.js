// === 1. ПАМ'ЯТЬ ТА НАЛАШТУВАННЯ ===
let balances = JSON.parse(localStorage.getItem('lexus_balances')) || {
    total: 4250.00,
    work: 1200.00,
    taxi: 450.00,
    comp: 280.00,
    gas: 280.00,
    // Тепер викуп авто зберігається в пам'яті і росте!
    carTotal: 35000,
    carPaid: 1000 
};

let settings = JSON.parse(localStorage.getItem('lexus_settings')) || {
    hourlyRate: 24,
    kmRate: 0.80,
    gasPrice: 3.80,
    isMonthlyLease: false
};

let currentLeasePage = 1; 
let maxLeasePages = 1;    

function saveData() {
    localStorage.setItem('lexus_balances', JSON.stringify(balances));
    localStorage.setItem('lexus_settings', JSON.stringify(settings));
}

function formatMoney(num) {
    return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatDateUa(dateObj) {
    const formatter = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' });
    let parts = formatter.formatToParts(dateObj);
    let day = parts.find(p => p.type === 'day').value;
    let month = parts.find(p => p.type === 'month').value;
    month = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} ${month}`;
}

// === 2. ЛОГІКА ОПЛАТИ ЛІЗИНГУ ===

window.payInstallment = function(amount) {
    if (balances.total < amount) {
        alert("Недостатньо коштів на балансі!");
        return;
    }

    if (confirm(`Оплатити ${amount} zł за лізинг?`)) {
        balances.total -= amount;    // Списуємо з профіту
        balances.carPaid += amount; // Додаємо до викупу авто
        saveData();
        updateDashboard();
        // Анімація успіху (можна додати звук пізніше)
    }
};

// === 3. РЕНДЕР ГРАФІКА ЛІЗИНГУ ===

function renderLeasingList() {
    const listContainer = document.getElementById('leasing-list');
    const titleContainer = document.getElementById('leasing-page-title');
    if (!listContainer) return;

    listContainer.innerHTML = ''; 
    titleContainer.innerText = `Виплати Лізинг (Стор. ${currentLeasePage})`;

    const remainingDebt = balances.carTotal - balances.carPaid;
    const stepAmount = settings.isMonthlyLease ? 2400 : 600;
    const periodName = settings.isMonthlyLease ? "Місяць" : "Тиждень";
    
    const totalPaymentsNeeded = Math.ceil(remainingDebt / stepAmount);
    maxLeasePages = Math.ceil(totalPaymentsNeeded / 4);
    if (maxLeasePages === 0) maxLeasePages = 1;
    if (currentLeasePage > maxLeasePages) currentLeasePage = maxLeasePages;

    const itemsPerPage = 4;
    const startIdx = (currentLeasePage - 1) * itemsPerPage;
    const baseDate = new Date();

    for (let i = 1; i <= itemsPerPage; i++) {
        const currentNum = startIdx + i;
        if (currentNum > totalPaymentsNeeded) break;

        let currentAmount = stepAmount;
        if (currentNum === totalPaymentsNeeded) {
            const remainder = remainingDebt % stepAmount;
            if (remainder !== 0) currentAmount = remainder;
        }

        const date = new Date(baseDate);
        date.setDate(date.getDate() + (currentNum * (settings.isMonthlyLease ? 30 : 7)));
        const dateStr = formatDateUa(date);

        // КНОПКА "ОПЛАТИТИ" ТІЛЬКИ ДЛЯ ПЕРШОГО ПЛАТЕЖУ НА ПЕРШІЙ СТОРІНЦІ
        const showPayButton = (currentNum === 1 && currentLeasePage === 1);

        const html = `
            <div class="bg-white rounded-[24px] p-4 flex justify-between items-center modern-shadow border border-white">
                <div>
                    <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-1">${periodName} ${currentNum}</p>
                    <div class="flex items-center gap-3">
                        <p class="text-[20px] font-black text-[#1c1c1e]">${formatMoney(currentAmount)} zł</p>
                        ${showPayButton ? `
                            <button onclick="payInstallment(${currentAmount})" class="bg-[#ff5252] text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter active:scale-90 transition-transform shadow-md shadow-red-500/20">
                                Оплатити
                            </button>
                        ` : ''}
                    </div>
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

window.nextLeasePage = function() { if (currentLeasePage < maxLeasePages) { currentLeasePage++; renderLeasingList(); } };
window.prevLeasePage = function() { if (currentLeasePage > 1) { currentLeasePage--; renderLeasingList(); } };

// === 4. ОНОВЛЕННЯ ВСЬОГО ІНТЕРФЕЙСУ ===

function updateDashboard() {
    if (!document.getElementById('val-total')) return;

    // 1. Гроші на плитках
    document.getElementById('val-total').innerText = formatMoney(balances.total) + '.00 zł';
    document.getElementById('val-work').innerText = '+ ' + formatMoney(balances.work);
    document.getElementById('val-taxi').innerText = '+ ' + formatMoney(balances.taxi);
    document.getElementById('val-comp').innerText = '+ ' + formatMoney(balances.comp);
    document.getElementById('val-gas').innerText = '- ' + formatMoney(balances.gas);

    // 2. Прогрес-бар авто
    const percent = Math.round((balances.carPaid / balances.carTotal) * 100);
    document.getElementById('car-paid-text').innerText = formatMoney(balances.carPaid);
    document.getElementById('car-total-text').innerText = `/ ${formatMoney(balances.carTotal / 1000)}k zł`;
    document.getElementById('car-percent-badge').innerText = percent + '%';
    document.getElementById('car-progress-bar').style.width = percent + '%';

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
    
    // Слухачі в налаштуваннях
    if (document.getElementById('rate-hours')) {
        document.getElementById('rate-hours').addEventListener('input', (e) => { settings.hourlyRate = parseFloat(e.target.value) || 0; saveData(); });
        document.getElementById('rate-km').addEventListener('input', (e) => { settings.kmRate = parseFloat(e.target.value) || 0; saveData(); });
        document.getElementById('rate-gas').addEventListener('input', (e) => { settings.gasPrice = parseFloat(e.target.value) || 0; saveData(); });
        document.getElementById('leasing-toggle').addEventListener('change', (e) => {
            settings.isMonthlyLease = e.target.checked;
            document.getElementById('leasing-desc').innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
            saveData();
            updateDashboard();
        });
    }
});

// === 5. МЕНЮ ТА МАТЕМАТИКА (+) (-) ===

window.toggleMenu = function(menuId) {
    document.getElementById('plusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('minusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById(menuId).classList.replace('menu-hidden', 'menu-visible');
    document.getElementById('overlay').classList.replace('overlay-hidden', 'overlay-visible');
}

window.closeMenus = function() {
    document.getElementById('plusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('minusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay').classList.replace('overlay-visible', 'overlay-hidden');
}

window.addIncome = function(type) {
    let inputId, addedAmount = 0;
    if (type === 'hours') { inputId = 'input-hours'; let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v * settings.hourlyRate; }
    else if (type === 'km') { inputId = 'input-km'; let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v * settings.kmRate; }
    else if (type === 'taxi') { inputId = 'input-taxi'; let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v; }
    else if (type === 'other') { inputId = 'input-other-plus'; let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v; }

    if (addedAmount > 0) {
        balances.total += addedAmount;
        if (type === 'hours' || type === 'other') balances.work += addedAmount;
        if (type === 'km') balances.comp += addedAmount;
        if (type === 'taxi') balances.taxi += addedAmount;
        document.getElementById(inputId).value = '';
        saveData(); updateDashboard(); closeMenus();
    }
}

window.addExpense = function(type) {
    let inputId, subtractedAmount = 0;
    if (type === 'gas') { inputId = 'input-gas-liters'; let v = parseFloat(document.getElementById(inputId).value); if (v) subtractedAmount = v * settings.gasPrice; }
    else if (type === 'other') { inputId = 'input-other-minus'; let v = parseFloat(document.getElementById(inputId).value); if (v) subtractedAmount = v; }

    if (subtractedAmount > 0) {
        balances.total -= subtractedAmount;
        balances.gas += subtractedAmount;
        document.getElementById(inputId).value = '';
        saveData(); updateDashboard(); closeMenus();
    }
}
