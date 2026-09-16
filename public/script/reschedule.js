// reschedule.js — логика переноса записи (через backend API)

let DOCTORS = [];
let selectedDoctor = null;
let selectedDate = null;
let selectedTime = null;
let originalAppointment = null;

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const appointmentId = parseInt(urlParams.get('id'));

    if (!appointmentId) {
        window.location.href = 'cabinet.html';
        return;
    }

    try {
        originalAppointment = await api.getAppointment(appointmentId);
        // Услуга при переносе не меняется — список врачей ограничен теми,
        // кто оказывает ту же услугу, что была выбрана изначально
        DOCTORS = await api.getDoctorsByService(originalAppointment.serviceId);
    } catch (e) {
        window.location.href = 'cabinet.html';
        return;
    }

    if (!originalAppointment || originalAppointment.status !== 'active') {
        window.location.href = 'cabinet.html';
        return;
    }

    if (!canRescheduleAppointment(originalAppointment.date, originalAppointment.time)) {
        alert('Перенос недоступен: до приёма осталось менее 24 часов');
        window.location.href = 'cabinet.html';
        return;
    }

    // Отображаем старую запись
    document.getElementById('oldAppointmentInfo').innerHTML = `
        <div class="booking__summary-item"><span>Текущая запись:</span></div>
        <div class="booking__summary-item"><span>Услуга:</span> ${originalAppointment.serviceName || '—'}</div>
        <div class="booking__summary-item"><span>Врач:</span> ${originalAppointment.doctorName}</div>
        <div class="booking__summary-item"><span>Дата:</span> ${formatDateRuFull(originalAppointment.date)}</div>
        <div class="booking__summary-item"><span>Время:</span> ${originalAppointment.time}</div>
        <div style="margin-top:12px; color:#c0392b; font-size:13px;">Выберите нового врача (оказывает ту же услугу), новые дату и время (не ранее чем через 24 часа)</div>
    `;

    renderDoctors();
});

function renderDoctors() {
    const list = document.getElementById('doctorList');
    list.innerHTML = DOCTORS.map(d => `
        <div class="booking__doctor-card ${originalAppointment.doctorId === d.id ? 'booking__doctor-card--selected' : ''}" 
             onclick="selectDoctor(${d.id})">
            <img src="${d.img}" alt="${d.name}" onerror="this.src='./img/no-photo.png'">
            <div class="booking__doctor-info">
                <div class="booking__doctor-name">${d.name}</div>
                <div class="booking__doctor-spec">${d.spec}</div>
            </div>
            <div class="booking__doctor-arrow">→</div>
        </div>
    `).join('');

    if (originalAppointment) {
        const doctor = DOCTORS.find(d => d.id === originalAppointment.doctorId);
        if (doctor) selectDoctor(doctor);
    }
}

async function selectDoctor(doctorOrId) {
    selectedDoctor = typeof doctorOrId === 'object' ? doctorOrId : DOCTORS.find(d => d.id === doctorOrId);
    selectedDate = null;
    selectedTime = null;
    goToStep(2);
    renderSelectedDoctor();
    await loadSlotsAndRenderCalendar();
}

function renderSelectedDoctor() {
    document.getElementById('selectedDoctorInfo').innerHTML = `
        <div class="booking__selected-doctor-card">
            <img src="${selectedDoctor.img}" alt="${selectedDoctor.name}" onerror="this.src='./img/no-photo.png'">
            <div><strong>${selectedDoctor.name}</strong><div>${selectedDoctor.spec}</div></div>
        </div>
    `;
}

async function loadSlotsAndRenderCalendar() {
    selectedDoctor.slots = await api.getDoctorSlots(selectedDoctor.id, 14);
    renderCalendar();
}

// Проверка, можно ли записаться на выбранную дату
function canBookOnDate(dateStr) {
    const selectedDateTime = new Date(`${dateStr}T12:00:00`);
    const now = new Date();
    const diffHours = (selectedDateTime - now) / (1000 * 60 * 60);
    // Нельзя записаться на дату, до которой осталось менее 24 часов
    return diffHours >= 24;
}

