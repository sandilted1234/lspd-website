// assets/js/penal-code.js
import { withBasePath } from "./basepath.js";

const els = {
  input: document.querySelector("#pcSearch"),
  results: document.querySelector("#pcResults"),
  status: document.querySelector("#pcStatus"),
};

let PC_DATA = [];
let LOADED = false;

function normalize(str) {
  return (str ?? "").toString().trim().toLowerCase();
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Supports multiple JSON schemas:
 * - { id, title, description, fine, jail, category }
 * - { code, name, details, amount, time, type }
 * - { sections: [...] } or { data: [...] } wrappers
 */
function coerceToArray(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.sections)) return json.sections;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.items)) return json.items;
  return [];
}

function mapEntry(raw) {
  // Try many possible field names so your JSON doesn’t have to be perfect
  const id =
    raw.id ?? raw.code ?? raw.section ?? raw.pcid ?? raw.number ?? "";

  const title =
    raw.title ?? raw.name ?? raw.offense ?? raw.charge ?? raw.label ?? "";

  const description =
    raw.description ?? raw.details ?? raw.desc ?? raw.summary ?? "";

  const fine =
    raw.fine ?? raw.amount ?? raw.fee ?? raw.ticket ?? raw.money ?? null;

  const jail =
    raw.jail ?? raw.time ?? raw.minutes ?? raw.detention ?? null;

  const category =
    raw.category ?? raw.type ?? raw.class ?? raw.level ?? "";

  return { id, title, description, fine, jail, category, _raw: raw };
}

function setStatus(msg, kind = "info") {
  if (!els.status) return;
  els.status.textContent = msg;
  els.status.dataset.kind = kind; // style hook if you want
}

function renderResults(list, query) {
  if (!els.results) return;

  if (!LOADED) {
    els.results.innerHTML = "";
    setStatus("Loading penal code database…", "info");
    return;
  }

  if (!query) {
    els.results.innerHTML = "";
    setStatus("Type to search penal code (e.g., 'robbery', 'PC-101', 'felony').", "info");
    return;
  }

  if (list.length === 0) {
    els.results.innerHTML = "";
    setStatus("No matches found.", "warn");
    return;
  }

  setStatus(`Found ${list.length} match(es).`, "ok");

  els.results.innerHTML = list
    .slice(0, 100)
    .map((x) => {
      const id = escapeHtml(x.id);
      const title = escapeHtml(x.title);
      const desc = escapeHtml(x.description);
      const cat = escapeHtml(x.category);

      const fine =
        x.fine === null || x.fine === "" ? "" : `<span class="pill">Fine: $${escapeHtml(x.fine)}</span>`;
      const jail =
        x.jail === null || x.jail === "" ? "" : `<span class="pill">Jail: ${escapeHtml(x.jail)}</span>`;
      const category = cat ? `<span class="pill">${cat}</span>` : "";

      return `
        <div class="result-card">
          <div class="result-top">
            <div class="result-title">${title || "(Untitled)"} <span class="result-id">${id}</span></div>
            <div class="result-pills">${category}${fine}${jail}</div>
          </div>
          <div class="result-desc">${desc || "<em>No description.</em>"}</div>
        </div>
      `;
    })
    .join("");
}

function filterData(query) {
  const q = normalize(query);
  if (!q) return [];

  return PC_DATA.filter((x) => {
    const hay = normalize(
      `${x.id} ${x.title} ${x.description} ${x.category}`
    );
    return hay.includes(q);
  });
}

async function loadPenalCodes() {
  try {
    setStatus("Loading penal code database…", "info");

    // ✅ Put your JSON here (default path)
    const url = withBasePath("assets/data/penal_codes.json");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);

    const json = await res.json();
    const arr = coerceToArray(json);

    PC_DATA = arr.map(mapEntry).filter((x) => x.id || x.title || x.description);
    LOADED = true;

    setStatus(`Penal code loaded (${PC_DATA.length} entries).`, "ok");
    renderResults([], ""); // reset UI
  } catch (err) {
    LOADED = false;
    console.error("[PenalCode] Load failed:", err);
    setStatus("Penal code failed to load. Check Console + Network for the JSON request.", "error");
    if (els.results) els.results.innerHTML = "";
  }
}

function bind() {
  if (!els.input) return;

  els.input.addEventListener("input", () => {
    const q = els.input.value;
    const matches = filterData(q);
    renderResults(matches, q);
  });
}

loadPenalCodes();
bind();
