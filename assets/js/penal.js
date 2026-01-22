let CODES = [];

function normalizeCode(s){
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g,"")
    .replace(/^pc/i,"")
    .replace(/^pc\./i,"")
    .replace(/^pc:/i,"")
    .replace(/^pc-/i,"")
    .replace(/[^0-9.]/g,"");
}

function starsBar(n){
  const count = Math.max(0, Number(n)||0);
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5-count));
}

async function loadCodes(){
  const res = await fetch("./assets/data/penal_codes.json", { cache:"no-store" });
  if(!res.ok) throw new Error("Could not load assets/data/penal_codes.json");
  CODES = await res.json();
}

function renderCharge(c){
  return `
    <div class="item">
      <div class="title">PC ${c.code} — ${c.title}</div>
      <div class="small">${c.description || ""}</div>
      <div class="kpi">
        <div class="pill">Fine: <b>$${Number(c.fine||0).toLocaleString()}</b></div>
        <div class="pill">Jail: <b>${c.jail ?? 0} min</b></div>
        <div class="pill">Stars: <span class="stars">${starsBar(c.stars)}</span> <b>${c.stars}</b></div>
      </div>
    </div>
  `;
}

export async function initPenalLookup(){
  const input = document.getElementById("pcInput");
  const btn = document.getElementById("pcSearchBtn");
  const out = document.getElementById("pcResults");

  await loadCodes();

  function run(){
    const val = input.value.trim();
    if(!val){
      out.innerHTML = `<div class="muted">Enter a penal code (example: <b>PC 2.10.6</b>).</div>`;
      return;
    }
    const n = normalizeCode(val);
    const hit = CODES.find(c => normalizeCode(c.code) === n);

    if(!hit){
      out.innerHTML = `<div class="muted">No match for <b>${val}</b>. Try <b>2.10.6</b>.</div>`;
      return;
    }
    out.innerHTML = renderCharge(hit);
  }

  btn.addEventListener("click", run);
  input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") run(); });

  out.innerHTML = `<div class="muted">Loaded <b>${CODES.length}</b> charges.</div>`;
}
