// === 1. ПАМ'ЯТЬ ТА НАЛАШТУВАННЯ ===
let balances = JSON.parse(localStorage.getItem('lexus_balances')) || {
    total: 0,
    work: 0,
    taxi: 0,
    comp: 0,
    gas: 0,
    carPaid: 10000   // Перший внесок вже зроблено
};

let settings = JSON.parse(localStorage.getItem('lexus_settings')) || {
    hourlyRate: 24,
    kmRate: 0.80,
    gasPrice: 3.80,
    isMonthlyLease: false,
    carImageUrl: ""
};

const CAR_TOTAL = 35000;
const LAST_PAYMENT = 1000; // Фінальний платіж завжди 1000 zł

let currentLeasePage = 1;
let maxLeasePages = 1;

function saveData() {
    localStorage.setItem('lexus_balances', JSON.stringify(balances));
    localStorage.setItem('lexus_settings', JSON.stringify(settings));
}

function formatMoney(num) {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
    if (confirm(`Оплатити ${formatMoney(amount)} zł за лізинг?`)) {
        balances.total -= amount;
        balances.carPaid += amount;
        saveData();
        updateDashboard();
    }
};

// === 3. РЕНДЕР ГРАФІКА ЛІЗИНГУ ===

function buildPaymentSchedule() {
    const remainingDebt = CAR_TOTAL - balances.carPaid;
    const stepAmount = settings.isMonthlyLease ? 2400 : 600;
    const payments = [];

    if (remainingDebt <= 0) return payments; // Викуплено

    if (remainingDebt <= LAST_PAYMENT) {
        // Залишилось менше або рівно фінальному платежу
        payments.push(remainingDebt);
    } else {
        const amountBeforeFinal = remainingDebt - LAST_PAYMENT;
        const regularCount = Math.ceil(amountBeforeFinal / stepAmount);

        for (let i = 0; i < regularCount - 1; i++) {
            payments.push(stepAmount);
        }
        // Останній регулярний (може бути менший якщо не ділиться рівно)
        const lastRegular = amountBeforeFinal % stepAmount || stepAmount;
        payments.push(lastRegular);
        // Фінальний платіж 1000
        payments.push(LAST_PAYMENT);
    }

    return payments;
}

