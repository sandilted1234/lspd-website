let CODES = [];

function tokenize(text){
  return String(text||"")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .split(/\s+/)
    .filter(Boolean);
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

function scoreCharge(tokens, charge){
  const kws = (charge.keywords || []).map(k=>String(k).toLowerCase());
  const title = String(charge.title||"").toLowerCase();
  let score = 0;

  for(const t of tokens){
    if(title.includes(t)) score += 2;
    if(kws.includes(t)) score += 3;
    if(kws.some(k=>k.startsWith(t) || t.startsWith(k))) score += 1; // partial match
  }
  return score;
}

export async function initSituation(){
  await loadCodes();

  const input = document.getElementById("saInput");
  const btn = document.getElementById("saBtn");
  const out = document.getElementById("saResults");

  function render(list){
    if(!list.length){
      out.innerHTML = `<div class="muted">No matches. Try keywords like “evading”, “resisting”, “cocaine”, “weapon”.</div>`;
      return;
    }

    const totalFine = list.reduce((a,c)=>a+(Number(c.fine)||0),0);
    const totalStars = list.reduce((a,c)=>a+(Number(c.stars)||0),0);

    out.innerHTML = `
      <div class="kpi">
        <div class="pill">Matches: <b>${list.length}</b></div>
        <div class="pill">Total Fine: <b>$${totalFine.toLocaleString()}</b></div>
        <div class="pill">Total Stars: <b>${totalStars}</b></div>
      </div>
      <div style="margin-top:10px">
        ${list.map(c=>`
          <div class="item">
            <div class="title">PC ${c.code} — ${c.title}</div>
            <div class="small">${c.description || ""}</div>
            <div class="kpi">
              <div class="pill">Fine: <b>$${Number(c.fine||0).toLocaleString()}</b></div>
              <div class="pill">Stars: <span class="stars">${starsBar(c.stars)}</span> <b>${c.stars}</b></div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function run(){
    const tokens = tokenize(input.value);
    if(!tokens.length){
      out.innerHTML = `<div class="muted">Describe the situation (example: “evading with cocaine”).</div>`;
      return;
    }

    const scored = CODES
      .map(c=>({c, s: scoreCharge(tokens, c)}))
      .filter(x=>x.s > 0)
      .sort((a,b)=>b.s-a.s)
      .slice(0, 12)
      .map(x=>x.c);

    render(scored);
  }

  btn.addEventListener("click", run);
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && (e.ctrlKey || e.metaKey)) run(); });

  out.innerHTML = `<div class="muted">Loaded <b>${CODES.length}</b> charges. Type keywords then Analyze.</div>`;
}
