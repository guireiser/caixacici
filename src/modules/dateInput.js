/**
 * Máscara de data dd/mm/aaaa: apenas dígitos, autoformatação.
 * Conversão de/para ISO (YYYY-MM-DD) para a API.
 */

const DATE_DISPLAY_LENGTH = 10; // dd/mm/aaaa
const DIGITS_ONLY_LENGTH = 8;

/**
 * Converte data exibida (dd/mm/aaaa) para ISO (YYYY-MM-DD).
 * @param {string} display - "dd/mm/aaaa" ou "ddmmaaaa" parcial
 * @returns {string} "YYYY-MM-DD" ou "" se inválido
 */
export function formatDisplayToISO(display) {
  if (!display || typeof display !== "string") return "";
  const digits = display.replace(/\D/g, "");
  if (digits.length !== DIGITS_ONLY_LENGTH) return "";
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const aaaa = digits.slice(4, 8);
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(aaaa, 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return "";
  const iso = `${aaaa}-${mm}-${dd}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return iso;
}

/**
 * Converte data ISO (YYYY-MM-DD) para exibição (dd/mm/aaaa).
 * @param {string} iso - "YYYY-MM-DD"
 * @returns {string} "dd/mm/aaaa" ou ""
 */
export function formatISOToDisplay(iso) {
  if (!iso || typeof iso !== "string") return "";
  const normalized = iso.trim().slice(0, 10);
  if (normalized.length !== 10) return "";
  const [y, m, d] = normalized.split("-");
  if (!y || !m || !d) return "";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/**
 * Aplica máscara dd/mm/aaaa ao valor atual do input (apenas dígitos).
 * @param {string} value - texto atual
 * @returns {string} valor formatado (ex: "31/12/2025")
 */
function applyMask(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, DIGITS_ONLY_LENGTH);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Configura um input para aceitar apenas números e exibir máscara dd/mm/aaaa.
 * @param {HTMLInputElement} input
 */
export function setupDateInput(input) {
  if (!input || input.type === "date") return;

  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("placeholder", "dd/mm/aaaa");
  input.setAttribute("maxlength", DATE_DISPLAY_LENGTH);

  input.addEventListener("input", () => {
    const start = input.selectionStart;
    const oldLen = (input.value || "").length;
    const formatted = applyMask(input.value);
    input.value = formatted;
    const newLen = formatted.length;
    let newStart = start;
    if (newLen > oldLen && formatted.charAt(start - 1) === "/") newStart = start + 1;
    input.setSelectionRange(newStart, newStart);
  });

  input.addEventListener("keydown", (e) => {
    const key = e.key;
    if (key === "Backspace" || key === "Delete" || key === "Tab" || key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End") return;
    if (e.ctrlKey || e.metaKey) {
      if (key === "a" || key === "c" || key === "v" || key === "x") return;
    }
    if (key.length === 1 && !/\d/.test(key)) e.preventDefault();
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, DIGITS_ONLY_LENGTH);
    const formatted = applyMask(pasted);
    input.value = formatted;
  });
}
