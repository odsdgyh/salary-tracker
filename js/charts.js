let barChart = null;
let pieChart = null;

const piePalette = [
  "#5b8def",
  "#7b6cf6",
  "#e07a3d",
  "#c9a227",
  "#b45bb0",
  "#4aa3d9",
  "#8b5cf6",
  "#f59e0b",
  "#6366f1",
  "#0ea5e9",
];

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animationOptions() {
  return prefersReducedMotion()
    ? false
    : { duration: 450, easing: "easeOutQuart" };
}

function themeColors() {
  return {
    text: cssVar("--chart-text", "#3d4450"),
    muted: cssVar("--muted", "#6b7280"),
    grid: cssVar("--chart-grid", "rgba(0,0,0,0.08)"),
    income: cssVar("--income", "#2f9e6b"),
    expense: cssVar("--expense", "#d64545"),
  };
}

export function renderBarChart(canvas, labels, income, expense) {
  if (barChart) {
    barChart.destroy();
  }
  const colors = themeColors();
  barChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Доходы",
          data: income,
          backgroundColor: colors.income,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: "bottom",
          categoryPercentage: 0.86,
          barPercentage: 0.94,
        },
        {
          label: "Расходы",
          data: expense,
          backgroundColor: colors.expense,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: "bottom",
          categoryPercentage: 0.86,
          barPercentage: 0.94,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: animationOptions(),
      plugins: {
        legend: { labels: { color: colors.text, usePointStyle: true } },
      },
      scales: {
        x: {
          ticks: { color: colors.muted, maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted },
          grid: { color: colors.grid },
          border: { display: false },
        },
      },
    },
  });
}

export function renderPieChart(canvas, labels, values) {
  if (pieChart) {
    pieChart.destroy();
  }
  const colors = themeColors();
  const sliceColors = labels.map((_, i) => piePalette[i % piePalette.length]);
  pieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: sliceColors,
          borderWidth: 2,
          borderColor: cssVar("--panel", "#ffffff"),
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: animationOptions(),
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: colors.text, boxWidth: 12, usePointStyle: true },
        },
      },
    },
  });
}
