let LIST = [];

async function load(){
  const res = await fetch("./assets/data/parking_towing_violations.json", { cache:"no-store" });
  if(!res.ok) throw new Error("Could not load assets/data/parking_towing_violations.json");
  LIST = await res.json();
}

export async function initTraffic(){
  await load();

  const q = document.getElementById("tpSearch");
  const out = document.getElementById("tpResults");

  function render(items){
    if(!items.length){
      out.innerHTML = `<div class="muted">No results.</div>`;
      return;
    }
    out.innerHTML = items.map(v=>`
      <div class="item">
        <div class="title">${v.code} — ${v.title}</div>
        <div class="kpi">
          <div class="pill">Fine: <b>$${Number(v.fine||0).toLocaleString()}</b></div>
        </div>
      </div>
    `).join("");
  }

  function run(){
    const term = (q.value||"").toLowerCase().trim();
    if(!term) return render(LIST);
    const filtered = LIST.filter(v =>
      String(v.code).toLowerCase().includes(term) ||
      String(v.title).toLowerCase().includes(term)
    );
    render(filtered);
  }

  q.addEventListener("input", run);
  render(LIST);
}
