let penalData = [];

const elSituation = document.getElementById("situationInput");
const elAnalysis = document.getElementById("analysisBox");
const elCopy = document.getElementById("btnCopy");
const elBack = document.getElementById("btnBack");

const elPcSearch = document.getElementById("pcSearch");
const elPcResults = document.getElementById("pcResults");
const elPcCount = document.getElementById("pcCount");
const elClear = document.getElementById("btnClear");
const elReload = document.getElementById("btnReload");

// --- Back button
elBack.addEventListener("click", () => {
  // safer than history.back() if user opened directly
  if (window.history.length > 1) window.history.back();
  else window.location.href = "index.html";
});

// --- Quick fill chips
document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    elSituation.value = btn.dataset.fill || "";
    elSituation.focus();
    analyzeSituation(elSituation.value);
  });
});

// --- Situation analyzer
elSituation.addEventListener("input", () => analyzeSituation(elSituation.value));

function analyzeSituation(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) {
    elAnalysis.textContent = "Awaiting input...";
    return;
  }

  const lines = [];
  lines.push("Dispatch Summary:");
  lines.push(`• ${text}`);
  lines.push("");

  // Simple logic (customize later)
  if (t.includes("shots") || t.includes("gun") || t.includes("fired")) {
    lines.push("Threat Level: HIGH");
    lines.push("Suggested Response: CODE 3, establish perimeter, request additional units.");
    lines.push("Notes: Consider EMS standby and suspect description / direction of travel.");
  } else if (t.includes("pursuit") || t.includes("10-80") || t.includes("chase")) {
    lines.push("Threat Level: MEDIUM-HIGH");
    lines.push("Suggested Response: CODE 3, comms on primary, callouts, coordinate spikes if approved.");
  } else if (t.includes("robbery")) {
    lines.push("Threat Level: MEDIUM");
    lines.push("Suggested Response: CODE 2/3 depending on weapon info, contain exits, attempt negotiation if hostage risk.");
  } else if (t.includes("officer down")) {
    lines.push("Threat Level: CRITICAL");
    lines.push("Suggested Response: ALL AVAILABLE UNITS, CODE 3, secure scene, EMS immediate, request supervisor.");
  } else {
    lines.push("Threat Level: UNKNOWN");
    lines.push("Suggested Response: Gather details (weapons, suspects, vehicles, injuries) and escalate as needed.");
  }

  elAnalysis.textContent = lines.join("\n");
}

// Copy analysis
elCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(elAnalysis.textContent);
    elCopy.textContent = "Copied!";
    setTimeout(() => (elCopy.textContent = "Copy"), 900);
  } catch {
    alert("Clipboard blocked by browser. Select and copy manually.");
  }
});

// --- Penal Code data load
async function loadPenalData() {
  try {
    const res = await fetch("assets/data/penal_codes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load penal data");
    penalData = await res.json();
    renderPenalResults("");
  } catch (err) {
    elPcResults.innerHTML = `
      <div class="pc-item">
        <div class="pc-title">Could not load penal_codes.json</div>
        <div class="pc-meta">
          <span class="badge">Check file path</span>
          <span class="badge">assets/data/penal_codes.json</span>
        </div>
      </div>`;
    elPcCount.textContent = "0 results";
  }
}

function renderPenalResults(query) {
  const q = (query || "").toLowerCase().trim();

  const list = !q
    ? penalData.slice(0, 20) // show first 20 when empty
    : penalData.filter(item => {
        const code = String(item.code || "").toLowerCase();
        const title = String(item.title || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        return code.includes(q) || title.includes(q) || desc.includes(q);
      }).slice(0, 50);

  elPcCount.textContent = `${list.length} result${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    elPcResults.innerHTML = `
      <div class="pc-item">
        <div class="pc-title">No matching penal codes.</div>
        <div class="pc-meta"><span class="badge">Try a different keyword</span></div>
      </div>`;
    return;
  }

  elPcResults.innerHTML = list.map(item => {
    const fine = item.fine ?? "—";
    const jail = item.jail ?? "—";
    const felony = item.felony ? "Felony" : "Misdemeanor";
    return `
      <div class="pc-item">
        <div class="pc-top">
          <div>
            <div class="pc-code">${escapeHtml(item.code)}</div>
            <div class="pc-title">${escapeHtml(item.title)}</div>
          </div>
          <div class="pc-meta">
            <span class="badge">${felony}</span>
            <span class="badge">Fine: ${escapeHtml(String(fine))}</span>
            <span class="badge">Jail: ${escapeHtml(String(jail))}</span>
          </div>
        </div>
        ${item.description ? `<div class="muted" style="margin-top:8px">${escapeHtml(item.description)}</div>` : ""}
      </div>
    `;
  }).join("");
}

elPcSearch.addEventListener("input", () => renderPenalResults(elPcSearch.value));

elClear.addEventListener("click", () => {
  elPcSearch.value = "";
  renderPenalResults("");
  elPcSearch.focus();
});

elReload.addEventListener("click", () => loadPenalData());

// Basic HTML escaping
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// init
loadPenalData();
