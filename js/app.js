import { storage } from "./storage.js";
import { pageHref } from "./paths.js";
import {
  currentMonthValue,
  daysInMonth,
  formatDate,
  formatSum,
  inMonth,
  monthDelta,
  previousMonthValue,
  typeLabel,
} from "./format.js";
import { renderBarChart, renderPieChart } from "./charts.js";

const views = document.querySelectorAll("[data-view]");
const navButtons = document.querySelectorAll("[data-nav]");

const dashboardMonth = document.querySelector("#dashboard-month");
const statIncome = document.querySelector("#stat-income");
const statExpense = document.querySelector("#stat-expense");
const statBalance = document.querySelector("#stat-balance");
const statIncomeDelta = document.querySelector("#stat-income-delta");
const statExpenseDelta = document.querySelector("#stat-expense-delta");
const statBalanceDelta = document.querySelector("#stat-balance-delta");
const transactionsWrap = document.querySelector(".table-wrap");
const barCanvas = document.querySelector("#bar-chart");
const pieCanvas = document.querySelector("#pie-chart");

const filterType = document.querySelector("#filter-type");
const filterFrom = document.querySelector("#filter-from");
const filterTo = document.querySelector("#filter-to");
const transactionsBody = document.querySelector("#transactions-body");
const transactionsEmpty = document.querySelector("#transactions-empty");

const categoriesBody = document.querySelector("#categories-body");
const categoriesEmpty = document.querySelector("#categories-empty");

const transactionModal = document.querySelector("#transaction-modal");
const transactionForm = document.querySelector("#transaction-form");
const transactionTitle = document.querySelector("#transaction-modal-title");
const txType = document.querySelector("#tx-type");
const txAmount = document.querySelector("#tx-amount");
const txCategory = document.querySelector("#tx-category");
const txDate = document.querySelector("#tx-date");
const txComment = document.querySelector("#tx-comment");
const txError = document.querySelector("#tx-error");

const categoryModal = document.querySelector("#category-modal");
const categoryForm = document.querySelector("#category-form");
const categoryTitle = document.querySelector("#category-modal-title");
const catName = document.querySelector("#cat-name");
const catType = document.querySelector("#cat-type");
const catError = document.querySelector("#cat-error");

let editingTransactionId = null;
let editingCategoryId = null;
let categories = [];
let transactions = [];

function currentView() {
  return document.querySelector(".view.is-visible")?.dataset.view;
}

function showView(name) {
  views.forEach((view) => {
    view.classList.toggle("is-visible", view.dataset.view === name);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.nav === name);
  });
  if (name === "dashboard") {
    requestAnimationFrame(renderDashboard);
  }
}

function openModal(modal) {
  modal.classList.add("is-open");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
}

