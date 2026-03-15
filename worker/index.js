import {
  clampNumber,
  normalizeInvestmentInput,
  recalculatePortfolio,
} from "../shared/calculos.js";

const JSONBIN_BASE_URL = "https://api.jsonbin.io/v3/b";
const SELIC_SERIES_ID = "11";
const IPCA_SERIES_ID = "10844";

function buildCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-admin-password",
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(),
    },
  });
}

function getDefaultPortfolio() {
  return {
    investments: [],
    meta: {
      lastIndexUpdateAt: "",
      lastIndexSnapshot: {
        selicAnual: 0,
        ipcaAnual: 0,
        cdiAnual: -0.1,
      },
      updatedAt: new Date().toISOString(),
    },
  };
}

function normalizePortfolio(rawRecord = {}) {
  const base = getDefaultPortfolio();
  const rawSnapshot = rawRecord?.meta?.lastIndexSnapshot ?? {};
  const selicAnual = clampNumber(rawSnapshot.selicAnual);
  const ipcaAnual = clampNumber(rawSnapshot.ipcaAnual);
  const cdiAnual =
    rawSnapshot.cdiAnual === undefined || rawSnapshot.cdiAnual === null
      ? selicAnual - 0.1
      : clampNumber(rawSnapshot.cdiAnual);

  return {
    investments: Array.isArray(rawRecord.investments)
      ? rawRecord.investments.map((item) => ({
          ...item,
          ...normalizeInvestmentInput(item),
          id: item.id || crypto.randomUUID(),
          createdAt: item.createdAt || new Date().toISOString(),
        }))
      : [],
    meta: {
      ...base.meta,
      ...rawRecord.meta,
      lastIndexSnapshot: { selicAnual, ipcaAnual, cdiAnual },
    },
  };
}

async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isAdminRequest(request, env) {
  const expectedHash = String(env.ADMIN_PASSWORD_HASH || "").toLowerCase();
  if (!expectedHash) {
    throw new Error("ADMIN_PASSWORD_HASH nao configurado no Worker.");
  }

  const provided = request.headers.get("x-admin-password");
  if (!provided) {
    return false;
  }

  const providedHash = await sha256Hex(provided);
  return providedHash === expectedHash;
}

async function readPortfolioFromJsonbin(env) {
  if (!env.JSONBIN_KEY || !env.JSONBIN_BIN_ID) {
    throw new Error("JSONBIN_KEY e JSONBIN_BIN_ID precisam estar configurados.");
  }

  const response = await fetch(`${JSONBIN_BASE_URL}/${env.JSONBIN_BIN_ID}/latest`, {
    headers: {
      "X-Master-Key": env.JSONBIN_KEY,
    },
  });

  if (response.status === 404) {
    return getDefaultPortfolio();
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao ler jsonbin: ${details}`);
  }

  const payload = await response.json();
  const record = payload?.record ?? payload;
  return normalizePortfolio(record);
}

async function writePortfolioToJsonbin(env, portfolio) {
  const response = await fetch(`${JSONBIN_BASE_URL}/${env.JSONBIN_BIN_ID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": env.JSONBIN_KEY,
    },
    body: JSON.stringify(portfolio),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao salvar jsonbin: ${details}`);
  }
}

function parseBcbValue(rawValue) {
  if (typeof rawValue === "number") {
    return rawValue;
  }
  return Number(String(rawValue || "").replace(",", "."));
}

function formatDateForBcb(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

async function fetchSeriesLatestValue(seriesId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 45);

  const query = new URLSearchParams({
    formato: "json",
    dataInicial: formatDateForBcb(startDate),
    dataFinal: formatDateForBcb(endDate),
  });

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesId}/dados?${query.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Erro ao consultar serie ${seriesId}: ${details}`);
  }

  const values = await response.json();
  if (!Array.isArray(values) || !values.length) {
    throw new Error(`Serie ${seriesId} sem dados no periodo consultado.`);
  }

  return parseBcbValue(values[values.length - 1].valor);
}

function selicDailyToAnnualPercent(selicDailyPercent) {
  // Serie SGS 11 retorna taxa diaria; anualizamos em base util (252 dias).
  return ((1 + selicDailyPercent / 100) ** 252 - 1) * 100;
}

function ipcaMonthlyToAnnualPercent(ipcaMonthlyPercent) {
  return ((1 + ipcaMonthlyPercent / 100) ** 12 - 1) * 100;
}

function round2(value) {
  return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}

async function buildIndexSnapshot() {
  const [selicDailyPercent, ipcaMonthlyPercent] = await Promise.all([
    fetchSeriesLatestValue(SELIC_SERIES_ID),
    fetchSeriesLatestValue(IPCA_SERIES_ID),
  ]);

  const selicAnual = round2(selicDailyToAnnualPercent(selicDailyPercent));
  const ipcaAnual = round2(ipcaMonthlyToAnnualPercent(ipcaMonthlyPercent));
  const cdiAnual = round2(selicAnual - 0.1);

  return {
    selicAnual,
    ipcaAnual,
    cdiAnual,
  };
}

