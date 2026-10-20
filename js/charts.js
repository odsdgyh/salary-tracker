let barChart = null;
let pieChart = null;

const piePalette = [
  "#d64545",
  "#e07a3d",
  "#c9a227",
  "#5b8def",
  "#7b6cf6",
  "#2aa8a1",
  "#b45bb0",
  "#3db88a",
];

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((ch) => ch + ch).join("") : raw;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function mixHex(hex, amount, toward = "#000000") {
  const from = hexToRgb(hex);
  const to = hexToRgb(toward);
  const mix = (a, b) => Math.round(a + (b - a) * amount);
  return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`;
}

function gradient(ctx, topColor, bottomColor, top, bottom) {
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  fill.addColorStop(0, topColor);
  fill.addColorStop(0.45, topColor);
  fill.addColorStop(1, bottomColor);
  return fill;
}

const barVolumePlugin = {
  id: "barVolume",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.getSortedVisibleDatasetMetas().forEach((meta) => {
      meta.data.forEach((bar) => {
        const { x, y, base, width } = bar.getProps(["x", "y", "base", "width"], true);
        const height = Math.abs(base - y);
        if (height < 2) return;
        const left = x - width / 2;
        const right = x + width / 2;
        const top = Math.min(y, base);
        const bottom = Math.max(y, base);
        const depth = Math.min(10, width * 0.35);

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        ctx.beginPath();
        ctx.moveTo(left, top);
        ctx.lineTo(left + depth, top - depth);
        ctx.lineTo(right + depth, top - depth);
        ctx.lineTo(right, top);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.moveTo(right, top);
        ctx.lineTo(right + depth, top - depth);
        ctx.lineTo(right + depth, bottom - depth);
        ctx.lineTo(right, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    });
  },
};

const doughnutVolumePlugin = {
  id: "doughnutVolume",
  beforeDatasetDraw(chart, args) {
    if (chart.config.type !== "doughnut") return;
    const { ctx } = chart;
    const meta = args.meta;
    const depth = 12;

    for (let layer = depth; layer >= 1; layer -= 1) {
      meta.data.forEach((arc, index) => {
        const { startAngle, endAngle, innerRadius, outerRadius, x, y } = arc.getProps(
          ["startAngle", "endAngle", "innerRadius", "outerRadius", "x", "y"],
          true
        );
        if (endAngle - startAngle <= 0) return;
        ctx.save();
        ctx.translate(0, layer);
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, startAngle, endAngle);
        ctx.arc(x, y, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        const shade = 0.28 + (layer / depth) * 0.28;
        ctx.fillStyle = mixHex(piePalette[index % piePalette.length], shade);
        ctx.fill();
        ctx.restore();
      });
    }

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
  },
  afterDatasetDraw(chart) {
    if (chart.config.type !== "doughnut") return;
    chart.ctx.restore();
  },
};

function themeColors() {
  return {
    text: cssVar("--chart-text", "#3d4450"),
    muted: cssVar("--muted", "#6b7280"),
    grid: cssVar("--chart-grid", "rgba(0,0,0,0.08)"),
    incomeTop: cssVar("--income", "#3db88a"),
    incomeBottom: cssVar("--income-deep", "#1e7a52"),
    expenseTop: cssVar("--expense", "#e45a5a"),
    expenseBottom: cssVar("--expense-deep", "#a83232"),
  };
}

export function renderBarChart(canvas, labels, income, expense) {
  if (barChart) {
    barChart.destroy();
  }
  const colors = themeColors();
  const ctx = canvas.getContext("2d");
  barChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Доходы",
          data: income,
          backgroundColor: (item) =>
            gradient(ctx, colors.incomeTop, colors.incomeBottom, item.chart.chartArea?.top ?? 0, item.chart.chartArea?.bottom ?? 320),
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "Расходы",
          data: expense,
          backgroundColor: (item) =>
            gradient(ctx, colors.expenseTop, colors.expenseBottom, item.chart.chartArea?.top ?? 0, item.chart.chartArea?.bottom ?? 320),
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    plugins: [barVolumePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: colors.text, usePointStyle: true } },
      },
      scales: {
        x: {
          ticks: { color: colors.muted, maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
        y: {
          ticks: { color: colors.muted },
          grid: { color: colors.grid },
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
          backgroundColor: sliceColors.map((color) => mixHex(color, 0.08, "#ffffff")),
          borderWidth: 2,
          borderColor: cssVar("--panel", "#ffffff"),
          hoverOffset: 6,
        },
      ],
    },
    plugins: [doughnutVolumePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      layout: { padding: { top: 6, bottom: 28 } },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: colors.text, boxWidth: 12, usePointStyle: true },
        },
      },
    },
  });
}
