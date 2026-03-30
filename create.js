import { currencies } from "./data.js";
import { showLoading, hideLoading, showModal } from "./utils.js";

const API = "https://script.google.com/macros/s/AKfycbwRQ8J7DAYMUJ3bfe4eLlDUmVe4AuKS-RJnkwnaVUEANsB2xpT1Npzy7mMA6LfV69WSgg/exec";

let selectedMembers = [];

async function init(){

  await loadMembers();
  await loadCurrencies();

}
init();


async function loadMembers(){

  const res = await fetch(API + "?action=getMembers");
  const members = await res.json();

  const el = document.getElementById("memberList");

  el.innerHTML = members.map(m => `
    <div class="member" data-id="${m.memberId}">
      <div class="avatar">${m.avatar}</div>
      <div>${m.name}</div>
    </div>
  `).join("");

  bindMemberEvents(); 
}
function bindMemberEvents(){

  const items = document.querySelectorAll(".member");

  items.forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      toggleMember(id, el);
    });
  });

}

function loadCurrencies(){

  const el = document.getElementById("currency");

  el.innerHTML = currencies.map(c => `
  <option value="${c.code}">
    ${c.code} • ${c.name}
  </option>
`).join("");
}

function toggleMember(id, el){

  if (selectedMembers.includes(id)) {
    selectedMembers = selectedMembers.filter(m => m !== id);
    el.classList.remove("selected");
  } else {
    selectedMembers.push(id);
    el.classList.add("selected");
  }

}

document.getElementById("createTrip")
  .addEventListener("click", async () => {

    const tripName = document.getElementById("tripName").value.trim();
    const currency = document.getElementById("currency").value;

    if (!tripName) {
      showModal("Please enter trip name");
      return;
    }

    if (selectedMembers.length === 0) {
      showModal("Please select members");
      return;
    }

    try {

      showLoading(); 

      const res = await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "createTrip",
          data: {
            tripName,
            currency,
            memberIds: selectedMembers
          }
        })
      });

      const data = await res.json();

      hideLoading(); 

      if (!data.success) {
        showModal(data.message || "Error occurred");
        return;
      }

      showModal("Trip created successfully", () => {
        window.location.href = `trip.html?trip=${data.tripId}`;
      });

    } catch (err) {

      hideLoading();

      console.error(err);

      showModal("Something went wrong");
    }

});

document.getElementById("backBtn")
  .addEventListener("click", () => {
    window.history.back();
});