function fillCategoryOptions(type, selectedId) {
  const options = categories
    .filter((category) => category.type === type)
    .map(
      (category) =>
        `<option value="${category.id}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(category.name)}</option>`
    )
    .join("");
  txCategory.innerHTML = options || `<option value="">Нет категорий этого типа</option>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refreshIcons() {
  window.lucide?.createIcons();
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function actionButton(kind, attr, id, label, icon) {
  return `<button class="icon-btn icon-${kind}" type="button" ${attr}="${id}" title="${label}" aria-label="${label}">
    <i data-lucide="${icon}"></i>
  </button>`;
}

function setDelta(el, delta) {
  el.textContent = delta.text;
  el.className = `delta ${delta.tone}`;
}

function monthTotals(yearMonth) {
  const items = transactions.filter((item) => inMonth(item.date, yearMonth));
  const income = items
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  return { income, expense, balance: income - expense };
}

function openTransactionModal(transaction) {
  editingTransactionId = transaction?.id ?? null;
  transactionTitle.textContent = transaction ? "Редактировать операцию" : "Новая операция";
  txError.textContent = "";
  txType.value = transaction?.type ?? "income";
  txAmount.value = transaction?.amount ?? "";
  txDate.value = transaction?.date ?? new Date().toISOString().slice(0, 10);
  txComment.value = transaction?.comment ?? "";
  fillCategoryOptions(txType.value, transaction?.categoryId);
  openModal(transactionModal);
}

function openCategoryModal(category) {
  editingCategoryId = category?.id ?? null;
  categoryTitle.textContent = category ? "Редактировать категорию" : "Новая категория";
  catError.textContent = "";
  catName.value = category?.name ?? "";
  catType.value = category?.type ?? "expense";
  openModal(categoryModal);
}

function renderDashboard() {
  const month = dashboardMonth.value || currentMonthValue();
  dashboardMonth.value = month;
  const monthItems = transactions.filter((item) => inMonth(item.date, month));
  const current = monthTotals(month);
  const previous = monthTotals(previousMonthValue(month));

  statIncome.textContent = formatSum(current.income);
  statExpense.textContent = formatSum(current.expense);
  statBalance.textContent = formatSum(current.balance);
  setDelta(statIncomeDelta, monthDelta(current.income, previous.income));
  setDelta(statExpenseDelta, monthDelta(current.expense, previous.expense, true));
  setDelta(statBalanceDelta, monthDelta(current.balance, previous.balance));

  const days = daysInMonth(month);
  const labels = Array.from({ length: days }, (_, i) => String(i + 1));
  const incomeByDay = Array(days).fill(0);
  const expenseByDay = Array(days).fill(0);

  for (const item of monthItems) {
    const day = Number(item.date.slice(-2)) - 1;
    if (item.type === "income") incomeByDay[day] += item.amount;
    else expenseByDay[day] += item.amount;
  }
  renderBarChart(barCanvas, labels, incomeByDay, expenseByDay);

  const expenseByCategory = new Map();
  for (const item of monthItems.filter((tx) => tx.type === "expense")) {
    const name = categories.find((cat) => cat.id === item.categoryId)?.name ?? "Без категории";
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + item.amount);
  }
  const pieLabels = [...expenseByCategory.keys()];
  const pieValues = [...expenseByCategory.values()];
  renderPieChart(
    pieCanvas,
    pieLabels.length ? pieLabels : ["Нет расходов"],
    pieValues.length ? pieValues : [0]
  );
}

function renderTransactions() {
  const type = filterType.value;
  const from = filterFrom.value;
  const to = filterTo.value;

  const rows = transactions
    .filter((item) => type === "all" || item.type === type)
    .filter((item) => !from || item.date >= from)
    .filter((item) => !to || item.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  transactionsBody.innerHTML = rows
    .map((item) => {
      const category = categories.find((cat) => cat.id === item.categoryId);
      return `<tr>
        <td>${formatDate(item.date)}</td>
        <td><span class="badge ${item.type}">${typeLabel(item.type)}</span></td>
        <td>${escapeHtml(category?.name ?? "Без категории")}</td>
        <td class="col-amount">${formatSum(item.amount)}</td>
        <td>${escapeHtml(item.comment || "—")}</td>
        <td>
          <div class="row-actions">
            ${actionButton("edit", "data-edit-tx", item.id, "Изменить", "pencil")}
            ${actionButton("delete", "data-del-tx", item.id, "Удалить", "trash-2")}
          </div>
        </td>
      </tr>`;
    })
    .join("");

  transactionsWrap.classList.toggle("is-empty", rows.length === 0);
  refreshIcons();
}

function renderCategories() {
  categoriesBody.innerHTML = categories
    .map(
      (item) => `<article class="category-card">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="badge ${item.type}">${typeLabel(item.type)}</span>
        </div>
        <div class="row-actions">
          ${actionButton("edit", "data-edit-cat", item.id, "Изменить", "pencil")}
          ${actionButton("delete", "data-del-cat", item.id, "Удалить", "trash-2")}
        </div>
      </article>`
    )
    .join("");
  categoriesEmpty.classList.toggle("is-visible", categories.length === 0);
  categoriesEmpty.style.display = "";
  refreshIcons();
}

function renderAll() {
  if (currentView() === "dashboard") {
    renderDashboard();
  }
  renderTransactions();
  renderCategories();
}

async function refresh() {
  [categories, transactions] = await Promise.all([
    storage.getCategories(),
    storage.getTransactions(),
  ]);
  renderAll();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.nav));
});

dashboardMonth.addEventListener("change", renderDashboard);
filterType.addEventListener("change", renderTransactions);
filterFrom.addEventListener("change", renderTransactions);
filterTo.addEventListener("change", renderTransactions);

document.querySelector("#add-transaction").addEventListener("click", () => openTransactionModal());
document.querySelector("#empty-add-transaction").addEventListener("click", () => openTransactionModal());
document.querySelector("#add-category").addEventListener("click", () => openCategoryModal());

txType.addEventListener("change", () => fillCategoryOptions(txType.value));

document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(document.getElementById(btn.dataset.close)));
});

[transactionModal, categoryModal].forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal(modal);
  });
});

transactionsBody.addEventListener("click", async (event) => {
  const editId = event.target.closest("[data-edit-tx]")?.dataset.editTx;
  const deleteId = event.target.closest("[data-del-tx]")?.dataset.delTx;
  if (editId) {
    openTransactionModal(transactions.find((item) => item.id === editId));
  }
  if (deleteId && confirm("Удалить операцию?")) {
    const row = event.target.closest("tr");
    if (row && !prefersReducedMotion()) {
      row.classList.add("is-leaving");
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    await storage.removeTransaction(deleteId);
    await refresh();
  }
});

categoriesBody.addEventListener("click", async (event) => {
  const editId = event.target.closest("[data-edit-cat]")?.dataset.editCat;
  const deleteId = event.target.closest("[data-del-cat]")?.dataset.delCat;
  if (editId) {
    openCategoryModal(categories.find((item) => item.id === editId));
  }
  if (deleteId && confirm("Удалить категорию?")) {
    try {
      await storage.removeCategory(deleteId);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  }
});

transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  txError.textContent = "";
  const amount = Number(txAmount.value);
  const category = categories.find((item) => item.id === txCategory.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    txError.textContent = "Введите сумму больше нуля";
    return;
  }
  if (!category || category.type !== txType.value) {
    txError.textContent = "Выберите категорию, которая соответствует типу операции";
    return;
  }
  const payload = {
    type: txType.value,
    amount,
    categoryId: category.id,
    date: txDate.value,
    comment: txComment.value,
  };
  try {
    if (editingTransactionId) {
      await storage.updateTransaction(editingTransactionId, payload);
    } else {
      await storage.createTransaction(payload);
    }
    closeModal(transactionModal);
    await refresh();
  } catch (error) {
    txError.textContent = error.message;
  }
});

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  catError.textContent = "";
  const name = catName.value.trim();
  if (!name) {
    catError.textContent = "Введите название категории";
    return;
  }
  const payload = { name, type: catType.value };
  try {
    if (editingCategoryId) {
      await storage.updateCategory(editingCategoryId, payload);
    } else {
      await storage.createCategory(payload);
    }
    closeModal(categoryModal);
    await refresh();
  } catch (error) {
    catError.textContent = error.message;
  }
});

const THEME_KEY = "salary-tracker-theme";
const themeToggle = document.querySelector("#theme-toggle");

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const nextLabel = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  themeToggle.setAttribute("aria-label", nextLabel);
  themeToggle.setAttribute("title", nextLabel);
  refreshIcons();
  if (transactions.length || categories.length) {
    renderDashboard();
  }
}

themeToggle.addEventListener("click", () => {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelector("#logout-btn").addEventListener("click", async () => {
  try {
    await storage.logout();
  } finally {
    location.replace(pageHref("login.html"));
  }
});

async function boot() {
  applyTheme(localStorage.getItem(THEME_KEY) || currentTheme());
  dashboardMonth.value = currentMonthValue();
  try {
    const session = await storage.me();
    if (!session?.user) {
      location.href = pageHref("login.html");
      return;
    }
    document.querySelector("#user-email").textContent = session.user.email;
    refreshIcons();
    await refresh();
  } catch {
    location.href = pageHref("login.html");
  }
}

boot();
