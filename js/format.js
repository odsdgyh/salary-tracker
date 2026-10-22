const numberFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatSum(amount) {
  return `${numberFormatter.format(amount)} сум`;
}

export function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function typeLabel(type) {
  return type === "income" ? "Доход" : "Расход";
}

export function currentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function inMonth(isoDate, yearMonth) {
  return isoDate.startsWith(yearMonth);
}

export function daysInMonth(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function monthTitle(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export function previousMonthValue(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthDelta(current, previous, invert = false) {
  if (previous === 0 && current === 0) {
    return { text: "без изменений к прошлому месяцу", tone: "flat" };
  }
  if (previous === 0) {
    return { text: "нет данных за прошлый месяц", tone: "muted" };
  }
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const sign = pct > 0 ? "+" : "";
  const improved = invert ? pct < 0 : pct > 0;
  const tone = pct === 0 ? "flat" : improved ? "up" : "down";
  return { text: `${sign}${pct}% к прошлому месяцу`, tone };
}
