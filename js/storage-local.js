const STORAGE_KEY = "salary-tracker";

const DEFAULT_CATEGORIES = [
  { id: "cat-inc-salary", name: "Зарплата", type: "income" },
  { id: "cat-inc-freelance", name: "Фриланс", type: "income" },
  { id: "cat-inc-other", name: "Прочие доходы", type: "income" },
  { id: "cat-exp-food", name: "Еда", type: "expense" },
  { id: "cat-exp-transport", name: "Транспорт", type: "expense" },
  { id: "cat-exp-home", name: "Жильё", type: "expense" },
  { id: "cat-exp-other", name: "Прочие расходы", type: "expense" },
];

function emptyState() {
  return {
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    transactions: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = emptyState();
      saveState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : emptyState().categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    const initial = emptyState();
    saveState(initial);
    return initial;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

const USERS_KEY = "salary-tracker-users";
const SESSION_KEY = "salary-tracker-session";

function getUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export const localStorageApi = {
  mode: "local",

  async me() {
    const session = readSession();
    if (!session?.email) {
      return { user: null };
    }
    return { user: { id: session.id, email: session.email } };
  },

  async login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    const user = getUsers().find((item) => item.email === normalized);
    if (!user || user.password !== String(password || "")) {
      throw new Error("Неверный email или пароль");
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }));
    return this.me();
  },

  async register(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("Введите корректный email");
    }
    if (String(password || "").length < 6) {
      throw new Error("Пароль должен быть не короче 6 символов");
    }
    const users = getUsers();
    if (users.some((item) => item.email === normalized)) {
      throw new Error("Этот email уже зарегистрирован");
    }
    const user = { id: createId("user"), email: normalized, password: String(password) };
    users.push(user);
    saveUsers(users);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email }));
    return this.me();
  },

  async logout() {
    localStorage.removeItem(SESSION_KEY);
    return { ok: true };
  },

  async getCategories() {
    return loadState().categories.slice();
  },

  async createCategory(payload) {
    const state = loadState();
    const category = {
      id: createId("cat"),
      name: payload.name.trim(),
      type: payload.type,
    };
    state.categories.push(category);
    saveState(state);
    return category;
  },

  async updateCategory(id, payload) {
    const state = loadState();
    const index = state.categories.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Категория не найдена");
    const used = state.transactions.some((item) => item.categoryId === id);
    if (used && state.categories[index].type !== payload.type) {
      throw new Error("Нельзя сменить тип: категория уже используется в операциях");
    }
    state.categories[index] = {
      ...state.categories[index],
      name: payload.name.trim(),
      type: payload.type,
    };
    saveState(state);
    return state.categories[index];
  },

  async removeCategory(id) {
    const state = loadState();
    if (state.transactions.some((item) => item.categoryId === id)) {
      throw new Error("Нельзя удалить категорию: есть связанные операции");
    }
    const next = state.categories.filter((item) => item.id !== id);
    if (next.length === state.categories.length) throw new Error("Категория не найдена");
    state.categories = next;
    saveState(state);
  },

  async getTransactions() {
    return loadState().transactions.slice();
  },

  async createTransaction(payload) {
    const state = loadState();
    const transaction = { id: createId("tx"), comment: "", ...payload };
    state.transactions.push(transaction);
    saveState(state);
    return transaction;
  },

  async updateTransaction(id, payload) {
    const state = loadState();
    const index = state.transactions.findIndex((item) => item.id === id);
    if (index === -1) throw new Error("Операция не найдена");
    state.transactions[index] = { ...state.transactions[index], ...payload, id };
    saveState(state);
    return state.transactions[index];
  },

  async removeTransaction(id) {
    const state = loadState();
    const next = state.transactions.filter((item) => item.id !== id);
    if (next.length === state.transactions.length) throw new Error("Операция не найдена");
    state.transactions = next;
    saveState(state);
  },
};