function renderLeasingList() {
    const listContainer = document.getElementById('leasing-list');
    const titleContainer = document.getElementById('leasing-page-title');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    titleContainer.innerText = `Виплати Лізинг (Стор. ${currentLeasePage})`;

    const payments = buildPaymentSchedule();
    const periodName = settings.isMonthlyLease ? "Місяць" : "Тиждень";
    const totalPaymentsNeeded = payments.length;

    if (totalPaymentsNeeded === 0) {
        listContainer.innerHTML = `
            <div class="bg-gradient-to-br from-[#e2f5ec] to-[#d1fae5] rounded-[24px] p-6 text-center">
                <p class="text-[22px] mb-1">🎉</p>
                <p class="text-[16px] font-black text-[#20b26c]">Автомобіль викуплений!</p>
                <p class="text-[12px] font-bold text-[#20b26c]/70 mt-1">Lexus CT200h — ваш!</p>
            </div>`;
        return;
    }

    maxLeasePages = Math.ceil(totalPaymentsNeeded / 4);
    if (maxLeasePages === 0) maxLeasePages = 1;
    if (currentLeasePage > maxLeasePages) currentLeasePage = maxLeasePages;

    const itemsPerPage = 4;
    const startIdx = (currentLeasePage - 1) * itemsPerPage;
    const baseDate = new Date();

    for (let i = 0; i < itemsPerPage; i++) {
        const idx = startIdx + i;
        if (idx >= totalPaymentsNeeded) break;

        const currentNum = idx + 1;
        const currentAmount = payments[idx];
        const isLast = idx === totalPaymentsNeeded - 1;

        const date = new Date(baseDate);
        date.setDate(date.getDate() + (currentNum * (settings.isMonthlyLease ? 30 : 7)));
        const dateStr = formatDateUa(date);

        const showPayButton = (currentNum === 1 && currentLeasePage === 1);
        const finalBadge = isLast
            ? `<span class="text-[9px] font-black text-[#20b26c] bg-[#e2f5ec] px-2 py-0.5 rounded-full uppercase ml-2">Фінал</span>`
            : '';

        const html = `
            <div class="bg-white rounded-[24px] p-4 flex justify-between items-center modern-shadow border border-white">
                <div>
                    <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-1">${periodName} ${currentNum}</p>
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-[20px] font-black text-[#1c1c1e]">${formatMoney(currentAmount)} zł</p>
                        ${finalBadge}
                        ${showPayButton ? `
                            <button onclick="payInstallment(${currentAmount})" class="bg-[#ff5252] text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter active:scale-90 transition-transform shadow-md shadow-red-500/20">
                                Оплатити
                            </button>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="bg-[#f2f4f7] text-[#1c1c1e] px-3 py-1.5 rounded-[10px] text-[11px] font-bold">${dateStr}</div>
                    <div class="bg-[#e2f5ec] w-10 h-10 rounded-[12px] flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#20b26c" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>
            </div>`;
        listContainer.insertAdjacentHTML('beforeend', html);
    }
}

window.nextLeasePage = function() { if (currentLeasePage < maxLeasePages) { currentLeasePage++; renderLeasingList(); } };
window.prevLeasePage = function() { if (currentLeasePage > 1) { currentLeasePage--; renderLeasingList(); } };

// === 4. РЕНДЕР АРХІВУ ===

function renderArchive() {
    const container = document.getElementById('archive-list');
    if (!container) return;

    const archive = JSON.parse(localStorage.getItem('lexus_archive')) || [];
    container.innerHTML = '';

    if (archive.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <p class="text-[14px] font-bold text-[#8e8e93]">Архів поки що порожній.</p>
                <p class="text-[12px] font-bold text-[#8e8e93]/70 mt-1">Закрийте поточний місяць, щоб він з'явився тут.</p>
            </div>`;
        return;
    }

    [...archive].reverse().forEach(record => {
        const html = `
            <div class="bg-white rounded-[28px] p-5 modern-shadow border border-white">
                <div class="flex justify-between items-end mb-4">
                    <h3 class="text-[16px] font-black text-[#1c1c1e] capitalize">${record.date}</h3>
                    <div class="bg-[#20b26c]/10 text-[#20b26c] px-3 py-1 rounded-[10px] text-[13px] font-black">
                        + ${formatMoney(record.total)} zł
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Робота</p>
                        <p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.work)} zł</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Таксі</p>
                        <p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.taxi)} zł</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Компенс. П.</p>
                        <p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.comp)} zł</p>
                    </div>
                    <div>
                        <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Витрати (Газ)</p>
                        <p class="text-[14px] font-bold text-[#ff5252]">- ${formatMoney(record.gas)} zł</p>
                    </div>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// === 5. ОНОВЛЕННЯ ІНТЕРФЕЙСУ ===

function updateDashboard() {
    if (!document.getElementById('val-total')) return;

    document.getElementById('val-total').innerText = formatMoney(balances.total) + ' zł';
    document.getElementById('val-work').innerText = '+ ' + formatMoney(balances.work);
    document.getElementById('val-taxi').innerText = '+ ' + formatMoney(balances.taxi);
    document.getElementById('val-comp').innerText = '+ ' + formatMoney(balances.comp);
    document.getElementById('val-gas').innerText = '- ' + formatMoney(balances.gas);

    const percent = Math.min(100, Math.round((balances.carPaid / CAR_TOTAL) * 100));
    document.getElementById('car-paid-text').innerText = formatMoney(balances.carPaid);
    document.getElementById('car-total-text').innerText = `/ ${formatMoney(CAR_TOTAL / 1000)}k zł`;
    document.getElementById('car-percent-badge').innerText = percent + '%';
    document.getElementById('car-progress-bar').style.width = percent + '%';

    const carImgElement = document.getElementById('car-image');
    if (carImgElement) {
        const defaultImg = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop";
        carImgElement.src = settings.carImageUrl && settings.carImageUrl.trim() !== "" ? settings.carImageUrl : defaultImg;
    }

    renderLeasingList();
}

function updateSettingsUI() {
    if (!document.getElementById('rate-hours')) return;
    document.getElementById('rate-hours').value = settings.hourlyRate;
    document.getElementById('rate-km').value = settings.kmRate;
    document.getElementById('rate-gas').value = settings.gasPrice;

    // Оновлюємо поле фото (правильний ID)
    const carImageInput = document.getElementById('input-car-image');
    if (carImageInput) {
        carImageInput.value = settings.carImageUrl || "";
    }

    // Оновлюємо мініатюру фото в налаштуваннях
    const settingsCarImg = document.getElementById('settings-car-thumb');
    if (settingsCarImg) {
        const defaultImg = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=200&auto=format&fit=crop";
        settingsCarImg.src = settings.carImageUrl && settings.carImageUrl.trim() !== "" ? settings.carImageUrl : defaultImg;
    }

    const toggle = document.getElementById('leasing-toggle');
    const desc = document.getElementById('leasing-desc');
    if (toggle) {
        toggle.checked = settings.isMonthlyLease;
        desc.innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();
    updateSettingsUI();
    renderArchive();

    // Слухачі для Settings сторінки
    if (document.getElementById('rate-hours')) {
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
            document.getElementById('leasing-desc').innerText = settings.isMonthlyLease
                ? "Місячно: 2400 zł / міс."
                : "Тижнево: 600 zł / тиж.";
            saveData();
        });
    }

    // Реєстрація Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});

// === 6. МЕНЮ DASHBOARD (+ / -) ===

window.toggleMenu = function(menuId) {
    document.getElementById('plusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('minusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById(menuId).classList.replace('menu-hidden', 'menu-visible');
    document.getElementById('overlay').classList.replace('overlay-hidden', 'overlay-visible');
};

window.closeMenus = function() {
    document.getElementById('plusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('minusMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay').classList.replace('overlay-visible', 'overlay-hidden');
};

// === 7. МЕНЮ SETTINGS ===

window.toggleSettingsMenu = function(menuId) {
    document.getElementById(menuId).classList.replace('menu-hidden', 'menu-visible');
    document.getElementById('overlay-settings').classList.replace('overlay-hidden', 'overlay-visible');
};

window.closeSettingsMenus = function() {
    document.getElementById('photoMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay-settings').classList.replace('overlay-visible', 'overlay-hidden');
};

window.savePhotoUrl = function() {
    const input = document.getElementById('input-car-image');
    if (input) {
        settings.carImageUrl = input.value.trim();
        saveData();
        updateSettingsUI();
        closeSettingsMenus();
        alert("Фото збережено! ✓");
    }
};

// === 8. МАТЕМАТИКА ДОХОДІВ / ВИТРАТ ===

window.addIncome = function(type) {
    let inputId, addedAmount = 0;
    if (type === 'hours')      { inputId = 'input-hours';      let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v * settings.hourlyRate; }
    else if (type === 'km')    { inputId = 'input-km';         let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v * settings.kmRate; }
    else if (type === 'taxi')  { inputId = 'input-taxi';       let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v; }
    else if (type === 'other') { inputId = 'input-other-plus'; let v = parseFloat(document.getElementById(inputId).value); if (v) addedAmount = v; }

    if (addedAmount > 0) {
        balances.total += addedAmount;
        if (type === 'hours' || type === 'other') balances.work += addedAmount;
        if (type === 'km')   balances.comp += addedAmount;
        if (type === 'taxi') balances.taxi += addedAmount;
        document.getElementById(inputId).value = '';
        saveData(); updateDashboard(); closeMenus();
    }
};

window.addExpense = function(type) {
    let inputId, subtractedAmount = 0;
    if (type === 'gas')        { inputId = 'input-gas-liters';  let v = parseFloat(document.getElementById(inputId).value); if (v) subtractedAmount = v * settings.gasPrice; }
    else if (type === 'other') { inputId = 'input-other-minus'; let v = parseFloat(document.getElementById(inputId).value); if (v) subtractedAmount = v; }

    if (subtractedAmount > 0) {
        balances.total -= subtractedAmount;
        balances.gas += subtractedAmount;
        document.getElementById(inputId).value = '';
        saveData(); updateDashboard(); closeMenus();
    }
};

// === 9. ЗАКРИТТЯ МІСЯЦЯ ===

window.closeMonth = function() {
    const hasData = balances.total !== 0 || balances.work !== 0 || balances.taxi !== 0 || balances.comp !== 0 || balances.gas !== 0;
    if (!hasData) {
        alert("Місяць вже порожній, немає що закривати!");
        return;
    }

    if (confirm("Закрити місяць? Баланс обнулиться, результат збережеться в архів.\n(Прогрес авто НЕ обнулиться)")) {
        let archive = JSON.parse(localStorage.getItem('lexus_archive')) || [];

        const dateStr = new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
        archive.push({
            date: dateStr,
            total: balances.total,
            work: balances.work,
            taxi: balances.taxi,
            comp: balances.comp,
            gas: balances.gas
        });

        localStorage.setItem('lexus_archive', JSON.stringify(archive));

        balances.total = 0;
        balances.work  = 0;
        balances.taxi  = 0;
        balances.comp  = 0;
        balances.gas   = 0;

        saveData();
        updateDashboard();
        alert("Місяць закрито! ✓");
    }
};

// === 10. СКИДАННЯ ДОДАТКУ ===

window.resetApp = function() {
    if (confirm("⚠️ Скинути ВЕСЬ додаток?\n\nВидалиться: баланс, архів, фото, налаштування.\nПрогрес авто (сплачено) теж обнулиться до 10 000 zł.")) {
        if (confirm("Остаточно підтверджуєте? Це незворотно!")) {
            localStorage.clear();
            location.reload();
        }
    }
};
