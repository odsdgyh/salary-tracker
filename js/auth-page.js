import { storage } from "./storage.js";

const form = document.querySelector("#auth-form");
const errorBox = document.querySelector("#auth-error");
const mode = document.body.dataset.auth;

try {
  const session = await storage.me();
  if (session?.user) {
    location.href = "/";
  }
} catch {
  // not signed in
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  const email = form.email.value;
  const password = form.password.value;
  try {
    if (mode === "register") {
      await storage.register(email, password);
    } else {
      await storage.login(email, password);
    }
    location.href = "/";
  } catch (error) {
    errorBox.textContent = error.message;
  }
});
