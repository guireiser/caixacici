const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl?.replace(/\/$/, "");

if (!API_BASE_URL) {
  throw new Error("APP_CONFIG.apiBaseUrl nao definido em public/config.js");
}

function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error || "Erro inesperado na API.";
      throw new Error(message);
    }
    return payload;
  });
}

function authHeaders(adminPassword) {
  if (!adminPassword) {
    return {};
  }
  return { "x-admin-password": adminPassword };
}

function checkAuth(adminPassword) {
  return request("/auth/check", {
    method: "GET",
    headers: authHeaders(adminPassword),
  });
}

function fetchPortfolio(adminPassword) {
  return request("/investments", {
    method: "GET",
    headers: authHeaders(adminPassword),
  });
}

function createInvestment(investment, adminPassword) {
  return request("/investments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(adminPassword),
    },
    body: JSON.stringify(investment),
  });
}

function updateInvestment(id, investment, adminPassword) {
  return request(`/investments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(adminPassword),
    },
    body: JSON.stringify(investment),
  });
}

function deleteInvestment(id, adminPassword) {
  return request(`/investments/${id}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(adminPassword),
    },
  });
}

function updateIndices(adminPassword) {
  return request("/indices/update", {
    method: "POST",
    headers: {
      ...authHeaders(adminPassword),
    },
  });
}

export {
  checkAuth,
  createInvestment,
  deleteInvestment,
  fetchPortfolio,
  updateIndices,
  updateInvestment,
};
