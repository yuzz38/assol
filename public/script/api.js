// api.js — обёртка для обращения к backend API (вместо localStorage)

const api = (() => {
  async function request(method, url, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch('/api' + url, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* пустой ответ */ }

    if (!res.ok) {
      const err = new Error((data && data.error) || 'Ошибка запроса');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    register: (data) => request('POST', '/register', data),
    login: (data) => request('POST', '/login', data),
    logout: () => request('POST', '/logout'),
    me: () => request('GET', '/me'),

    getDoctors: () => request('GET', '/doctors'),
    getDoctorSlots: (doctorId, days = 14) => request('GET', `/doctors/${doctorId}/slots?days=${days}`),

    getAppointments: () => request('GET', '/appointments'),
    getAppointment: (id) => request('GET', `/appointments/${id}`),
    createAppointment: (doctorId, date, time) => request('POST', '/appointments', { doctorId, date, time }),
    cancelAppointment: (id) => request('PUT', `/appointments/${id}/cancel`),
    rescheduleAppointment: (id, doctorId, date, time) => request('PUT', `/appointments/${id}/reschedule`, { doctorId, date, time })
  };
})();
