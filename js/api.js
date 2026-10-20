export async function api(path, { method = "GET", body, redirectOn401 = true } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && redirectOn401) {
    location.href = "/login.html";
    throw new Error(data.error || "Нужно войти в аккаунт");
  }
  if (!response.ok) {
    throw new Error(data.error || "Ошибка запроса");
  }
  return data;
}
