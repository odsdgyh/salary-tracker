import { api } from "./api.js";
import { isGitHubPages } from "./paths.js";
import { localStorageApi } from "./storage-local.js";

const remote = {
  me() {
    return api("/api/me", { redirectOn401: false });
  },

  login(email, password) {
    return api("/api/login", { method: "POST", body: { email, password }, redirectOn401: false });
  },

  register(email, password) {
    return api("/api/register", { method: "POST", body: { email, password }, redirectOn401: false });
  },

  logout() {
    return api("/api/logout", { method: "POST", redirectOn401: false });
  },

  getCategories() {
    return api("/api/categories");
  },

  createCategory(payload) {
    return api("/api/categories", { method: "POST", body: payload });
  },

  updateCategory(id, payload) {
    return api(`/api/categories/${id}`, { method: "PUT", body: payload });
  },

  removeCategory(id) {
    return api(`/api/categories/${id}`, { method: "DELETE" });
  },

  getTransactions() {
    return api("/api/transactions");
  },

  createTransaction(payload) {
    return api("/api/transactions", { method: "POST", body: payload });
  },

  updateTransaction(id, payload) {
    return api(`/api/transactions/${id}`, { method: "PUT", body: payload });
  },

  removeTransaction(id) {
    return api(`/api/transactions/${id}`, { method: "DELETE" });
  },
};

export const storage = isGitHubPages() ? localStorageApi : remote;
