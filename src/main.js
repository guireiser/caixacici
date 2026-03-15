import { normalizeInvestmentInput } from "./modules/calculos.js";
import { formatDisplayToISO, formatISOToDisplay, setupDateInput } from "./modules/dateInput.js";
import { isUpdatedToday, normalizeIndexSnapshot } from "./modules/indices.js";
import {
  checkAuth,
  createInvestment,
  deleteInvestment,
  fetchPortfolio,
  updateIndices,
  updateInvestment,
} from "./modules/repository.js";
import { renderTable, setFeedback, updateStatusBadge } from "./modules/table.js";

const STORAGE_KEY = "caixa_cici_admin";

const state = {
  investments: [],
  selectedInvestmentId: null,
  adminPassword: "",
  meta: {
    lastIndexUpdateAt: "",
    lastIndexSnapshot: { selicAnual: 0, ipcaAnual: 0, cdiAnual: 0 },
  },
  dialogMode: "create",
};

const elements = {
  loginScreen: document.querySelector("#login-screen"),
  appContent: document.querySelector("#app-content"),
  loginForm: document.querySelector("#login-form"),
  loginPassword: document.querySelector("#login-password"),
  loginError: document.querySelector("#login-error"),
  feedback: document.querySelector("#feedback-message"),
  tableBody: document.querySelector("#investments-body"),
  lastUpdateText: document.querySelector("#last-update-text"),
  updateBadge: document.querySelector("#update-status-badge"),
  newInvestmentBtn: document.querySelector("#new-investment-btn"),
  editInvestmentBtn: document.querySelector("#edit-investment-btn"),
  deleteInvestmentBtn: document.querySelector("#delete-investment-btn"),
  refreshIndicesBtn: document.querySelector("#refresh-indices-btn"),
  downloadBackupBtn: document.querySelector("#download-backup-btn"),
  dialog: document.querySelector("#investment-dialog"),
  form: document.querySelector("#investment-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  cancelDialogBtn: document.querySelector("#cancel-dialog-btn"),
  investmentId: document.querySelector("#investment-id"),
  data: document.querySelector("#data"),
  valor: document.querySelector("#valor"),
  investimento: document.querySelector("#investimento"),
  indexador: document.querySelector("#indexador"),
  taxaFixa: document.querySelector("#taxaFixa"),
  multiplicador: document.querySelector("#multiplicador"),
  vencimento: document.querySelector("#vencimento"),
};

function applyPortfolioPayload(payload) {
  state.investments = payload.investments || [];
  state.meta = {
    ...state.meta,
    ...payload.meta,
    lastIndexSnapshot: normalizeIndexSnapshot(payload.meta?.lastIndexSnapshot),
  };
  if (!state.investments.find((item) => item.id === state.selectedInvestmentId)) {
    state.selectedInvestmentId = null;
  }
}

function updateButtonsState() {
  const editBtn = document.getElementById("edit-investment-btn");
  const deleteBtn = document.getElementById("delete-investment-btn");
  const hasSelected = state.selectedInvestmentId != null && state.selectedInvestmentId !== "";
  if (editBtn) {
    editBtn.disabled = !hasSelected;
  }
  if (deleteBtn) {
    deleteBtn.disabled = !hasSelected;
  }
}

function refreshUI() {
  renderTable(elements.tableBody, state.investments, state.selectedInvestmentId);
  updateStatusBadge({
    badgeElement: elements.updateBadge,
    textElement: elements.lastUpdateText,
    lastUpdateAt: state.meta.lastIndexUpdateAt,
    updatedToday: isUpdatedToday(state.meta.lastIndexUpdateAt),
  });
  updateButtonsState();
}

function showLogin() {
  state.adminPassword = "";
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
  if (elements.appContent) elements.appContent.classList.add("hidden");
  if (elements.loginError) elements.loginError.textContent = "";
  if (elements.loginPassword) elements.loginPassword.value = "";
}

function showApp() {
  if (elements.loginScreen) elements.loginScreen.classList.add("hidden");
  if (elements.appContent) elements.appContent.classList.remove("hidden");
  refreshUI();
}

async function loadPortfolio(showMessage = false) {
  try {
    const payload = await fetchPortfolio(state.adminPassword);
    applyPortfolioPayload(payload);
    refreshUI();
    if (showMessage) {
      setFeedback(elements.feedback, "Carteira carregada com sucesso.");
    }
  } catch (error) {
    setFeedback(elements.feedback, `Falha ao carregar carteira: ${error.message}`, true);
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const password = elements.loginPassword?.value?.trim() || "";
  if (!password) {
    return;
  }
  if (elements.loginError) elements.loginError.textContent = "";
  const submitBtn = elements.loginForm?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando…";
  }
  try {
    await checkAuth(password);
    state.adminPassword = password;
    try {
      sessionStorage.setItem(STORAGE_KEY, password);
    } catch (_) {}
    showApp();
    await loadPortfolio(true);
  } catch (error) {
    if (elements.loginError) {
      elements.loginError.textContent = error.message || "Senha incorreta. Tente novamente.";
    }
    elements.loginPassword?.focus();
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar";
    }
  }
}

function setMultiplicadorByIndexador() {
  const isPreFixada = (elements.indexador?.value || "").toUpperCase() === "PREFIXADA";
  if (elements.multiplicador) {
    elements.multiplicador.disabled = isPreFixada;
    if (isPreFixada) {
      elements.multiplicador.value = "100";
    }
  }
}

function openCreateDialog() {
  elements.dialogTitle.textContent = "Novo investimento";
  state.dialogMode = "create";
  elements.form.reset();
  elements.investmentId.value = "";
  elements.multiplicador.value = "100";
  elements.taxaFixa.value = "0";
  setMultiplicadorByIndexador();
  elements.dialog.showModal();
}

