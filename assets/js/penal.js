let CODES = [];

function norm(s){
  return String(s||"").toLowerCase().trim();
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
  if(n === null || n === undefined || n === "") return "Variable";
  return `$${Number(n||0).toLocaleString()}`;
}

async function loadCodes(){
  const res = await fetch("./assets/data/penal_codes.json", { cache:"no-store" });
  if(!res.ok) throw new Error(`JSON load failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if(!Array.isArray(data)) throw new Error("penal_codes.json must be an array []");
  return data;
}

function buildHay(c){
  const parts = [
    `pc ${c.code}`,
    c.code,
    c.title,
    c.category,
    c.description,
    c.notes,
    ...(c.keywords || [])
  ].filter(Boolean).map(norm);
  return parts.join(" | ");
}

function score(tokens, c){
  let s = 0;
  const qCode = normCode(tokens.join(""));
  const cCode = normCode(c.code);

  if(qCode && cCode === qCode) s += 100;

  const title = norm(c.title);
  const cat = norm(c.category);
  const kws = (c.keywords || []).map(norm);

  for(const t of tokens){
    if(!t) continue;

    if(title === t) s += 40;
    if(title.includes(t)) s += 12;

    if(cat.includes(t)) s += 6;

    if(kws.includes(t)) s += 18;
    if(kws.some(k => k.includes(t) || t.includes(k))) s += 6;

    if(cCode.includes(normCode(t))) s += 10; // partial code match
  }

  return s;
}

function renderListItem(c){
  const fine = money(c.fine);
  const stars = Number(c.stars||0);
  return `
    <div class="item" data-pc="${c.code}">
      <div class="title">PC ${c.code} — ${c.title}</div>
      <div class="kpi">
        <div class="pill">Fine: <b>${fine}</b></div>
        <div class="pill">Stars: <span class="stars">${starsBar(stars)}</span> <b>${stars}</b></div>
        <div class="pill">Jail: <b>${c.jail ?? "—"} min</b></div>
      </div>
      <div class="small">${c.description || ""}</div>
      ${c.notes ? `<div class="small"><b>Notes:</b> ${c.notes}</div>` : ``}
    </div>
  `;
}

function renderSelected(c){
  return `
    <div class="item">
      <div class="title">PC ${c.code} — ${c.title}</div>
      <div class="small">${c.description || ""}</div>
      <div class="kpi">
        <div class="pill">Category: <b>${c.category || "—"}</b></div>
        <div class="pill">Fine: <b>${money(c.fine)}</b></div>
        <div class="pill">Stars: <span class="stars">${starsBar(c.stars)}</span> <b>${Number(c.stars||0)}</b></div>
      </div>
      ${c.notes ? `<div class="small" style="margin-top:8px"><b>Notes:</b> ${c.notes}</div>` : ``}
      <div class="small" style="margin-top:8px">
        <b>Keywords:</b> ${(c.keywords||[]).join(", ") || "None"}
      </div>
    </div>
  `;
}

export async function initPenalPage(){
  const searchEl = document.getElementById("pcSearch");
  const runBtn = document.getElementById("pcRun");     // NEW
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

  const H = CODES.map(c => ({ c, hay: buildHay(c) }));

  function apply({scroll=false} = {}){
    const q = norm(searchEl.value);
    const tokens = q.split(/\s+/).filter(Boolean);

    let list = H;

    if(q){
      list = H
        .map(x => ({...x, s: score(tokens, x.c)}))
        .filter(x => (x.s > 0) || x.hay.includes(q))
        .sort((a,b)=> (b.s||0) - (a.s||0));
    }else{
      // show everything if empty query
      list = H.slice();
    }

    const mode = sortEl.value;
    if(mode === "code"){
      list.sort((a,b)=> normCode(a.c.code).localeCompare(normCode(b.c.code)));
    }else if(mode === "fine_desc"){
      list.sort((a,b)=> (Number(b.c.fine)||0) - (Number(a.c.fine)||0));
    }else if(mode === "stars_desc"){
      list.sort((a,b)=> (Number(b.c.stars)||0) - (Number(a.c.stars)||0));
    }

    const items = list.slice(0, 250);
    resultsEl.innerHTML = items.length
      ? items.map(x => renderListItem(x.c)).join("")
      : `<div class="muted">No results for <b>${searchEl.value}</b>.</div>`;

    resultsEl.querySelectorAll(".item[data-pc]").forEach(el=>{
      el.addEventListener("click", ()=>{
        const code = el.getAttribute("data-pc");
        const hit = CODES.find(c => String(c.code) === String(code));
        if(hit) selectedEl.innerHTML = renderSelected(hit);
      });
    });

    if(scroll){
      resultsEl.scrollIntoView({ behavior:"smooth", block:"start" });
    }
  }

  // 🔥 ENTER KEY FIX (this is what you asked for)
  searchEl.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      e.preventDefault();
      apply({scroll:true});
    }
  });

  // Button click also triggers a “search”
  if(runBtn){
    runBtn.addEventListener("click", ()=>apply({scroll:true}));
  }

  // typing still updates live
  searchEl.addEventListener("input", ()=>apply({scroll:false}));

  sortEl.addEventListener("change", ()=>apply({scroll:false}));

  clearBtn.addEventListener("click", ()=>{
    searchEl.value = "";
    sortEl.value = "relevance";
    selectedEl.innerHTML = `<div class="muted">Click a charge from the list to see details.</div>`;
    apply({scroll:false});
  });

  // Initial render: shows ALL charges so it’s never empty
  apply({scroll:false});
}
