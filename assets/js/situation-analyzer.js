// assets/js/situation-analyzer.js
import { withBasePath } from "./basepath.js";

const els = {
  input: document.querySelector("#saSearch"),
  results: document.querySelector("#saResults"),
  status: document.querySelector("#saStatus"),
  tags: document.querySelector("#saTags"), // optional container for quick filters
};

let SA_DATA = [];
let LOADED = false;
let ACTIVE_TAG = "all";

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

function coerceToArray(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.situations)) return json.situations;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.items)) return json.items;
  return [];
}

/**
 * Flexible mapping:
 * expects common fields like:
 * { title, summary, steps, charges, tags, risk }
 */
function mapEntry(raw) {
  const title = raw.title ?? raw.name ?? raw.scenario ?? "";
  const summary = raw.summary ?? raw.description ?? raw.details ?? "";
  const steps = raw.steps ?? raw.procedure ?? raw.actions ?? [];
  const charges = raw.charges ?? raw.recommended_charges ?? raw.penal ?? [];
  const tags = raw.tags ?? raw.categories ?? raw.type ?? [];
  const risk = raw.risk ?? raw.level ?? raw.threat ?? "";

  return {
    title,
    summary,
    steps: Array.isArray(steps) ? steps : (steps ? [steps] : []),
    charges: Array.isArray(charges) ? charges : (charges ? [charges] : []),
    tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
    risk,
    _raw: raw,
  };
}

function setStatus(msg, kind = "info") {
  if (!els.status) return;
  els.status.textContent = msg;
  els.status.dataset.kind = kind;
}

function uniqueTags(items) {
  const set = new Set();
  items.forEach((x) => (x.tags || []).forEach((t) => set.add(normalize(t))));
  return Array.from(set).filter(Boolean).sort();
}

function renderTags(tags) {
  if (!els.tags) return;
  const all = ["all", ...tags];

  els.tags.innerHTML = all
    .map((t) => {
      const label = t === "all" ? "All" : t;
      const active = t === ACTIVE_TAG ? "active" : "";
      return `<button class="tag-btn ${active}" data-tag="${escapeHtml(t)}">${escapeHtml(label)}</button>`;
    })
    .join("");

  els.tags.querySelectorAll("button[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      ACTIVE_TAG = btn.dataset.tag || "all";
      renderTags(tags); // re-render active state
      runSearch();
    });
  });
}

function matchesTag(item) {
  if (ACTIVE_TAG === "all") return true;
  const tags = (item.tags || []).map(normalize);
  return tags.includes(ACTIVE_TAG);
}

function runSearch() {
  const query = normalize(els.input?.value || "");

  if (!LOADED) {
    setStatus("Loading situation database…", "info");
    if (els.results) els.results.innerHTML = "";
    return;
  }

  const filtered = SA_DATA.filter((x) => {
    if (!matchesTag(x)) return false;

    if (!query) return true;

    const hay = normalize(
      `${x.title} ${x.summary} ${(x.steps || []).join(" ")} ${(x.charges || []).join(" ")} ${(x.tags || []).join(" ")} ${x.risk}`
    );
    return hay.includes(query);
  });

  renderResults(filtered, query);
}

function renderResults(list, query) {
  if (!els.results) return;

  if (!query && ACTIVE_TAG === "all") {
    setStatus("Search situations (e.g., 'traffic stop', 'shots fired', 'robbery').", "info");
  } else {
    setStatus(`Showing ${list.length} result(s).`, list.length ? "ok" : "warn");
  }

  if (list.length === 0) {
    els.results.innerHTML = "";
    return;
  }

  els.results.innerHTML = list
    .slice(0, 80)
    .map((x) => {
      const title = escapeHtml(x.title);
      const summary = escapeHtml(x.summary);
      const risk = escapeHtml(x.risk);

      const tags = (x.tags || [])
        .map((t) => `<span class="pill">${escapeHtml(t)}</span>`)
        .join("");

      const steps = (x.steps || [])
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("");

      const charges = (x.charges || [])
        .map((c) => `<li>${escapeHtml(c)}</li>`)
        .join("");

      return `
        <details class="result-card">
          <summary class="result-title">
            ${title || "(Untitled Situation)"}
            ${risk ? `<span class="pill danger">${risk}</span>` : ""}
          </summary>
          ${tags ? `<div class="result-pills">${tags}</div>` : ""}
          ${summary ? `<div class="result-desc">${summary}</div>` : ""}
          ${steps ? `<div class="block"><div class="block-title">Procedure</div><ol>${steps}</ol></div>` : ""}
          ${charges ? `<div class="block"><div class="block-title">Suggested Charges</div><ul>${charges}</ul></div>` : ""}
        </details>
      `;
    })
    .join("");
}

async function loadSituations() {
  try {
    setStatus("Loading situation database…", "info");

    const url = withBasePath("assets/data/situations.json");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${url}`);

    const json = await res.json();
    const arr = coerceToArray(json);

    SA_DATA = arr.map(mapEntry).filter((x) => x.title || x.summary);
    LOADED = true;

    setStatus(`Situations loaded (${SA_DATA.length} entries).`, "ok");
    renderTags(uniqueTags(SA_DATA));
    runSearch(); // ✅ run AFTER data load
  } catch (err) {
    LOADED = false;
    console.error("[SituationAnalyzer] Load failed:", err);
    setStatus("Situation database failed to load. Check Console + Network for the JSON request.", "error");
    if (els.results) els.results.innerHTML = "";
  }
}

function bind() {
  if (!els.input) return;
  els.input.addEventListener("input", runSearch);
}

loadSituations();
bind();
