// booking.js — логика онлайн-записи (через backend API)

let SERVICES = [];
let DOCTORS = [];
let currentUser = null;
let selectedService = null;
let selectedDoctor = null;
let selectedDate = null;
let selectedTime = null;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const [services, me] = await Promise.all([api.getServices(), api.me()]);
    SERVICES = services;
    currentUser = me.user;
    renderServices();

    // Если передана услуга в URL — сразу выбираем её
    const params = new URLSearchParams(window.location.search);
    const sid = parseInt(params.get('service'));
    if (sid) {
      const svc = SERVICES.find(s => s.id === sid);
      if (svc) await selectService(svc);
    }
  } catch (e) {
    console.error(e);
  }
});

// ШАГ 1 — список услуг
function renderServices() {
  const list = document.getElementById('serviceList');
  list.innerHTML = SERVICES.map(s => `
    <div class="booking__doctor-card" onclick="selectService(${s.id})">
      <div class="booking__doctor-info">
        <div class="booking__doctor-name">${s.name}</div>
        <div class="booking__doctor-spec">${s.category}${s.price ? ' · от ' + s.price + ' ₽' : ''}</div>
      </div>
      <div class="booking__doctor-arrow">→</div>
    </div>
  `).join('');
}

async function selectService(serviceOrId) {
  selectedService = typeof serviceOrId === 'object'
    ? serviceOrId
    : SERVICES.find(s => s.id === serviceOrId);
  selectedDoctor = null;
  selectedDate = null;
  selectedTime = null;
  goToStep(2);
  renderSelectedService();
  await loadDoctorsForService();
}

function renderSelectedService() {
  document.getElementById('selectedServiceInfo').innerHTML = `
    <div class="booking__selected-doctor-card">
      <div>
        <strong>${selectedService.name}</strong>
        <div>${selectedService.category}${selectedService.price ? ' · от ' + selectedService.price + ' ₽' : ''}</div>
      </div>
    </div>
  `;
}

// ШАГ 2 — список врачей, оказывающих выбранную услугу
async function loadDoctorsForService() {
  DOCTORS = await api.getDoctorsByService(selectedService.id);
  renderDoctors();
}

function renderDoctors() {
  const list = document.getElementById('doctorList');

  if (DOCTORS.length === 0) {
    list.innerHTML = '<p class="cab__empty">Нет врачей, оказывающих эту услугу. Попробуйте выбрать другую.</p>';
    return;
  }

  list.innerHTML = DOCTORS.map(d => `
    <div class="booking__doctor-card" onclick="selectDoctor(${d.id})">
      <img src="${d.img}" alt="${d.name}" onerror="this.src='./img/no-photo.png'">
      <div class="booking__doctor-info">
        <div class="booking__doctor-name">${d.name}</div>
        <div class="booking__doctor-spec">${d.spec}</div>
      </div>
      <div class="booking__doctor-arrow">→</div>
    </div>
  `).join('');
}

async function selectDoctor(doctorOrId) {
  selectedDoctor = typeof doctorOrId === 'object'
    ? doctorOrId
    : DOCTORS.find(d => d.id === doctorOrId);
  selectedDate = null;
  selectedTime = null;
  goToStep(3);
  renderSelectedDoctor();
  await loadSlotsAndRenderCalendar();
}

// ШАГ 3 — календарь и слоты
function renderSelectedDoctor() {
  document.getElementById('selectedDoctorInfo').innerHTML = `
    <div class="booking__selected-doctor-card">
      <img src="${selectedDoctor.img}" alt="${selectedDoctor.name}" onerror="this.src='./img/no-photo.png'">
      <div>
        <strong>${selectedDoctor.name}</strong>
        <div>${selectedDoctor.spec}</div>
      </div>
    </div>
  `;
}

async function loadSlotsAndRenderCalendar() {
  selectedDoctor.slots = await api.getDoctorSlots(selectedDoctor.id, 14);
  renderCalendar();
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
    const slots = selectedDoctor.slots[dateStr] || [];
    const hasFree = slots.some(s => s.free);

    days.push(`
      <div class="booking__day ${!hasFree ? 'booking__day--disabled' : ''} ${selectedDate === dateStr ? 'booking__day--selected' : ''}"
           onclick="${hasFree ? `selectDate('${dateStr}')` : ''}">
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

  slotsList.innerHTML = freeSlots.map(s => `
    <div class="booking__slot ${selectedTime === s.time ? 'booking__slot--selected' : ''}"
         onclick="selectSlot('${s.time}', this)">
      ${s.time}
    </div>
  `).join('');
}

function selectSlot(time, el) {
  selectedTime = time;
  document.querySelectorAll('.booking__slot').forEach(s => s.classList.remove('booking__slot--selected'));
  el.classList.add('booking__slot--selected');

  // Автоматически переходим к подтверждению
  setTimeout(() => goToStep(4), 300);
  renderBookingSummary();
}

// ШАГ 4 — подтверждение записи
function renderBookingSummary() {
  const patientName = currentUser ? currentUser.name : 'Гость (не авторизован)';
  const patientPhone = currentUser ? currentUser.phone : '—';

  document.getElementById('bookingSummary').innerHTML = `
    <div class="booking__summary-item"><span>Услуга:</span> ${selectedService.name}</div>
    <div class="booking__summary-item"><span>Врач:</span> ${selectedDoctor.name}</div>
    <div class="booking__summary-item"><span>Дата:</span> ${formatDateRuFull(selectedDate)}</div>
    <div class="booking__summary-item"><span>Время:</span> ${selectedTime}</div>
    <div class="booking__summary-item"><span>Пациент:</span> ${patientName}</div>
    <div class="booking__summary-item"><span>Телефон:</span> ${patientPhone}</div>
    ${!currentUser ? '<div style="margin-top:12px;color:#c0392b;font-size:13px;">Для сохранения записи в кабинете <a href="cabinet.html" style="color:#002D70;text-decoration:underline;">авторизуйтесь</a></div>' : ''}
  `;
}

async function confirmBooking() {
  const errEl = document.getElementById('bookingError');
  errEl.style.display = 'none';

  // Если пользователь не авторизован — предлагаем войти
  if (!currentUser) {
    errEl.textContent = 'Для записи необходимо авторизоваться. Перейдите в личный кабинет.';
    errEl.style.display = 'block';
    return;
  }

  try {
    await api.createAppointment(selectedDoctor.id, selectedService.id, selectedDate, selectedTime);

    document.getElementById('successText').innerHTML =
      `Вы записаны на «<strong>${selectedService.name}</strong>» к <strong>${selectedDoctor.name}</strong><br>
       ${formatDateRuFull(selectedDate)} в ${selectedTime}<br><br>
       Ждём вас по адресу: г. Нижнеудинск, ул. Кашика, 61`;
    goToStep(5);
  } catch (e) {
    errEl.textContent = (e.data && e.data.error) || 'Не удалось записаться. Попробуйте другое время.';
    errEl.style.display = 'block';
    // слот мог занять кто-то другой — обновляем календарь
    await loadSlotsAndRenderCalendar();
  }
}

// Навигация по шагам
function goToStep(n) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) el.style.display = i === n ? 'block' : 'none';
  }
  if (n === 4) renderBookingSummary();
}