// Проверка, можно ли перенести запись (исходная) — клиентская подсказка, сервер проверяет повторно
function canRescheduleAppointment(dateStr, time) {
    const apptDate = new Date(`${dateStr}T${time}:00`);
    const now = new Date();
    const diffHours = (apptDate - now) / (1000 * 60 * 60);
    return diffHours > 24;
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const days = [];
    const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);

        // Проверяем, можно ли записаться на эту дату (не ранее 24 часов)
        const canBook = canBookOnDate(dateStr);

        const slots = selectedDoctor.slots[dateStr] || [];
        const hasFree = slots.some(s => s.free);

        // Нельзя выбрать ту же дату, что была, а также даты, до которых менее 24 часов
        const isSameDate = (dateStr === originalAppointment.date);
        const disabled = !hasFree || isSameDate || !canBook;

        days.push(`
            <div class="booking__day ${disabled ? 'booking__day--disabled' : ''} ${selectedDate === dateStr ? 'booking__day--selected' : ''}"
                 onclick="${!disabled ? `selectDate('${dateStr}')` : ''}">
                <div class="booking__day-name">${dayNames[d.getDay()]}</div>
                <div class="booking__day-num">${d.getDate()}</div>
                <div class="booking__day-month">${monthNames[d.getMonth()]}</div>
            </div>
        `);
    }
    grid.innerHTML = days.join('');
    document.getElementById('slotsBlock').style.display = 'none';
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    selectedTime = null;
    document.querySelectorAll('.booking__day').forEach(el => el.classList.remove('booking__day--selected'));
    event.currentTarget.classList.add('booking__day--selected');
    renderSlots(dateStr);
}

function renderSlots(dateStr) {
    const slotsBlock = document.getElementById('slotsBlock');
    const slotsList = document.getElementById('slotsList');
    const slots = selectedDoctor.slots[dateStr] || [];
    const freeSlots = slots.filter(s => s.free);

    slotsBlock.style.display = 'block';

    if (freeSlots.length === 0) {
        slotsList.innerHTML = '<p class="cab__empty">На эту дату нет свободных слотов</p>';
        return;
    }

    slotsList.innerHTML = freeSlots.map(s => {
        // Проверяем конкретное время — до него должно быть не менее 24 часов
        const slotDateTime = new Date(`${dateStr}T${s.time}:00`);
        const now = new Date();
        const diffHours = (slotDateTime - now) / (1000 * 60 * 60);
        const isTimeValid = diffHours >= 24;

        return `
            <div class="booking__slot ${!isTimeValid ? 'booking__slot--disabled' : ''} ${selectedTime === s.time ? 'booking__slot--selected' : ''}"
                 onclick="${isTimeValid ? `selectSlot('${s.time}', this)` : ''}">
                ${s.time} ${!isTimeValid ? '(менее 24 часов)' : ''}
            </div>
        `;
    }).join('');
}

function selectSlot(time, el) {
    selectedTime = time;
    document.querySelectorAll('.booking__slot').forEach(s => s.classList.remove('booking__slot--selected'));
    el.classList.add('booking__slot--selected');
    setTimeout(() => goToStep(3), 300);
    renderBookingSummary();
}

function renderBookingSummary() {
    document.getElementById('bookingSummary').innerHTML = `
        <div class="booking__summary-item"><span>Было:</span> ${formatDateRuFull(originalAppointment.date)} в ${originalAppointment.time}</div>
        <div class="booking__summary-item"><span>Стало:</span> ${formatDateRuFull(selectedDate)} в ${selectedTime}</div>
        <div class="booking__summary-item"><span>Врач:</span> ${selectedDoctor.name}</div>
    `;
}

async function confirmReschedule() {
    const errEl = document.getElementById('bookingError');
    errEl.style.display = 'none';

    try {
        await api.rescheduleAppointment(originalAppointment.id, selectedDoctor.id, selectedDate, selectedTime);

        document.getElementById('successText').innerHTML = `
            Ваша запись перенесена:<br>
            <strong>${selectedDoctor.name}</strong><br>
            ${formatDateRuFull(selectedDate)} в ${selectedTime}<br><br>
            Ждём вас по адресу: г. Нижнеудинск, ул. Кашика, 61
        `;
        goToStep(4);
    } catch (e) {
        errEl.textContent = (e.data && e.data.error) || 'Не удалось перенести запись';
        errEl.style.display = 'block';
        await loadSlotsAndRenderCalendar();
    }
}

function goToStep(n) {
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`step${i}`);
        if (el) el.style.display = i === n ? 'block' : 'none';
    }
    if (n === 3) renderBookingSummary();
}