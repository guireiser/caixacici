import { getTaxCutoffDates } from "./calculos.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatDate(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatPercent(value) {
  return `${percentFormatter.format(Number(value || 0))}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTaxTooltip(investment) {
  const cutoffs = getTaxCutoffDates(investment.data);
  if (!cutoffs) {
    return "";
  }

  return [
    `Aliquota atual: ${percentFormatter.format((investment.aliquotaIR || 0) * 100)}%`,
    `Faixa 22,5% ate: ${formatDate(cutoffs.ate180)}`,
    `Faixa 20,0% ate: ${formatDate(cutoffs.ate360)}`,
    `Faixa 17,5% ate: ${formatDate(cutoffs.ate720)}`,
    "Faixa 15,0% apos 720 dias",
  ].join("\n");
}

function renderTable(tbodyElement, investments, selectedInvestmentId) {
  if (!investments.length) {
    tbodyElement.innerHTML = `<tr><td colspan="10">Nenhum investimento cadastrado.</td></tr>`;
    return;
  }

  tbodyElement.innerHTML = investments
    .map((investment) => {
      const rowClass = investment.id === selectedInvestmentId ? "selected" : "";
      const tooltip = escapeHtml(getTaxTooltip(investment));
      return `
        <tr data-id="${escapeHtml(investment.id)}" class="${rowClass}" title="${tooltip}">
          <td>${formatDate(investment.data)}</td>
          <td>${formatCurrency(investment.valor)}</td>
          <td>${escapeHtml(investment.investimento)}</td>
          <td>${escapeHtml(investment.indexador)}</td>
          <td>${formatPercent(investment.taxaFixa)}</td>
          <td>${formatPercent(investment.multiplicador)}</td>
          <td>${formatDate(investment.vencimento)}</td>
          <td>${formatCurrency(investment.valorAtual)}</td>
          <td>${formatCurrency(investment.rendimentoIR)}</td>
          <td>${formatCurrency(investment.valorAtualIR)}</td>
        </tr>
      `;
    })
    .join("");
}

function setFeedback(feedbackElement, message, isError = false) {
  feedbackElement.textContent = message;
  feedbackElement.classList.toggle("error", isError);
}

function updateStatusBadge({ badgeElement, textElement, lastUpdateAt, updatedToday }) {
  if (lastUpdateAt) {
    const date = new Date(lastUpdateAt);
    textElement.textContent = `Ultima atualizacao: ${date.toLocaleString("pt-BR")}`;
  } else {
    textElement.textContent = "Ultima atualizacao: --";
  }

  badgeElement.classList.toggle("badge-fresh", updatedToday);
  badgeElement.classList.toggle("badge-stale", !updatedToday);
  badgeElement.textContent = updatedToday ? "Atualizado hoje" : "Desatualizado";
}

export { renderTable, setFeedback, updateStatusBadge };
