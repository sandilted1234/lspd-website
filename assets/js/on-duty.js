function fmt(ms){
  const s = Math.floor(ms/1000);
  const hh = String(Math.floor(s/3600)).padStart(2,"0");
  const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${hh}:${mm}:${ss}`;
}

export function initOnDuty(){
  const startBtn = document.getElementById("startDuty");
  const endBtn = document.getElementById("endDuty");
  const timerEl = document.getElementById("shiftTimer");

  const openModalBtn = document.getElementById("openBodycam");
  const backdrop = document.getElementById("modalBackdrop");
  const closeModalBtn = document.getElementById("closeModal");

  let start = null;
  let t = null;

  function tick(){
    timerEl.textContent = fmt(Date.now() - start);
  }

  startBtn.addEventListener("click", ()=>{
    if(start) return;
    start = Date.now();
    tick();
    t = setInterval(tick, 250);
  });

  endBtn.addEventListener("click", ()=>{
    if(!start) return;
    clearInterval(t);
    t = null;
    start = null;
    timerEl.textContent = "00:00:00";
  });

  function openModal(){ backdrop.style.display = "flex"; }
  function closeModal(){ backdrop.style.display = "none"; }

  openModalBtn.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e)=>{ if(e.target === backdrop) closeModal(); });

  document.querySelectorAll("[data-copy]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const cmd = btn.getAttribute("data-copy");
      try{
        await navigator.clipboard.writeText(cmd);
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(()=>btn.textContent = old, 900);
      }catch{
        alert("Clipboard blocked by browser. Copy manually.");
      }
    });
  });
}
