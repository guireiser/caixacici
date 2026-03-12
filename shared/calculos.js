const TAX_BRACKETS = [
  { maxDays: 180, rate: 0.225 },
  { maxDays: 360, rate: 0.2 },
  { maxDays: 720, rate: 0.175 },
  { maxDays: Number.POSITIVE_INFINITY, rate: 0.15 },
];

function clampNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseISODate(dateValue) {
  if (!dateValue) {
    return null;
  }
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(startDate, endDate) {
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = (endDate.getTime() - startDate.getTime()) / dayMs;
  return Math.max(0, Math.floor(diff));
}

function annualPercentToDailyRate(annualPercent) {
  const annualDecimal = annualPercent / 100;
  return (1 + annualDecimal) ** (1 / 365) - 1;
}

function resolveReferenceAnnual(indexador, snapshot) {
  if (indexador === "IPCA") {
    return clampNumber(snapshot.ipcaAnual);
  }
  if (indexador === "CDI") {
    return clampNumber(snapshot.cdiAnual);
  }
  return clampNumber(snapshot.selicAnual);
}

function getAliquotaByDays(daysHeld) {
  const match = TAX_BRACKETS.find((item) => daysHeld <= item.maxDays);
  return match ? match.rate : 0.15;
}

function round2(value) {
  return Number((Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2));
}

function getReferenceDate(investment, fallbackDate) {
  const currentDate = fallbackDate ?? new Date();
  const vencimentoDate = parseISODate(investment.vencimento);
  if (!vencimentoDate) {
    return currentDate;
  }
  return vencimentoDate < currentDate ? vencimentoDate : currentDate;
}

function getTaxCutoffDates(dataAplicacaoISO) {
  const initialDate = parseISODate(dataAplicacaoISO);
  if (!initialDate) {
    return null;
  }

  const addDays = (baseDate, days) => {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  };

  return {
    ate180: addDays(initialDate, 180),
    ate360: addDays(initialDate, 360),
    ate720: addDays(initialDate, 720),
  };
}

function calculateInvestmentProjection(investment, snapshot, now = new Date()) {
  const valorAplicado = clampNumber(investment.valor);
  const taxaFixa = clampNumber(investment.taxaFixa);
  const multiplicador = clampNumber(investment.multiplicador, 100) / 100;
  const dataAplicacao = parseISODate(investment.data);

  if (!dataAplicacao || valorAplicado <= 0) {
    return {
      ...investment,
      valorAtual: round2(valorAplicado),
      rendimentoIR: 0,
      valorAtualIR: round2(valorAplicado),
      lastCalcDate: now.toISOString(),
      aliquotaIR: 0,
      diasCorridos: 0,
    };
  }

  const referenceDate = getReferenceDate(investment, now);
  const daysHeld = daysBetween(dataAplicacao, referenceDate);
  const indexAnnual = resolveReferenceAnnual(investment.indexador, snapshot);
  // Taxa efetiva anual: indice * (multiplicador/100) + taxaFixa
  // Ex.: Tesouro SELIC 0,12% fixo, SELIC 15% -> 15 * 1 + 0,12 = 15,12%
  // Ex.: CDB 110,5% do CDI, CDI = SELIC-0,1 = 14,9% -> 14,9 * 1,105 = 16,4645%
  const taxaEfetivaAnual = indexAnnual * multiplicador + taxaFixa;
  const taxaDiaria = annualPercentToDailyRate(taxaEfetivaAnual);

  const valorAtual = valorAplicado * (1 + taxaDiaria) ** daysHeld;
  const rendimentoBruto = Math.max(0, valorAtual - valorAplicado);
  const aliquotaIR = getAliquotaByDays(daysHeld);
  const imposto = rendimentoBruto * aliquotaIR;
  const rendimentoLiquido = rendimentoBruto - imposto;

  return {
    ...investment,
    valorAtual: round2(valorAtual),
    rendimentoIR: round2(rendimentoLiquido),
    valorAtualIR: round2(valorAtual - imposto),
    lastCalcDate: now.toISOString(),
    aliquotaIR,
    diasCorridos: daysHeld,
    taxaEfetivaAnual: round2(taxaEfetivaAnual),
  };
}

function recalculatePortfolio(investments, snapshot, now = new Date()) {
  return investments.map((investment) => calculateInvestmentProjection(investment, snapshot, now));
}

function normalizeInvestmentInput(raw) {
  return {
    id: raw.id,
    data: raw.data,
    valor: clampNumber(raw.valor),
    investimento: String(raw.investimento || "").trim(),
    indexador: String(raw.indexador || "SELIC").toUpperCase(),
    taxaFixa: clampNumber(raw.taxaFixa),
    multiplicador: clampNumber(raw.multiplicador, 100),
    vencimento: raw.vencimento,
    createdAt: raw.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export {
  calculateInvestmentProjection,
  clampNumber,
  getAliquotaByDays,
  getTaxCutoffDates,
  normalizeInvestmentInput,
  parseISODate,
  recalculatePortfolio,
  resolveReferenceAnnual,
  round2,
};
