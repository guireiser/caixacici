import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${percentFormatter.format(Number(value || 0))}%`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("pt-BR");
}

function parseISODate(dateValue) {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const INDEXADOR_LABELS = {
  SELIC: "SELIC",
  IPCA: "IPCA",
  CDI: "CDI",
  PREFIXADA: "Pré-fixada",
};

const CHART_COLORS = [
  "rgba(13, 71, 161, 0.85)",
  "rgba(46, 125, 50, 0.85)",
  "rgba(156, 39, 176, 0.85)",
  "rgba(245, 124, 0, 0.85)",
];

export function computeDashboardData(investments) {
  if (!Array.isArray(investments) || investments.length === 0) {
    return {
      totalInvestido: 0,
      totalValorAtual: 0,
      rendimentoBruto: 0,
      rendimentoLiquido: 0,
      totalValorAtualIR: 0,
      rentabilidadePercentual: 0,
      totalAtivos: 0,
      porIndexador: {},
      proximosVencimentos: [],
    };
  }

  let totalInvestido = 0;
  let totalValorAtual = 0;
  let totalRendimentoIR = 0;
  let totalValorAtualIR = 0;
  const porIndexador = {};

  for (const inv of investments) {
    const valor = Number(inv.valor) || 0;
    const valorAtual = Number(inv.valorAtual) || valor;
    totalInvestido += valor;
    totalValorAtual += valorAtual;
    totalRendimentoIR += Number(inv.rendimentoIR) || 0;
    totalValorAtualIR += Number(inv.valorAtualIR) || valorAtual;

    let idx = String(inv.indexador || "SELIC").toUpperCase().replace(/^PRE$/i, "PREFIXADA");
    if (idx === "PRE-FIXADA" || idx === "PRÉ-FIXADA") idx = "PREFIXADA";
    if (!porIndexador[idx]) {
      porIndexador[idx] = { valor: 0, valorAtual: 0, count: 0 };
    }
    porIndexador[idx].valor += valor;
    porIndexador[idx].valorAtual += valorAtual;
    porIndexador[idx].count += 1;
  }

  const rendimentoBruto = totalValorAtual - totalInvestido;
  const rentabilidadePercentual =
    totalInvestido > 0 ? (rendimentoBruto / totalInvestido) * 100 : 0;

  const now = new Date();
  const comVencimento = investments
    .filter((inv) => inv.vencimento && parseISODate(inv.vencimento))
    .map((inv) => ({
      ...inv,
      _vencimentoDate: parseISODate(inv.vencimento),
    }))
    .filter((inv) => inv._vencimentoDate && inv._vencimentoDate >= now)
    .sort((a, b) => a._vencimentoDate - b._vencimentoDate)
    .slice(0, 5)
    .map(({ _vencimentoDate, ...inv }) => ({ ...inv, vencimentoDate: _vencimentoDate }));

  return {
    totalInvestido,
    totalValorAtual,
    rendimentoBruto,
    rendimentoLiquido: totalRendimentoIR,
    totalValorAtualIR,
    rentabilidadePercentual,
    totalAtivos: investments.length,
    porIndexador,
    proximosVencimentos: comVencimento,
  };
}

let chartInstance = null;

function renderChartIndexador(canvas, porIndexador) {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const order = ["SELIC", "IPCA", "CDI", "PREFIXADA"];
  const labels = [];
  const data = [];
  const colors = [];

  order.forEach((key, i) => {
    const item = porIndexador[key];
    if (item && item.valorAtual > 0) {
      labels.push(INDEXADOR_LABELS[key] || key);
      data.push(item.valorAtual);
      colors.push(CHART_COLORS[i % CHART_COLORS.length]);
    }
  });

  if (data.length === 0) return;

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${formatCurrency(context.raw)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDashboard(sectionElement, investments) {
  if (!sectionElement) return;

  const cardsEl = sectionElement.querySelector("#dashboard-cards");
  const chartsEl = sectionElement.querySelector("#dashboard-charts");
  const chartCanvas = sectionElement.querySelector("#chart-indexador");
  const emptyEl = sectionElement.querySelector(".dashboard-empty");
  const contentEl = sectionElement.querySelector(".dashboard-content");

  if (investments.length === 0) {
    if (contentEl) contentEl.classList.add("hidden");
    if (emptyEl) emptyEl.classList.remove("hidden");
    sectionElement.classList.remove("hidden");
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");
  if (contentEl) contentEl.classList.remove("hidden");

  const data = computeDashboardData(investments);

  if (cardsEl) {
    cardsEl.innerHTML = `
      <div class="dashboard-card" aria-labelledby="dashboard-card-investido-label">
        <p id="dashboard-card-investido-label" class="dashboard-card-label">Valor investido</p>
        <p class="dashboard-card-value">${formatCurrency(data.totalInvestido)}</p>
      </div>
      <div class="dashboard-card" aria-labelledby="dashboard-card-atual-label">
        <p id="dashboard-card-atual-label" class="dashboard-card-label">Valor atual (aprox.)</p>
        <p class="dashboard-card-value">${formatCurrency(data.totalValorAtual)}</p>
      </div>
      <div class="dashboard-card" aria-labelledby="dashboard-card-bruto-label">
        <p id="dashboard-card-bruto-label" class="dashboard-card-label">Rendimento bruto</p>
        <p class="dashboard-card-value dashboard-card-value--${data.rendimentoBruto >= 0 ? "positive" : "negative"}">${formatCurrency(data.rendimentoBruto)}</p>
        ${data.totalInvestido > 0 ? `<p class="dashboard-card-sublabel">${data.rentabilidadePercentual >= 0 ? "+" : ""}${formatPercent(data.rentabilidadePercentual)} sobre o aplicado</p>` : ""}
      </div>
      <div class="dashboard-card" aria-labelledby="dashboard-card-liquido-label">
        <p id="dashboard-card-liquido-label" class="dashboard-card-label">Rendimento líquido (após IR)</p>
        <p class="dashboard-card-value">${formatCurrency(data.rendimentoLiquido)}</p>
        <p class="dashboard-card-sublabel">${data.totalAtivos} ativo${data.totalAtivos !== 1 ? "s" : ""}</p>
      </div>
    `;
  }

  if (chartsEl && chartCanvas) {
    requestAnimationFrame(() => {
      renderChartIndexador(chartCanvas, data.porIndexador);
    });

    const vencimentosEl = sectionElement.querySelector("#dashboard-vencimentos");
    if (vencimentosEl) {
      if (data.proximosVencimentos.length === 0) {
        vencimentosEl.innerHTML = `<p class="dashboard-vencimentos-empty">Nenhum vencimento futuro próximo.</p>`;
      } else {
        vencimentosEl.innerHTML = `
          <h3 class="dashboard-chart-title">Próximos vencimentos</h3>
          <ul class="dashboard-vencimentos-list" aria-label="Próximos vencimentos">
            ${data.proximosVencimentos
              .map(
                (inv) => `
              <li>
                <span class="dashboard-vencimentos-name">${escapeHtml(inv.investimento)}</span>
                <span class="dashboard-vencimentos-date">${formatDate(inv.vencimento)}</span>
                <span class="dashboard-vencimentos-valor">${formatCurrency(inv.valorAtual)}</span>
              </li>
            `
              )
              .join("")}
          </ul>
        `;
      }
    }
  }

  sectionElement.classList.remove("hidden");
}
