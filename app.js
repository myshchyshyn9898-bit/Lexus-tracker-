// === 1. ПАМ'ЯТЬ ТА НАЛАШТУВАННЯ ===
let balances = JSON.parse(localStorage.getItem('lexus_balances')) || {
    total: 0, work: 0, taxi: 0, comp: 0, gas: 0,
    carPaid: 10000
};

let settings = JSON.parse(localStorage.getItem('lexus_settings')) || {
    hourlyRate: 24, kmRate: 0.80, gasPrice: 3.80,
    isMonthlyLease: false, carImageUrl: "",
    startDate: ""  // Дата початку відліку (ISO: "2024-01-15")
};

const CAR_TOTAL = 35000;
const LAST_PAYMENT = 1000;

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
    if (balances.total < amount) { alert("Недостатньо коштів на балансі!"); return; }
    if (confirm(`Оплатити ${formatMoney(amount)} zł за лізинг?`)) {
        balances.total -= amount;
        balances.carPaid += amount;
        const now = new Date();
        localStorage.setItem('lexus_last_lease', JSON.stringify({
            amount, carPaidAfter: balances.carPaid,
            date: now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
        }));
        const dot = document.getElementById('bell-dot');
        if (dot) dot.style.display = '';
        saveData(); updateDashboard();
    }
};

// === 3. РЕНДЕР ГРАФІКА ЛІЗИНГУ ===

