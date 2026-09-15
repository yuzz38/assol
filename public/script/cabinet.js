// cabinet.js — логика личного кабинета (через backend API)

let currentUser = null;
let userAppointments = [];
let cancelTargetId = null;

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const me = await api.me();
    currentUser = me.user;
    if (currentUser) showCabinet(currentUser);
  } catch (e) {
    console.error(e);
  }
});

// Переключение вкладок авторизации
function switchAuthTab(tab) {
  document.querySelectorAll('.cab__tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('regError').style.display = 'none';
}

// Вход
async function login() {
  const loginValue = document.getElementById('loginInput').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!loginValue || !password) {
    errEl.textContent = 'Заполните все поля';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await api.login({ login: loginValue, password });
    currentUser = res.user;
    showCabinet(currentUser);
  } catch (e) {
    errEl.textContent = (e.data && e.data.error) || 'Неверный логин или пароль';
    errEl.style.display = 'block';
  }
}

// Регистрация
async function register() {
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const errEl = document.getElementById('regError');
  errEl.style.display = 'none';

  if (!name || !phone || !password) {
    errEl.textContent = 'Заполните обязательные поля (ФИО, телефон, пароль)';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Пароль должен содержать минимум 6 символов';
    errEl.style.display = 'block';
    return;
  }

  try {
    const res = await api.register({ name, phone, email, password });
    currentUser = res.user;
    showCabinet(currentUser);
  } catch (e) {
    errEl.textContent = (e.data && e.data.error) || 'Ошибка регистрации';
    errEl.style.display = 'block';
  }
}

// Показать кабинет
function showCabinet(user) {
  document.getElementById('authBlock').style.display = 'none';
  document.getElementById('cabinetBlock').style.display = 'block';
  document.getElementById('userName').textContent = user.name;
  renderActiveAppointments();
}

// Выход
async function logout() {
  try { await api.logout(); } catch (e) { /* игнорируем */ }
  currentUser = null;
  document.getElementById('cabinetBlock').style.display = 'none';
  document.getElementById('authBlock').style.display = 'block';
}

// Переключение вкладок кабинета
function switchCabTab(tab) {
  document.querySelectorAll('#cabinetBlock .cab__tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('activeTab').style.display = tab === 'active' ? 'block' : 'none';
  document.getElementById('historyTab').style.display = tab === 'history' ? 'block' : 'none';
  if (tab === 'history') renderHistoryAppointments();
  if (tab === 'active') renderActiveAppointments();
}

// Загрузить записи текущего пользователя с сервера
async function loadAppointments() {
  userAppointments = await api.getAppointments();
}

// Активные записи
async function renderActiveAppointments() {
  const list = document.getElementById('activeList');
  await loadAppointments();
  const appts = userAppointments.filter(a => a.status === 'active');

  if (appts.length === 0) {
    list.innerHTML = '<p class="cab__empty">У вас нет активных записей. <a href="booking.html">Записаться на приём</a></p>';
    return;
  }

  list.innerHTML = appts.map(a => {
    const canCancel = canCancelAppointment(a.date, a.time);
    const canReschedule = canCancelAppointment(a.date, a.time); // то же условие — 48 часов
    return `
      <div class="cab__card cab__card--active">
        <div class="cab__card-info">
          <div class="cab__card-doctor">${a.doctorName}</div>
          <div class="cab__card-spec">${a.doctorSpec}</div>
          <div class="cab__card-date">${formatDateRuFull(a.date)}, ${a.time}</div>
          <div class="cab__card-status cab__card-status--active">Активна</div>
        </div>
        <div class="cab__card-actions">
          ${canReschedule
            ? `<button class="cab__btn cab__btn--secondary" style="background:#f5f5f5;color:#002D70;margin-right:8px;" onclick="openReschedulePage(${a.id})">Перенести</button>`
            : `<span class="cab__hint">Перенос недоступен<br>(менее 48 часов)</span>`
          }
          ${canCancel
            ? `<button class="cab__btn cab__btn--danger" onclick="openCancelModal(${a.id}, '${a.doctorName}', '${a.date}', '${a.time}')">Отменить</button>`
            : `<span class="cab__hint">Отмена недоступна<br>(менее 48 часов)</span>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// История
async function renderHistoryAppointments() {
  const list = document.getElementById('historyList');
  await loadAppointments();
  const appts = userAppointments.filter(a => a.status !== 'active');

  if (appts.length === 0) {
    list.innerHTML = '<p class="cab__empty">История записей пуста</p>';
    return;
  }

  list.innerHTML = appts.map(a => `
    <div class="cab__card cab__card--history">
      <div class="cab__card-info">
        <div class="cab__card-doctor">${a.doctorName}</div>
        <div class="cab__card-spec">${a.doctorSpec}</div>
        <div class="cab__card-date">${formatDateRuFull(a.date)}, ${a.time}</div>
        <div class="cab__card-status cab__card-status--${a.status}">
          ${a.status === 'completed' ? 'Завершена' : 'Отменена'}
        </div>
      </div>
    </div>
  `).join('');
}

// Проверка 48 часов (клиентская подсказка; финальная проверка — на сервере)
function canCancelAppointment(dateStr, time) {
  const apptDate = new Date(`${dateStr}T${time}:00`);
  const now = new Date();
  const diffHours = (apptDate - now) / (1000 * 60 * 60);
  return diffHours > 48;
}

// Открыть модалку отмены
function openCancelModal(id, doctorName, date, time) {
  cancelTargetId = id;
  document.getElementById('cancelDoctorName').textContent = doctorName;
  document.getElementById('cancelDate').textContent = `${formatDateRuFull(date)} в ${time}`;
  document.getElementById('cancelModal').style.display = 'flex';
}

// Подтвердить отмену
async function confirmCancel() {
  try {
    await api.cancelAppointment(cancelTargetId);
  } catch (e) {
    alert((e.data && e.data.error) || 'Не удалось отменить запись');
  }
  closeModal();
  renderActiveAppointments();
}

function closeModal() {
  document.getElementById('cancelModal').style.display = 'none';
  cancelTargetId = null;
}

// Перейти на страницу переноса записи
function openReschedulePage(appointmentId) {
  window.location.href = `reschedule.html?id=${appointmentId}`;
}
