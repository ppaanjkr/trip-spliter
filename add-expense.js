import { expenseTypes } from "./data.js";
import { showLoading, hideLoading, showModal } from "./utils.js";

const API = "https://script.google.com/macros/s/AKfycbyfcukVmP5_mErQko3Re6kwVbr5qrtiLm751GosrKd27T1cLJI45WFSSmCLwBt2t2D28A/exec";

let tripId = null;
let tripCurrency = "THB";

let members = [];
let selectedMembers = [];
let selectedType = "food";


async function init(){

  await showLoading();
  const params = new URLSearchParams(window.location.search);
  tripId = params.get("trip");

  if (!tripId){
    showModal("Trip not found");
    return;
  }

  bindEvents();
  renderTypes();
  await loadAllData();

  await hideLoading();
  
}
init();

function loadCurrencies(){

  const el = document.getElementById("currency");

  const list = tripCurrency === "THB"
    ? ["THB"]
    : [tripCurrency, "THB"];

  el.innerHTML = list.map(c => `
    <option value="${c}">${c}</option>
  `).join("");

}

function renderTypes(){

  const el = document.getElementById("typeList");

  el.innerHTML = expenseTypes.map(t => `
    <div class="member ${t.key === selectedType ? "selected" : ""}" data-key="${t.key}">
      ${t.icon}
      <div>${t.label}</div>
    </div>
  `).join("");

  document.querySelectorAll("#typeList .member").forEach(item => {
    item.addEventListener("click", () => {
      selectedType = item.dataset.key;
      document.querySelectorAll("#typeList .member")
        .forEach(i => i.classList.remove("selected"));
      item.classList.add("selected");
    });
  });

}

async function loadAllData(){

  const res = await fetch(API + `?action=getTripMembers&tripId=${tripId}`);
  members = await res.json();

  tripCurrency = members[0]?.tripCurrency || "THB";

  renderMembers();
  renderPayer();

  loadCurrencies();

}

function renderMembers(){

  const el = document.getElementById("memberList");

  el.innerHTML = members.map(m => `
    <div class="member" data-id="${m.memberId}">
      <div class="avatar">${m.avatar || m.name[0]}</div>
      <div>${m.name}</div>
    </div>
  `).join("");

  document.querySelectorAll("#memberList .member").forEach(el => {

    el.addEventListener("click", () => {

      const id = el.dataset.id;

      if (selectedMembers.includes(id)){
        selectedMembers = selectedMembers.filter(x => x !== id);
        el.classList.remove("selected");
      } else {
        selectedMembers.push(id);
        el.classList.add("selected");
      }

      updateSplitUI();

    });

  });

}

function renderPayer(){

  const el = document.getElementById("payer");

  el.innerHTML = `
    <option value="">Select payer</option>
    ${members.map(m => `
      <option value="${m.memberId}">${m.name}</option>
    `).join("")}
  `;

}

function bindEvents(){

  document.getElementById("backBtn")
    .addEventListener("click", () => {
      window.location.href = `trip.html?trip=${tripId}`;
    });

  document.getElementById("splitType")
    .addEventListener("change", updateSplitUI);

  document.getElementById("saveBtn")
    .addEventListener("click", saveExpense);

}

// ====================== split ========================== //
function updateSplitUI(){

  const type = document.getElementById("splitType").value;
  const box = document.getElementById("customBox");

  if (type === "custom"){
    box.classList.remove("hidden");
    renderCustomInputs();
  } else {
    box.classList.add("hidden");
  }

}

function renderCustomInputs(){

  const el = document.getElementById("customBox");

  if (selectedMembers.length === 0){
    el.innerHTML = `<div>Select members first</div>`;
    return;
  }

  const service = Number(document.getElementById("service").value || 0);
  const vat = Number(document.getElementById("vat").value || 0);

  const extraPerPerson = Math.round(((service + vat) / selectedMembers.length) * 100) / 100;

  el.innerHTML = selectedMembers.map(id => {

    const m = members.find(x => x.memberId === id);

    return `
      <div class="field">
        <label>${m.name}</label>
        <div class="input-group">
          <input type="number" data-id="${id}" placeholder="0" autocomplete="off" />
          <div class="extra">+${extraPerPerson}</div>
        </div>
      </div>
    `;

  }).join("");

}

function validateSplit(splitType, total){

  if (splitType === "equal"){
    return { ok: true };
  }

  const inputs = document.querySelectorAll("#customBox input");

  const service = Number(document.getElementById("service").value || 0);
  const vat = Number(document.getElementById("vat").value || 0);

  const extraPerPerson = (service + vat) / inputs.length;

  let sum = 0;

  inputs.forEach(input => {
    sum += Number(input.value || 0) + extraPerPerson;
  });

  if (sum !== total){
    return {
      ok: false,
      message: `Total mismatch (${sum} ≠ ${total})`
    };
  }

  return { ok: true };
}

async function saveExpense(){

  try {

    await showLoading(); 

    const remark = document.getElementById("remark").value;
    const payer = document.getElementById("payer").value;
    const amount = Number(document.getElementById("amount").value);
    const service = Number(document.getElementById("service").value || 0);
    const vat = Number(document.getElementById("vat").value || 0);
    const splitType = document.getElementById("splitType").value;

    const currency = document.getElementById("currency").value;

    let rate = 1;

    if (currency !== "THB") {
      const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
      const data = await res.json();
      rate = data.rates.THB;
    }

    // validate
    if (!payer) throw new Error("Select who paid");
    if (!amount) throw new Error("Enter amount");
    if (selectedMembers.length === 0) throw new Error("Select members");

    const total = amount + service + vat;

    const validation = validateSplit(splitType, total);
    if (!validation.ok) throw new Error(validation.message);

    let foodShares = {};

    if (splitType === "equal"){

      const share = amount / selectedMembers.length;

      selectedMembers.forEach(id => {
        foodShares[id] = share;
      });

    } else {

      document.querySelectorAll("#customBox input").forEach(input => {
        const id = input.dataset.id;
        const value = Number(input.value || 0);
        foodShares[id] = value;
      });

    }

    const res = await fetch(API, {
      method: "POST",
      body: JSON.stringify({
        action: "addExpense",
        data: {
          tripId,
          type: selectedType,
          remark,
          payer,
          amount,
          serviceCharge: service,
          tax: vat,
          currency,
          rate,
          splitMode: "smart",
          selectedMembers,
          foodShares
        }
      })
    });

    const result = await res.json();

    await hideLoading(); 

    if (!result.success){
      showModal(result.message || "Error");
      return;
    }

    showModal("Added!", () => {
      window.location.href = `trip.html?trip=${tripId}`;
    });

  } catch (err){

    hideLoading();
    showModal(err.message);

  }

}