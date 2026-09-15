// utils.js — общие функции форматирования дат (без хранения данных)

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateRu(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function formatDateRuFull(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}
