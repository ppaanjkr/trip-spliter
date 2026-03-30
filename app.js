const API = "https://script.google.com/macros/s/AKfycbyfcukVmP5_mErQko3Re6kwVbr5qrtiLm751GosrKd27T1cLJI45WFSSmCLwBt2t2D28A/exec";

async function init(){
  await showLoading();
  const res = await fetch(API + "?action=getActiveTrip");
  const trip = await res.json();

  if (trip) {
    window.location.href = `trip.html?trip=${trip.tripId}`;
  } else {
    await loadTrips();
    await hideLoading();
  }
}

init();

// โหลดประวัติทริป
async function loadTrips(){

  try{
    const res = await fetch(API + "?action=getTrips");
    const trips = await res.json();

    const el = document.getElementById("tripList");

    if (!trips.length) {
      el.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#71767A" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
          </div>
          <div class="empty-title">No trips</div>
        </div>
      `;
    }else{
      el.innerHTML = trips.map(t => `
          <div class="card" onclick="goTrip('${t.tripId}')">

          <div class="trip-row">
              <div>
              <div class="trip-title">${t.tripName}</div>
                <div class="trip-sub">${t.members.join(", ")}</div>
              </div>

              <div><strong>${t.totalTHB} THB</strong></div>
          </div>

          </div>
      `).join("");
    }
  }catch (err){
    hideLoading();
    console.error(err);
    showModal("Failed to load data");
  }

  
}
function goTrip(id){
  window.location.href = `trip.html?trip=${id}`;
}
function goCreateTrip(){
  window.location.href = "create.html";
}

function showLoading(){
  document.getElementById("loadingOverlay")?.classList.remove("hidden");
}
function hideLoading(){
  document.getElementById("loadingOverlay")?.classList.add("hidden");
}
function showModal(text, onConfirm){
  const modal = document.getElementById("modal");
  const textEl = document.getElementById("modalText");
  const btn = document.getElementById("modalBtn");

  if (!modal || !textEl || !btn) return;

  textEl.innerText = text;

  modal.classList.remove("hidden");

  btn.onclick = () => {
    modal.classList.add("hidden");
    if (onConfirm) onConfirm();
  };
}