function openEditDialog() {
  const selected = state.investments.find((item) => item.id === state.selectedInvestmentId);
  if (!selected) {
    setFeedback(elements.feedback, "Selecione uma linha para editar.", true);
    return;
  }
  elements.dialogTitle.textContent = "Editar investimento";
  state.dialogMode = "edit";
  elements.investmentId.value = selected.id;
  elements.data.value = formatISOToDisplay(selected.data || "");
  elements.valor.value = selected.valor ?? "";
  elements.investimento.value = selected.investimento || "";
  elements.indexador.value = selected.indexador || "SELIC";
  elements.taxaFixa.value = selected.taxaFixa ?? 0;
  elements.multiplicador.value = selected.multiplicador ?? 100;
  elements.vencimento.value = formatISOToDisplay(selected.vencimento || "");
  setMultiplicadorByIndexador();
  elements.dialog.showModal();
}

function collectFormData() {
  const isPreFixada = (elements.indexador?.value || "").toUpperCase() === "PREFIXADA";
  return normalizeInvestmentInput({
    id: elements.investmentId.value,
    data: formatDisplayToISO(elements.data.value) || elements.data.value,
    valor: elements.valor.value,
    investimento: elements.investimento.value,
    indexador: elements.indexador.value,
    taxaFixa: elements.taxaFixa.value,
    multiplicador: isPreFixada ? "100" : elements.multiplicador.value,
    vencimento: formatDisplayToISO(elements.vencimento.value) || elements.vencimento.value,
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const dataIso = formatDisplayToISO(elements.data.value);
  const vencimentoIso = formatDisplayToISO(elements.vencimento.value);
  if (elements.data.value.trim() && !dataIso) {
    setFeedback(elements.feedback, "Preencha a data no formato dd/mm/aaaa (apenas números).", true);
    elements.data.focus();
    return;
  }
  if (elements.vencimento.value.trim() && !vencimentoIso) {
    setFeedback(elements.feedback, "Preencha o vencimento no formato dd/mm/aaaa (apenas números).", true);
    elements.vencimento.focus();
    return;
  }
  const payload = collectFormData();
  try {
    const result =
      state.dialogMode === "create"
        ? await createInvestment(payload, state.adminPassword)
        : await updateInvestment(payload.id, payload, state.adminPassword);

    applyPortfolioPayload(result);
    elements.dialog.close();
    refreshUI();
    setFeedback(
      elements.feedback,
      state.dialogMode === "create"
        ? "Investimento cadastrado com sucesso."
        : "Investimento atualizado com sucesso.",
    );
  } catch (error) {
    setFeedback(elements.feedback, `Falha ao salvar investimento: ${error.message}`, true);
  }
}

async function handleDownloadBackup() {
  try {
    const payload = await fetchPortfolio(state.adminPassword);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caixa-cici-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback(elements.feedback, "Backup baixado com sucesso.");
  } catch (error) {
    setFeedback(elements.feedback, `Falha ao baixar backup: ${error.message}`, true);
  }
}

async function handleRefreshIndices() {
  try {
    setFeedback(elements.feedback, "Atualizando índices e recalculando carteira...");
    const payload = await updateIndices(state.adminPassword);
    applyPortfolioPayload(payload);
    refreshUI();
    setFeedback(elements.feedback, "Índices atualizados e carteira recalculada.");
  } catch (error) {
    setFeedback(elements.feedback, `Falha ao atualizar índices: ${error.message}`, true);
  }
}

async function handleDeleteInvestment() {
  const selected = state.investments.find((item) => item.id === state.selectedInvestmentId);
  if (!selected) {
    setFeedback(elements.feedback, "Selecione uma linha para excluir.", true);
    return;
  }

  const confirmed = window.confirm(
    `Tem certeza que deseja excluir o investimento "${selected.investimento}"? Esta acao nao pode ser desfeita.`,
  );
  if (!confirmed) {
    return;
  }

  try {
    const payload = await deleteInvestment(selected.id, state.adminPassword);
    applyPortfolioPayload(payload);
    refreshUI();
    setFeedback(elements.feedback, "Investimento excluido com sucesso.");
  } catch (error) {
    setFeedback(elements.feedback, `Falha ao excluir investimento: ${error.message}`, true);
  }
}

function handleRowSelection(event) {
  const row = event.target.closest("tr[data-id]");
  if (!row) {
    return;
  }
  const id = row.getAttribute("data-id");
  if (id == null || id === "") {
    return;
  }
  state.selectedInvestmentId = id;
  refreshUI();
}

function setupEvents() {
  document.body.addEventListener("click", (e) => {
    if (e.target.closest("#investments-body")) {
      handleRowSelection(e);
    }
  });
  elements.form?.addEventListener("submit", handleFormSubmit);
  elements.cancelDialogBtn?.addEventListener("click", () => elements.dialog?.close());
  elements.loginForm?.addEventListener("submit", handleLoginSubmit);
  elements.newInvestmentBtn?.addEventListener("click", openCreateDialog);
  elements.editInvestmentBtn?.addEventListener("click", openEditDialog);
  elements.deleteInvestmentBtn?.addEventListener("click", handleDeleteInvestment);
  elements.refreshIndicesBtn?.addEventListener("click", handleRefreshIndices);
  elements.downloadBackupBtn?.addEventListener("click", handleDownloadBackup);
  elements.indexador?.addEventListener("change", setMultiplicadorByIndexador);
}

async function init() {
  setupEvents();
  setupDateInput(elements.data);
  setupDateInput(elements.vencimento);
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      await checkAuth(stored);
      state.adminPassword = stored;
      showApp();
      await loadPortfolio(true);
      return;
    } catch (_) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  showLogin();
}

init();
