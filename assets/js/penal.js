let CODES = [];

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim();
}

function normCode(s){
  return norm(s)
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

function money(n){
  return `$${Number(n||0).toLocaleString()}`;
}

async function loadCodes(){
  const res = await fetch("./assets/data/penal_codes.json", { cache:"no-store" });
  if(!res.ok) throw new Error(`JSON load failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if(!Array.isArray(data)) throw new Error("penal_codes.json must be an array []");
  return data;
}

function buildSearchHaystack(c){
  const parts = [
    `pc ${c.code}`,
    c.code,
    c.title,
    c.description,
    ...(c.keywords || [])
  ].filter(Boolean).map(norm);
  return parts.join(" | ");
}

function score(queryTokens, c){
  // simple relevance: direct code hit > title hit > keyword hit > partial hit
  let s = 0;
  const qCode = normCode(queryTokens.join(""));
  const cCode = normCode(c.code);

  if(qCode && cCode === qCode) s += 100;

  const title = norm(c.title);
  const kws = (c.keywords || []).map(norm);

  for(const t of queryTokens){
    if(!t) continue;
    if(title === t) s += 40;
    if(title.includes(t)) s += 12;

    if(kws.includes(t)) s += 18;
    if(kws.some(k => k.includes(t) || t.includes(k))) s += 6;

    // code partial match
    if(cCode.includes(normCode(t))) s += 10;
  }

  return s;
}

function renderListItem(c, highlight=false){
  const fine = money(c.fine);
  const stars = Number(c.stars||0);
  return `
    <div class="item" data-pc="${c.code}">
      <div class="title">PC ${c.code} — ${c.title}</div>
      <div class="kpi">
        <div class="pill">Fine: <b>${fine}</b></div>
        <div class="pill">Stars: <span class="stars">${starsBar(stars)}</span> <b>${stars}</b></div>
        <div class="pill">Jail: <b>${c.jail ?? 0} min</b></div>
      </div>
      <div class="small">${c.description || ""}</div>
    </div>
  `;
}

function renderSelected(c){
  return `
    <div class="item">
      <div class="title">PC ${c.code} — ${c.title}</div>
      <div class="small">${c.description || ""}</div>
      <div class="kpi">
        <div class="pill">Fine: <b>${money(c.fine)}</b></div>
        <div class="pill">Stars: <span class="stars">${starsBar(c.stars)}</span> <b>${Number(c.stars||0)}</b></div>
        <div class="pill">Jail: <b>${c.jail ?? 0} min</b></div>
      </div>
      <div class="small" style="margin-top:8px">
        <b>Keywords:</b> ${(c.keywords||[]).join(", ") || "None"}
      </div>
    </div>
  `;
}

export async function initPenalPage(){
  const searchEl = document.getElementById("pcSearch");
  const sortEl = document.getElementById("pcSort");
  const clearBtn = document.getElementById("pcClear");
  const resultsEl = document.getElementById("pcResults");
  const selectedEl = document.getElementById("pcSelected");
  const debugEl = document.getElementById("pcDebug");

  try{
    CODES = await loadCodes();
    debugEl.innerHTML = `Loaded <b>${CODES.length}</b> charges.`;
  }catch(err){
    debugEl.innerHTML = `❌ <b>Could not load penal codes.</b><br/>
      Make sure the file exists at <code>assets/data/penal_codes.json</code>.<br/>
      Error: <code>${String(err.message || err)}</code>`;
    resultsEl.innerHTML = "";
    return;
  }

  // Precompute haystacks for fast search
  const H = CODES.map(c => ({ c, hay: buildSearchHaystack(c) }));

  function apply(){
    const q = norm(searchEl.value);
    const tokens = q.split(/\s+/).filter(Boolean);

    let list = H;

    if(q){
      list = H
        .map(x => ({...x, s: score(tokens, x.c)}))
        .filter(x => x.s > 0 || x.hay.includes(q))
        .sort((a,b)=> (b.s||0) - (a.s||0));
    }else{
      list = H.slice();
    }

    // sorting
    const mode = sortEl.value;
    if(mode === "code"){
      list.sort((a,b)=> normCode(a.c.code).localeCompare(normCode(b.c.code)));
    }else if(mode === "fine_desc"){
      list.sort((a,b)=> (Number(b.c.fine)||0) - (Number(a.c.fine)||0));
    }else if(mode === "stars_desc"){
      list.sort((a,b)=> (Number(b.c.stars)||0) - (Number(a.c.stars)||0));
    } // relevance default keeps current

    const shown = list.slice(0, 200).map(x => renderListItem(x.c)).join("");
    resultsEl.innerHTML = shown || `<div class="muted">No results.</div>`;

    // click handlers
    resultsEl.querySelectorAll(".item[data-pc]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const code = el.getAttribute("data-pc");
        const hit = CODES.find(c => String(c.code) === String(code));
        if(hit) selectedEl.innerHTML = renderSelected(hit);
      });
    });
  }

  searchEl.addEventListener("input", apply);
  sortEl.addEventListener("change", apply);
  clearBtn.addEventListener("click", ()=>{
    searchEl.value = "";
    sortEl.value = "relevance";
    selectedEl.innerHTML = `<div class="muted">Click a charge from the list to see details.</div>`;
    apply();
  });

  // initial render (shows everything)
  apply();
}
