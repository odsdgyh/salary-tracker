import { storage } from "./storage.js";
import {
  currentMonthValue,
  daysInMonth,
  formatDate,
  formatSum,
  inMonth,
  typeLabel,
} from "./format.js";
import { renderBarChart, renderPieChart } from "./charts.js";

const views = document.querySelectorAll("[data-view]");
const navButtons = document.querySelectorAll("[data-nav]");

const dashboardMonth = document.querySelector("#dashboard-month");
const statIncome = document.querySelector("#stat-income");
const statExpense = document.querySelector("#stat-expense");
const statBalance = document.querySelector("#stat-balance");
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
  const income = monthItems
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthItems
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  statIncome.textContent = formatSum(income);
  statExpense.textContent = formatSum(expense);
  statBalance.textContent = formatSum(income - expense);

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
        <td>${formatSum(item.amount)}</td>
        <td>${escapeHtml(item.comment || "—")}</td>
        <td>
          <div class="row-actions">
            <button class="btn ghost" type="button" data-edit-tx="${item.id}">Изменить</button>
            <button class="btn danger" type="button" data-del-tx="${item.id}">Удалить</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  transactionsEmpty.style.display = rows.length ? "none" : "block";
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
          <button class="btn ghost" type="button" data-edit-cat="${item.id}">Изменить</button>
          <button class="btn danger" type="button" data-del-cat="${item.id}">Удалить</button>
        </div>
      </article>`
    )
    .join("");
  categoriesEmpty.style.display = categories.length ? "none" : "block";
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
  themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  themeToggle.textContent = theme === "dark" ? "Светлая тема" : "Тёмная тема";
  if (transactions.length || categories.length) {
    renderDashboard();
  }
}

themeToggle.addEventListener("click", () => {
  applyTheme(currentTheme() === "dark" ? "light" : "dark");
});

document.querySelector("#logout-btn").addEventListener("click", async () => {
  await storage.logout();
  location.href = "/login.html";
});

async function boot() {
  applyTheme(localStorage.getItem(THEME_KEY) || currentTheme());
  dashboardMonth.value = currentMonthValue();
  try {
    const session = await storage.me();
    if (!session?.user) {
      location.href = "/login.html";
      return;
    }
    document.querySelector("#user-email").textContent = session.user.email;
    await refresh();
  } catch {
    location.href = "/login.html";
  }
}

boot();