function validateInvestmentInput(payload) {
  if (!payload.data || !payload.vencimento) {
    throw new Error("Data e vencimento sao obrigatorios.");
  }
  if (!payload.investimento) {
    throw new Error("Descricao do investimento e obrigatoria.");
  }
  const idx = String(payload.indexador || "").toUpperCase().replace(/^PRE$/i, "PREFIXADA");
  if (!["SELIC", "IPCA", "CDI", "PREFIXADA"].includes(idx)) {
    throw new Error("Indexador invalido. Use SELIC, IPCA, CDI ou PREFIXADA (Pre-fixada).");
  }
  if (clampNumber(payload.valor) <= 0) {
    throw new Error("Valor aplicado deve ser maior que zero.");
  }
}

function recalculateAndTouch(portfolio) {
  const now = new Date();
  return {
    ...portfolio,
    investments: recalculatePortfolio(portfolio.investments, portfolio.meta.lastIndexSnapshot, now),
    meta: {
      ...portfolio.meta,
      updatedAt: now.toISOString(),
    },
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders() });
    }

    const { pathname } = new URL(request.url);

    try {
      if (request.method === "GET" && pathname === "/auth/check") {
        const ok = await isAdminRequest(request, env);
        return ok ? jsonResponse({ ok: true }) : jsonResponse({ error: "Senha invalida." }, 401);
      }

      if (request.method === "GET" && pathname === "/investments") {
        if (!(await isAdminRequest(request, env))) {
          return jsonResponse({ error: "Acesso negado. Faça login." }, 401);
        }
        const portfolio = await readPortfolioFromJsonbin(env);
        return jsonResponse(portfolio);
      }

      if (request.method === "POST" && pathname === "/investments") {
        if (!(await isAdminRequest(request, env))) {
          return jsonResponse({ error: "Acesso negado. Somente admin." }, 401);
        }

        const input = await request.json();
        validateInvestmentInput(input);

        const portfolio = await readPortfolioFromJsonbin(env);
        const nowIso = new Date().toISOString();
        const normalized = normalizeInvestmentInput(input);
        const next = {
          ...portfolio,
          investments: [
            ...portfolio.investments,
            {
              ...normalized,
              id: crypto.randomUUID(),
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ],
        };

        const recalculated = recalculateAndTouch(next);
        await writePortfolioToJsonbin(env, recalculated);
        return jsonResponse(recalculated, 201);
      }

      if (request.method === "PUT" && pathname.startsWith("/investments/")) {
        if (!(await isAdminRequest(request, env))) {
          return jsonResponse({ error: "Acesso negado. Somente admin." }, 401);
        }

        const investmentId = pathname.split("/")[2];
        if (!investmentId) {
          return jsonResponse({ error: "ID do investimento nao informado." }, 400);
        }

        const input = await request.json();
        validateInvestmentInput(input);

        const portfolio = await readPortfolioFromJsonbin(env);
        const target = portfolio.investments.find((item) => item.id === investmentId);
        if (!target) {
          return jsonResponse({ error: "Investimento nao encontrado." }, 404);
        }

        const normalized = normalizeInvestmentInput({
          ...target,
          ...input,
          id: investmentId,
          createdAt: target.createdAt,
        });

        const next = {
          ...portfolio,
          investments: portfolio.investments.map((item) =>
            item.id === investmentId ? { ...item, ...normalized, id: investmentId } : item,
          ),
        };

        const recalculated = recalculateAndTouch(next);
        await writePortfolioToJsonbin(env, recalculated);
        return jsonResponse(recalculated);
      }

      if (request.method === "DELETE" && pathname.startsWith("/investments/")) {
        if (!(await isAdminRequest(request, env))) {
          return jsonResponse({ error: "Acesso negado. Somente admin." }, 401);
        }

        const investmentId = pathname.split("/")[2];
        if (!investmentId) {
          return jsonResponse({ error: "ID do investimento nao informado." }, 400);
        }

        const portfolio = await readPortfolioFromJsonbin(env);
        const target = portfolio.investments.find((item) => item.id === investmentId);
        if (!target) {
          return jsonResponse({ error: "Investimento nao encontrado." }, 404);
        }

        const next = {
          ...portfolio,
          investments: portfolio.investments.filter((item) => item.id !== investmentId),
        };

        const recalculated = recalculateAndTouch(next);
        await writePortfolioToJsonbin(env, recalculated);
        return jsonResponse(recalculated);
      }

      if (request.method === "POST" && pathname === "/indices/update") {
        if (!(await isAdminRequest(request, env))) {
          return jsonResponse({ error: "Acesso negado. Somente admin." }, 401);
        }

        const portfolio = await readPortfolioFromJsonbin(env);
        const indexSnapshot = await buildIndexSnapshot();
        const now = new Date();
        const next = {
          ...portfolio,
          meta: {
            ...portfolio.meta,
            lastIndexSnapshot: indexSnapshot,
            lastIndexUpdateAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
        };

        const recalculated = {
          ...next,
          investments: recalculatePortfolio(next.investments, indexSnapshot, now),
        };

        await writePortfolioToJsonbin(env, recalculated);
        return jsonResponse(recalculated);
      }

      if (request.method === "GET" && pathname === "/health") {
        return jsonResponse({ status: "ok" });
      }

      return jsonResponse({ error: "Rota nao encontrada." }, 404);
    } catch (error) {
      return jsonResponse({ error: error.message || "Erro interno." }, 500);
    }
  },
};