function buildPaymentSchedule() {
    const remainingDebt = CAR_TOTAL - balances.carPaid;
    const stepAmount = settings.isMonthlyLease ? 2400 : 600;
    const payments = [];
    if (remainingDebt <= 0) return payments;
    if (remainingDebt <= LAST_PAYMENT) { payments.push(remainingDebt); return payments; }
    const amountBeforeFinal = remainingDebt - LAST_PAYMENT;
    const regularCount = Math.ceil(amountBeforeFinal / stepAmount);
    for (let i = 0; i < regularCount - 1; i++) payments.push(stepAmount);
    payments.push(amountBeforeFinal % stepAmount || stepAmount);
    payments.push(LAST_PAYMENT);
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
        listContainer.innerHTML = `<div class="bg-gradient-to-br from-[#e2f5ec] to-[#d1fae5] rounded-[24px] p-6 text-center"><p class="text-[22px] mb-1">🎉</p><p class="text-[16px] font-black text-[#20b26c]">Автомобіль викуплений!</p><p class="text-[12px] font-bold text-[#20b26c]/70 mt-1">Lexus CT200h — ваш!</p></div>`;
        return;
    }
    maxLeasePages = Math.ceil(totalPaymentsNeeded / 4) || 1;
    if (currentLeasePage > maxLeasePages) currentLeasePage = maxLeasePages;
    const startIdx = (currentLeasePage - 1) * 4;
    const baseDate = new Date();
    for (let i = 0; i < 4; i++) {
        const idx = startIdx + i;
        if (idx >= totalPaymentsNeeded) break;
        const currentNum = idx + 1;
        const currentAmount = payments[idx];
        const isLast = idx === totalPaymentsNeeded - 1;
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (currentNum * (settings.isMonthlyLease ? 30 : 7)));
        const isFirst = (currentNum === 1 && currentLeasePage === 1);
        const finalBadge = isLast ? `<span class="text-[9px] font-black text-[#20b26c] bg-[#e2f5ec] px-2 py-0.5 rounded-full uppercase ml-2">Фінал</span>` : '';

        // Перша картка — тапабельна (відкриває кастомний платіж)
        // Решта — просто інфо
        const cardClick = isFirst ? `onclick="openPayMenu(${currentAmount})" style="cursor:pointer"` : '';
        const rightBlock = isFirst
            ? `<div class="bg-[#ff5252] w-10 h-10 rounded-[12px] flex items-center justify-center shadow-md shadow-red-500/30 flex-shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
               </div>`
            : `<div class="bg-[#e2f5ec] w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#20b26c" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
               </div>`;

        const payHint = isFirst
            ? `<p class="text-[9px] font-bold text-[#ff5252] mt-1 uppercase tracking-wider">Натисни щоб оплатити ›</p>`
            : '';

        listContainer.insertAdjacentHTML('beforeend', `
            <div class="bg-white rounded-[24px] p-4 flex justify-between items-center modern-shadow border border-white active:scale-[0.98] transition-transform" ${cardClick}>
                <div>
                    <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-1">${periodName} ${currentNum}</p>
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-[20px] font-black text-[#1c1c1e]">${formatMoney(currentAmount)} zł</p>
                        ${finalBadge}
                    </div>
                    ${payHint}
                </div>
                <div class="flex items-center gap-3">
                    <div class="bg-[#f2f4f7] text-[#1c1c1e] px-3 py-1.5 rounded-[10px] text-[11px] font-bold">${formatDateUa(date)}</div>
                    ${rightBlock}
                </div>
            </div>`);
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
        container.innerHTML = `<div class="text-center py-10"><p class="text-[14px] font-bold text-[#8e8e93]">Архів поки що порожній.</p><p class="text-[12px] font-bold text-[#8e8e93]/70 mt-1">Закрийте поточний місяць, щоб він з'явився тут.</p></div>`;
        return;
    }
    [...archive].reverse().forEach(record => {
        // FIX #3: показуємо скільки пішло на лізинг цього місяця
        const leaseBadge = record.carPaidDelta > 0
            ? `<div class="bg-[#f0f4ff] text-[#4285f4] px-3 py-1.5 rounded-[14px] text-[11px] font-black mt-3">🚗 Лізинг: -${formatMoney(record.carPaidDelta)} zł · Всього сплачено: ${formatMoney(record.carPaidSnapshot)} zł</div>`
            : '';
        container.insertAdjacentHTML('beforeend', `
            <div class="bg-white rounded-[28px] p-5 modern-shadow border border-white">
                <div class="flex justify-between items-end mb-4">
                    <h3 class="text-[16px] font-black text-[#1c1c1e] capitalize">${record.date}</h3>
                    <div class="bg-[#20b26c]/10 text-[#20b26c] px-3 py-1 rounded-[10px] text-[13px] font-black">+ ${formatMoney(record.total)} zł</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Робота</p><p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.work)} zł</p></div>
                    <div><p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Таксі</p><p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.taxi)} zł</p></div>
                    <div><p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Компенс. П.</p><p class="text-[14px] font-bold text-[#1c1c1e]">${formatMoney(record.comp)} zł</p></div>
                    <div><p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider mb-0.5">Витрати (Газ)</p><p class="text-[14px] font-bold text-[#ff5252]">- ${formatMoney(record.gas)} zł</p></div>
                </div>
                ${leaseBadge}
            </div>`);
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
        carImgElement.src = settings.carImageUrl?.trim() || defaultImg;
    }

    // FIX #1: Реальний % зростання відносно попереднього місяця
    const growthBadge = document.getElementById('growth-badge');
    if (growthBadge) {
        const archive = JSON.parse(localStorage.getItem('lexus_archive')) || [];
        const lastMonthTotal = archive.length > 0 ? archive[archive.length - 1].total : null;
        if (lastMonthTotal !== null && lastMonthTotal !== 0) {
            const growthPct = Math.round((balances.total - lastMonthTotal) / Math.abs(lastMonthTotal) * 100);
            const isPositive = growthPct >= 0;
            growthBadge.style.display = '';
            growthBadge.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    ${isPositive ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>' : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>'}
                </svg>
                <span class="text-[12px] font-black">${isPositive ? '+' : ''}${growthPct}%</span>`;
        } else {
            growthBadge.style.display = 'none';
        }
    }

    renderLeasingList();
}

function updateSettingsUI() {
    if (!document.getElementById('rate-hours')) return;
    document.getElementById('rate-hours').value = settings.hourlyRate;
    document.getElementById('rate-km').value = settings.kmRate;
    document.getElementById('rate-gas').value = settings.gasPrice;
    const carImageInput = document.getElementById('input-car-image');
    if (carImageInput) carImageInput.value = settings.carImageUrl || "";
    const settingsCarImg = document.getElementById('settings-car-thumb');
    if (settingsCarImg) {
        const defaultImg = "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=200&auto=format&fit=crop";
        settingsCarImg.src = settings.carImageUrl?.trim() || defaultImg;
    }
    const startDateInput = document.getElementById('input-start-date');
    if (startDateInput) startDateInput.value = settings.startDate || '';
    updateStartDateStats();
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

    if (document.getElementById('rate-hours')) {
        document.getElementById('rate-hours').addEventListener('input', (e) => { settings.hourlyRate = parseFloat(e.target.value) || 0; saveData(); });
        document.getElementById('rate-km').addEventListener('input', (e) => { settings.kmRate = parseFloat(e.target.value) || 0; saveData(); });
        document.getElementById('rate-gas').addEventListener('input', (e) => { settings.gasPrice = parseFloat(e.target.value) || 0; saveData(); });
        if (document.getElementById('input-start-date')) {
            document.getElementById('input-start-date').addEventListener('change', (e) => {
                settings.startDate = e.target.value;
                saveData();
                updateStartDateStats();
            });
        }
        document.getElementById('leasing-toggle').addEventListener('change', (e) => {
            settings.isMonthlyLease = e.target.checked;
            document.getElementById('leasing-desc').innerText = settings.isMonthlyLease ? "Місячно: 2400 zł / міс." : "Тижнево: 600 zł / тиж.";
            saveData();
        });
    }

    addSwipeToClose('plusMenu', closeMenus);
    addSwipeToClose('minusMenu', closeMenus);
    addSwipeToClose('notifMenu', closeNotifications);
    addSwipeToClose('photoMenu', closeSettingsMenus);

    // FIX #6: checkBellDot тепер всередині DOMContentLoaded — DOM гарантовано готовий
    const actions = JSON.parse(localStorage.getItem('lexus_actions')) || [];
    const payments = buildPaymentSchedule();
    const hasWarning = payments.length > 0 && balances.total < payments[0];
    const dot = document.getElementById('bell-dot');
    if (dot && !hasWarning && actions.length === 0) dot.style.display = 'none';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});

// === 6. МЕНЮ DASHBOARD ===

function haptic(style = 'light') {
    if (window.navigator?.vibrate) {
        navigator.vibrate({ light: 30, medium: 60, heavy: 100 }[style] || 30);
    }
}

function addSwipeToClose(menuId, closeFn) {
    const el = document.getElementById(menuId);
    if (!el) return;
    let startY = 0, startX = 0, isDragging = false;
    el.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; startX = e.touches[0].clientX; isDragging = true; el.style.transition = 'none'; }, { passive: true });
    el.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0 && Math.abs(e.touches[0].clientX - startX) < 50) el.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        el.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)';
        if (e.changedTouches[0].clientY - startY > 80) {
            el.style.transform = 'translateY(150%)';
            setTimeout(() => { closeFn(); el.style.transform = ''; }, 300);
        } else { el.style.transform = ''; }
    }, { passive: true });
}

window.toggleMenu = function(menuId) {
    haptic('light');
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
    if (input) { settings.carImageUrl = input.value.trim(); saveData(); updateSettingsUI(); closeSettingsMenus(); alert("Фото збережено! ✓"); }
};

// === 8. МАТЕМАТИКА ДОХОДІВ / ВИТРАТ (FIX #2 — без monkey patching) ===

function logAction(label, amount, sign) {
    const actions = JSON.parse(localStorage.getItem('lexus_actions')) || [];
    const now = new Date();
    actions.push({
        label, amount, sign,
        time: now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) + ' ' +
              now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
    });
    if (actions.length > 20) actions.splice(0, actions.length - 20);
    localStorage.setItem('lexus_actions', JSON.stringify(actions));
    const dot = document.getElementById('bell-dot');
    if (dot) dot.style.display = '';
}

window.addIncome = function(type) {
    const cfg = {
        hours: { inputId: 'input-hours',     label: 'Робота (год.)' },
        km:    { inputId: 'input-km',         label: 'Компенс. км'  },
        taxi:  { inputId: 'input-taxi',       label: 'Таксі'        },
        other: { inputId: 'input-other-plus', label: 'Інше (+)'     }
    };
    const { inputId, label } = cfg[type];
    const v = parseFloat(document.getElementById(inputId).value);
    if (!v || v <= 0) return;
    // Рахуємо суму один раз
    const amount = type === 'hours' ? v * settings.hourlyRate
                 : type === 'km'    ? v * settings.kmRate
                 : v;
    haptic('medium');
    balances.total += amount;
    if (type === 'hours' || type === 'other') balances.work += amount;
    if (type === 'km')                        balances.comp += amount;
    if (type === 'taxi')                      balances.taxi += amount;
    logAction(label, amount, '+');
    document.getElementById(inputId).value = '';
    saveData(); updateDashboard(); closeMenus();
};

window.addExpense = function(type) {
    const cfg = {
        gas:   { inputId: 'input-gas-liters',  label: 'Газ (літри)' },
        other: { inputId: 'input-other-minus', label: 'Інше (-)'    }
    };
    const { inputId, label } = cfg[type];
    const v = parseFloat(document.getElementById(inputId).value);
    if (!v || v <= 0) return;
    const amount = type === 'gas' ? v * settings.gasPrice : v;
    haptic('medium');
    balances.total -= amount;
    balances.gas += amount;
    logAction(label, amount, '-');
    document.getElementById(inputId).value = '';
    saveData(); updateDashboard(); closeMenus();
};

// === 9. ЗАКРИТТЯ МІСЯЦЯ ===

window.closeMonth = function() {
    const hasData = balances.total !== 0 || balances.work !== 0 || balances.taxi !== 0 || balances.comp !== 0 || balances.gas !== 0;
    if (!hasData) { alert("Місяць вже порожній, немає що закривати!"); return; }
    if (confirm("Закрити місяць? Баланс обнулиться, результат збережеться в архів.\n(Прогрес авто НЕ обнулиться)")) {
        let archive = JSON.parse(localStorage.getItem('lexus_archive')) || [];
        // FIX #3: зберігаємо snapshot carPaid і delta відносно попереднього запису
        const prevSnapshot = archive.length > 0 ? archive[archive.length - 1].carPaidSnapshot : 10000;
        archive.push({
            date: new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }),
            total: balances.total,
            work: balances.work, taxi: balances.taxi, comp: balances.comp, gas: balances.gas,
            carPaidSnapshot: balances.carPaid,
            carPaidDelta: balances.carPaid - prevSnapshot
        });
        localStorage.setItem('lexus_archive', JSON.stringify(archive));
        balances.total = balances.work = balances.taxi = balances.comp = balances.gas = 0;
        saveData(); updateDashboard();
        alert("Місяць закрито! ✓");
    }
};

// === 10. СКИДАННЯ ДОДАТКУ ===

window.resetApp = function() {
    if (confirm("⚠️ Скинути ВЕСЬ додаток?\n\nВидалиться: баланс, архів, фото, налаштування.\nПрогрес авто (сплачено) теж обнулиться до 10 000 zł.")) {
        if (confirm("Остаточно підтверджуєте? Це незворотно!")) { localStorage.clear(); location.reload(); }
    }
};

// === 11. СПОВІЩЕННЯ ===

function buildNotifications() {
    const items = [];
    const remaining = CAR_TOTAL - balances.carPaid;
    const payments = buildPaymentSchedule();
    if (remaining <= 0) {
        items.push({ type: 'success', icon: '🎉', title: 'Автомобіль викуплений!', desc: 'Lexus CT200h повністю твій.' });
        return items;
    }
    if (payments.length > 0) {
        const nextAmount = payments[0];
        const isLast = payments.length === 1;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (settings.isMonthlyLease ? 30 : 7));
        items.push({ type: isLast ? 'final' : 'info', icon: isLast ? '🏁' : '🗓',
            title: `${isLast ? 'Фінальний' : 'Наступний'} платіж — ${formatMoney(nextAmount)} zł`,
            desc: `До ${formatDateUa(nextDate)} (залишилось ${payments.length} виплат)` });
    }
    if (payments.length > 0 && balances.total < payments[0]) {
        items.push({ type: 'warn', icon: '⚠️', title: 'Не вистачає на платіж',
            desc: `Потрібно ще ${formatMoney(payments[0] - balances.total)} zł. Баланс: ${formatMoney(balances.total)} zł` });
    } else if (payments.length > 0) {
        items.push({ type: 'success', icon: '✅', title: 'Баланс достатній',
            desc: `${formatMoney(balances.total)} zł — вистачає на наступний платіж` });
    }
    const totalIncome = balances.work + balances.taxi + balances.comp;
    items.push({ type: 'stat', icon: '📊', title: 'Підсумок цього місяця',
        desc: `Зароблено: +${formatMoney(totalIncome)} zł · Газ: -${formatMoney(balances.gas)} zł · Чистий: ${formatMoney(balances.total)} zł` });
    items.push({ type: 'car', icon: '🚗', title: `Авто: ${Math.round(balances.carPaid / CAR_TOTAL * 100)}% викуплено`,
        desc: `Сплачено ${formatMoney(balances.carPaid)} zł з ${formatMoney(CAR_TOTAL)} zł · Залишок: ${formatMoney(remaining)} zł` });
    const lastActions = JSON.parse(localStorage.getItem('lexus_actions')) || [];
    if (lastActions.length > 0) {
        items.push({ type: 'divider', title: 'Останні дії' });
        lastActions.slice(-5).reverse().forEach(a =>
            items.push({ type: 'action', icon: a.sign === '+' ? '💰' : '🔻', title: a.label, desc: a.sign + formatMoney(a.amount) + ' zł · ' + a.time }));
    }
    return items;
}

function renderNotifications() {
    const container = document.getElementById('notif-content');
    if (!container) return;
    container.innerHTML = '';
    const colors = { info: { bg:'#f0f4ff', text:'#4285f4' }, warn: { bg:'#fff8e6', text:'#fbbc04' }, success: { bg:'#e2f5ec', text:'#20b26c' }, final: { bg:'#fff0f0', text:'#ff5252' }, stat: { bg:'#f2f4f7', text:'#1c1c1e' }, car: { bg:'#f0f4ff', text:'#4285f4' }, action: { bg:'#f9f9f9', text:'#1c1c1e' } };
    buildNotifications().forEach(item => {
        if (item.type === 'divider') { container.insertAdjacentHTML('beforeend', `<p class="text-[10px] font-extrabold text-[#8e8e93] uppercase tracking-wider pt-2 px-1">${item.title}</p>`); return; }
        const c = colors[item.type] || colors.stat;
        container.insertAdjacentHTML('beforeend', `<div class="rounded-[20px] p-4 flex items-start gap-3" style="background:${c.bg}"><span class="text-[20px] leading-none mt-0.5">${item.icon}</span><div><p class="font-black text-[13px] text-[#1c1c1e] leading-snug">${item.title}</p><p class="text-[11px] font-bold mt-0.5" style="color:${c.text}">${item.desc}</p></div></div>`);
    });
}

window.openNotifications = function() {
    renderNotifications();
    document.getElementById('notifMenu').classList.replace('menu-hidden', 'menu-visible');
    document.getElementById('overlay-notif').classList.replace('overlay-hidden', 'overlay-visible');
    const dot = document.getElementById('bell-dot');
    if (dot) dot.style.display = 'none';
    localStorage.setItem('lexus_notif_seen', Date.now());
};
window.closeNotifications = function() {
    document.getElementById('notifMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay-notif').classList.replace('overlay-visible', 'overlay-hidden');
};

// === 12. БЕКАП ДАНИХ (FIX #4) ===

window.exportData = function() {
    const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        balances: JSON.parse(localStorage.getItem('lexus_balances') || 'null'),
        settings: JSON.parse(localStorage.getItem('lexus_settings') || 'null'),
        archive:  JSON.parse(localStorage.getItem('lexus_archive')  || '[]'),
        actions:  JSON.parse(localStorage.getItem('lexus_actions')  || '[]'),
        lastLease: JSON.parse(localStorage.getItem('lexus_last_lease') || 'null')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lexus-backup-${new Date().toLocaleDateString('uk-UA').replace(/\./g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
};

window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!data.balances || !data.settings) throw new Error('Невірний формат файлу');
                if (!confirm('Відновити дані з резервної копії?\nПоточні дані будуть замінені.')) return;
                if (data.balances)  localStorage.setItem('lexus_balances',   JSON.stringify(data.balances));
                if (data.settings)  localStorage.setItem('lexus_settings',   JSON.stringify(data.settings));
                if (data.archive)   localStorage.setItem('lexus_archive',    JSON.stringify(data.archive));
                if (data.actions)   localStorage.setItem('lexus_actions',    JSON.stringify(data.actions));
                if (data.lastLease) localStorage.setItem('lexus_last_lease', JSON.stringify(data.lastLease));
                alert('Дані відновлено! ✓');
                location.reload();
            } catch (err) { alert('Помилка: ' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
};

// === 13. СПОВІЩЕННЯ (LOCAL PUSH) ===

// Типи нотифікацій з різним контентом
const NOTIFICATION_TEMPLATES = {
    paymentSoon: (days, amount) => ({
        title: `🗓 Платіж через ${days} ${days === 1 ? 'день' : 'дні'}`,
        body: `${formatMoney(amount)} zł · Залишок боргу: ${formatMoney(CAR_TOTAL - balances.carPaid)} zł`,
        tag: 'lease-payment',
        urgent: false
    }),
    paymentToday: (amount) => ({
        title: '🔴 Сьогодні платіж за лізинг',
        body: `${formatMoney(amount)} zł потрібно оплатити зараз`,
        tag: 'lease-payment',
        urgent: true
    }),
    balanceLow: (deficit) => ({
        title: '⚠️ Не вистачає на платіж',
        body: `Потрібно ще ${formatMoney(deficit)} zł · Поповни баланс`,
        tag: 'balance-warning',
        urgent: true
    }),
    balanceOk: (amount) => ({
        title: '✅ Баланс готовий до платежу',
        body: `На рахунку ${formatMoney(amount)} zł — вистачає`,
        tag: 'balance-ok',
        urgent: false
    }),
    milestone: (percent) => ({
        title: `🏆 ${percent}% Lexus вже твій!`,
        body: `Сплачено ${formatMoney(balances.carPaid)} zł з ${formatMoney(CAR_TOTAL)} zł · Так тримати!`,
        tag: 'milestone',
        urgent: false
    })
};

async function sendNotification(template) {
    const sw = await navigator.serviceWorker.ready;
    const periodDays = settings.isMonthlyLease ? 30 : 7;

    const options = {
        body: template.body,
        icon: './apple-touch-icon.png',      // Фото твого Lexus
        badge: './badge.png',                 // Маленька іконка в статус-барі
        image: './notif-image.jpg',           // Велике фото авто (Android)
        tag: template.tag,
        renotify: true,
        vibrate: template.urgent ? [200, 100, 200, 100, 200] : [100, 50, 100],
        silent: false,
        data: { url: './Dashboard.html', timestamp: Date.now() },
        actions: [
            { action: 'open', title: '📱 Відкрити' },
            { action: 'dismiss', title: 'Пізніше' }
        ]
    };

    // Надсилаємо через SW щоб iOS бачив як "нативну" нотифікацію
    sw.active?.postMessage({ type: 'SHOW_NOTIFICATION', title: template.title, options });
}

async function checkAndNotify() {
    if (Notification.permission !== 'granted') return;

    const payments = buildPaymentSchedule();
    if (payments.length === 0) return;

    const nextAmount = payments[0];
    const periodDays = settings.isMonthlyLease ? 30 : 7;
    const lastCheck = parseInt(localStorage.getItem('lexus_notif_last_check') || '0');
    const now = Date.now();

    // Перевіряємо раз на 6 годин щоб не спамити
    if (now - lastCheck < 6 * 60 * 60 * 1000) return;
    localStorage.setItem('lexus_notif_last_check', now.toString());

    const lastPayment = JSON.parse(localStorage.getItem('lexus_last_lease') || 'null');
    const daysSincePayment = lastPayment
        ? Math.floor((now - new Date(lastPayment.date).getTime()) / 86400000)
        : periodDays; // якщо немає запису — вважаємо що пора

    const daysUntilPayment = Math.max(0, periodDays - daysSincePayment);

    // Milestone нотифікації (28%, 50%, 75%, 90%)
    const percent = Math.round(balances.carPaid / CAR_TOTAL * 100);
    const milestones = [25, 50, 75, 90];
    const lastMilestone = parseInt(localStorage.getItem('lexus_last_milestone') || '0');
    const newMilestone = milestones.filter(m => m <= percent && m > lastMilestone).pop();
    if (newMilestone) {
        localStorage.setItem('lexus_last_milestone', newMilestone.toString());
        await sendNotification(NOTIFICATION_TEMPLATES.milestone(newMilestone));
        return;
    }

    // Платіж сьогодні
    if (daysUntilPayment === 0) {
        await sendNotification(NOTIFICATION_TEMPLATES.paymentToday(nextAmount));
        return;
    }

    // Платіж скоро (за 1 або 2 дні)
    if (daysUntilPayment <= 2) {
        if (balances.total < nextAmount) {
            const deficit = nextAmount - balances.total;
            await sendNotification(NOTIFICATION_TEMPLATES.balanceLow(deficit));
        } else {
            await sendNotification(NOTIFICATION_TEMPLATES.paymentSoon(daysUntilPayment, nextAmount));
        }
        return;
    }

    // Баланс щойно став достатній (раніше не вистачало)
    const wasLow = localStorage.getItem('lexus_was_balance_low') === 'true';
    if (wasLow && balances.total >= nextAmount) {
        localStorage.setItem('lexus_was_balance_low', 'false');
        await sendNotification(NOTIFICATION_TEMPLATES.balanceOk(balances.total));
    }
    localStorage.setItem('lexus_was_balance_low', (balances.total < nextAmount).toString());
}

window.requestNotifPermission = async function() {
    const btn = document.getElementById('notif-toggle-btn');
    if (Notification.permission === 'granted') {
        // Тест — показати демо нотифікацію
        await sendNotification({
            title: '🚗 LexusTracker PRO',
            body: 'Нотифікації працюють! Ти будеш отримувати нагадування про платежі.',
            tag: 'test',
            urgent: false
        });
        return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
        updateNotifButtonState();
        // Одразу показуємо welcome-нотифікацію
        await sendNotification({
            title: '✅ Нотифікації увімкнено!',
            body: 'Будеш отримувати нагадування за 2 дні до платежу.',
            tag: 'welcome',
            urgent: false
        });
    } else {
        alert('Дозвіл відхилено. Увімкни в Налаштуваннях → Safari/Notifications.');
    }
};

function updateNotifButtonState() {
    const btn = document.getElementById('notif-toggle-btn');
    const desc = document.getElementById('notif-toggle-desc');
    if (!btn) return;
    if (Notification.permission === 'granted') {
        btn.classList.remove('bg-[#f2f4f7]');
        btn.classList.add('bg-[#e2f5ec]');
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#20b26c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;
        if (desc) desc.innerText = 'Натисни щоб перевірити · Надіслати тест';
    } else {
        if (desc) desc.innerText = 'Нагадування за 2 дні до платежу';
    }
}

// Викликаємо при кожному відкритті додатку
document.addEventListener('DOMContentLoaded', () => {
    updateNotifButtonState();
    if ('Notification' in window) checkAndNotify();
});

// === 14. ТЕМА (Світла / Темна / Системна) ===

window.setTheme = function(theme) {
    if (theme === 'system') {
        localStorage.removeItem('lexus_theme');
        document.documentElement.removeAttribute('data-theme');
        // Застосовуємо системну
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        localStorage.setItem('lexus_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }
    updateThemeButtons();
};

function updateThemeButtons() {
    const saved = localStorage.getItem('lexus_theme');
    const current = saved || 'system';

    const labels = { light: 'Світла тема', dark: 'Темна тема', system: 'Системна тема' };
    const desc = document.getElementById('theme-current-desc');
    if (desc) desc.innerText = labels[current];

    ['light', 'dark', 'system'].forEach(t => {
        const btn = document.getElementById(`theme-btn-${t}`);
        if (!btn) return;
        if (t === current) {
            btn.classList.remove('theme-btn-inactive');
            btn.classList.add('theme-btn-active');
        } else {
            btn.classList.remove('theme-btn-active');
            btn.classList.add('theme-btn-inactive');
        }
    });
}

// Слухаємо зміну системної теми
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('lexus_theme')) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізуємо системну тему якщо не вибрано вручну
    if (!localStorage.getItem('lexus_theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    updateThemeButtons();
});

// === 15. КАСТОМНИЙ ПЛАТІЖ ЛІЗИНГУ ===

let _payModalSuggestedAmount = 0;

window.openPayMenu = function(suggestedAmount) {
    _payModalSuggestedAmount = suggestedAmount;
    const remaining = CAR_TOTAL - balances.carPaid;

    // Заповнюємо інфо
    document.getElementById('pay-modal-balance').innerText = formatMoney(balances.total) + ' zł';
    document.getElementById('pay-modal-debt').innerText    = formatMoney(remaining) + ' zł';

    // Інпут — стандартна сума
    const input = document.getElementById('pay-custom-input');
    input.value = suggestedAmount;
    input.max = Math.min(balances.total, remaining);

    // Швидкі кнопки: стандарт, +50%, +100%, весь борг
    const step = settings.isMonthlyLease ? 2400 : 600;
    const quickAmounts = [
        { label: `${formatMoney(step)} zł`, val: step, hint: 'Стандарт' },
        { label: `${formatMoney(step * 1.5)} zł`, val: step * 1.5, hint: '+50%' },
        { label: `${formatMoney(step * 2)} zł`, val: step * 2, hint: '×2' },
        { label: `${formatMoney(remaining)} zł`, val: remaining, hint: 'Весь борг' }
    ].filter(q => q.val <= balances.total && q.val <= remaining && q.val > 0);

    // Унікальні суми
    const seen = new Set();
    const btnsEl = document.getElementById('pay-quick-btns');
    btnsEl.innerHTML = '';
    quickAmounts.forEach(q => {
        if (seen.has(q.val)) return;
        seen.add(q.val);
        btnsEl.insertAdjacentHTML('beforeend', `
            <button onclick="setPayAmount(${q.val})"
                    class="flex-1 bg-[#f2f4f7] rounded-[14px] py-2 px-1 text-center active:scale-95 transition-transform">
                <p class="text-[10px] font-extrabold text-[#8e8e93] uppercase">${q.hint}</p>
                <p class="text-[12px] font-black text-[#1c1c1e] mt-0.5">${q.label}</p>
            </button>`);
    });

    updatePayModal();
    addSwipeToClose('payMenu', closePayMenu);

    document.getElementById('payMenu').classList.replace('menu-hidden', 'menu-visible');
    document.getElementById('overlay-pay').classList.replace('overlay-hidden', 'overlay-visible');
    haptic('light');
    setTimeout(() => input.focus(), 300);
};

window.setPayAmount = function(amount) {
    document.getElementById('pay-custom-input').value = amount;
    updatePayModal();
};

window.updatePayModal = function() {
    const val      = parseFloat(document.getElementById('pay-custom-input').value) || 0;
    const remaining = CAR_TOTAL - balances.carPaid;
    const preview  = document.getElementById('pay-preview');
    const previewTxt = document.getElementById('pay-preview-text');
    const warning  = document.getElementById('pay-warning');
    const warningTxt = document.getElementById('pay-warning-text');
    const btn      = document.getElementById('pay-confirm-btn');

    warning.classList.add('hidden');
    preview.classList.add('hidden');
    btn.disabled = false;
    btn.classList.remove('opacity-40');

    if (val <= 0) {
        btn.disabled = true;
        btn.classList.add('opacity-40');
        return;
    }

    // Попередження
    if (val > balances.total) {
        warning.classList.remove('hidden');
        warningTxt.innerText = `⚠️ Не вистачає балансу · Бракує ${formatMoney(val - balances.total)} zł`;
        btn.disabled = true; btn.classList.add('opacity-40');
        return;
    }
    if (val > remaining) {
        warning.classList.remove('hidden');
        warningTxt.innerText = `⚠️ Сума більша за борг · Максимум ${formatMoney(remaining)} zł`;
        btn.disabled = true; btn.classList.add('opacity-40');
        return;
    }

    // Прев'ю: рахуємо новий графік після оплати
    const newCarPaid = balances.carPaid + val;
    const newRemaining = CAR_TOTAL - newCarPaid;
    const step = settings.isMonthlyLease ? 2400 : 600;
    const period = settings.isMonthlyLease ? 'міс.' : 'тиж.';

    if (newRemaining <= 0) {
        previewTxt.innerText = `🎉 Автомобіль буде повністю викуплений!`;
    } else {
        const newPayments = Math.ceil(Math.max(0, newRemaining - 1000) / step) + (newRemaining > 1000 ? 1 : 0);
        const weeksSkipped = Math.floor((val - _payModalSuggestedAmount) / step);
        let txt = `Залишок боргу: ${formatMoney(newRemaining)} zł · ~${newPayments} виплат`;
        if (weeksSkipped > 0) txt += ` · ⚡ На ${weeksSkipped} ${period} менше`;
        previewTxt.innerText = txt;
    }

    preview.classList.remove('hidden');
    btn.innerText = `Оплатити ${formatMoney(val)} zł`;
};

window.confirmCustomPayment = function() {
    const val = parseFloat(document.getElementById('pay-custom-input').value) || 0;
    if (val <= 0 || val > balances.total || val > CAR_TOTAL - balances.carPaid) return;

    closePayMenu();
    // Невелика затримка щоб меню закрилось красиво
    setTimeout(() => {
        if (confirm(`Оплатити ${formatMoney(val)} zł за лізинг?`)) {
            balances.total    -= val;
            balances.carPaid  += val;
            const now = new Date();
            localStorage.setItem('lexus_last_lease', JSON.stringify({
                amount: val, carPaidAfter: balances.carPaid,
                date: now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }),
                time: now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
            }));
            logAction('Лізинг', val, '-');
            haptic('heavy');
            saveData();
            updateDashboard();
        }
    }, 350);
};

window.closePayMenu = function() {
    document.getElementById('payMenu').classList.replace('menu-visible', 'menu-hidden');
    document.getElementById('overlay-pay').classList.replace('overlay-visible', 'overlay-hidden');
};

// === 16. SHORTCUTS (Long Press на іконці) ===

(function handleShortcuts() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (!action) return;

    // Прибираємо параметр з URL без перезавантаження
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    // Чекаємо поки DOM і дані готові
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            switch (action) {
                case 'add-hours':
                    toggleMenu('plusMenu');
                    setTimeout(() => document.getElementById('input-hours')?.focus(), 400);
                    break;
                case 'add-taxi':
                    toggleMenu('plusMenu');
                    setTimeout(() => document.getElementById('input-taxi')?.focus(), 400);
                    break;
                case 'add-gas':
                    toggleMenu('minusMenu');
                    setTimeout(() => document.getElementById('input-gas-liters')?.focus(), 400);
                    break;
                case 'pay-lease': {
                    const payments = buildPaymentSchedule();
                    if (payments.length > 0) openPayMenu(payments[0]);
                    break;
                }
            }
        }, 350); // Невелика затримка щоб анімація входу завершилась
    });
})();

// === 17. ДАТА СТАРТУ ===

function updateStartDateStats() {
    const el = document.getElementById('start-date-stats');
    if (!el) return;

    if (!settings.startDate) {
        el.innerHTML = `<p class="text-[11px] font-bold text-[#8e8e93]">Встанови дату — побачиш статистику з першого дня</p>`;
        return;
    }

    const start   = new Date(settings.startDate);
    const now     = new Date();
    const diffMs  = now - start;
    const days    = Math.floor(diffMs / 86400000);
    const weeks   = Math.floor(days / 7);
    const months  = Math.floor(days / 30.44);

    // Загальний заробіток з архіву + поточний місяць
    const archive = JSON.parse(localStorage.getItem('lexus_archive')) || [];
    const totalEarned = archive.reduce((s, r) => s + (r.total || 0), 0) + balances.total;
    const totalGas    = archive.reduce((s, r) => s + (r.gas   || 0), 0) + balances.gas;
    const totalLease  = balances.carPaid - 10000; // мінус перший внесок

    const avgPerMonth = months > 0 ? Math.round(totalEarned / months) : totalEarned;
    const netProfit   = totalEarned - totalGas - totalLease;

    // Прогноз закриття лізингу
    const remaining = CAR_TOTAL - balances.carPaid;
    const monthsLeft = avgPerMonth > 0
        ? Math.ceil(remaining / (settings.isMonthlyLease ? 2400 : 2400))
        : null;

    const periodLabel = months >= 1
        ? `${months} міс.`
        : `${weeks} тиж.`;

    el.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            <div class="bg-[#f0f4ff] rounded-[14px] p-3">
                <p class="text-[10px] font-extrabold text-[#4285f4] uppercase tracking-wider">Відслідковую</p>
                <p class="text-[16px] font-black text-[#1c1c1e] mt-0.5">${periodLabel}</p>
                <p class="text-[10px] font-bold text-[#8e8e93] mt-0.5">${days} днів</p>
            </div>
            <div class="bg-[#e2f5ec] rounded-[14px] p-3">
                <p class="text-[10px] font-extrabold text-[#20b26c] uppercase tracking-wider">Середній/міс</p>
                <p class="text-[16px] font-black text-[#1c1c1e] mt-0.5">${formatMoney(avgPerMonth)} zł</p>
                <p class="text-[10px] font-bold text-[#8e8e93] mt-0.5">за весь час</p>
            </div>
            <div class="bg-[#fff0f0] rounded-[14px] p-3">
                <p class="text-[10px] font-extrabold text-[#ff5252] uppercase tracking-wider">Витрати</p>
                <p class="text-[16px] font-black text-[#1c1c1e] mt-0.5">${formatMoney(totalGas + totalLease)} zł</p>
                <p class="text-[10px] font-bold text-[#8e8e93] mt-0.5">газ + лізинг</p>
            </div>
            <div class="${netProfit >= 0 ? 'bg-[#e2f5ec]' : 'bg-[#fff0f0]'} rounded-[14px] p-3">
                <p class="text-[10px] font-extrabold ${netProfit >= 0 ? 'text-[#20b26c]' : 'text-[#ff5252]'} uppercase tracking-wider">Чистий профіт</p>
                <p class="text-[16px] font-black text-[#1c1c1e] mt-0.5">${netProfit >= 0 ? '+' : ''}${formatMoney(netProfit)} zł</p>
                <p class="text-[10px] font-bold text-[#8e8e93] mt-0.5">за весь час</p>
            </div>
        </div>
        ${monthsLeft ? `
        <div class="mt-2 bg-[#f2f4f7] rounded-[14px] p-3 flex items-center gap-2">
            <span class="text-[16px]">🚗</span>
            <p class="text-[11px] font-bold text-[#1c1c1e]">Лізинг закриється приблизно через <span class="text-[#ff5252]">${monthsLeft} міс.</span></p>
        </div>` : ''}`;
}
