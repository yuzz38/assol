function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function hoursUntil(dateStr, timeStr) {
  const target = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();
  return (target - now) / (1000 * 60 * 60);
}

module.exports = { formatDate, hoursUntil };
