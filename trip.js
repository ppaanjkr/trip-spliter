import { showLoading, hideLoading, showModal, showConfirmModal, formatMoney  } from "./utils.js";

const API = "https://script.google.com/macros/s/AKfycbzjT3fMlGroGODFfqWDLJYlKVto-qY4nuEFS1xtx6RPG_ykKl5yck3N7kvErIPQhx4eIQ/exec";

let tripId = null;
let expenses = []; 
let members = []; 
let flagShow = false;

async function init(){

  await showLoading();
  const params = new URLSearchParams(window.location.search);
  tripId = params.get("trip");

  if (!tripId){
    showModal("Trip not found");
    hideLoading();
    return;
  }

  bindEvents();
  await loadAllData();
  await hideLoading();

}
init();

function bindEvents(){

  // back
  document.getElementById("backBtn")
    .addEventListener("click", () => {
      window.location.href = "index.html";
    });

  // add expense
  document.getElementById("addBtn")
    .addEventListener("click", () => {
      window.location.href = `add-expense.html?trip=${tripId}`;
    });

  // close trip
  document.getElementById("closeTripBtn")
    .addEventListener("click", closeTrip);

  // tabs
  document.querySelectorAll(".tab").forEach(tab => {

    tab.addEventListener("click", () => {

      // active tab
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.tab;

      switchTab(type);

    });

  });

}

async function loadAllData(){

  // default tab
  switchTab("expenses");

  try {

    await showLoading();

    // info
    const tripRes = await fetch(API + `?action=getTrips`);
    const trips = await tripRes.json();
    const trip = trips.find(t => t.tripId === tripId);

    if (trip){
      document.getElementById("tripTitle").innerText = trip.tripName;
      if(trip.status === "active"){
        flagShow = true;
      }
      
    }

    // expenses
    const res = await fetch(API + `?action=getExpenses&tripId=${tripId}`);
    expenses = await res.json();

    const totalTHB = expenses.reduce((sum, e) => sum + Number(e.amountTHB || 0), 0);

    document.getElementById("tripTotal").innerText =
      `${formatMoney(totalTHB)} THB`;

    await loadMembers(trip.tripId);
    await applyTripStatus();
    await renderExpenses();
    renderSettle();
    renderSummary();

    await hideLoading();

  } catch (err){
    await hideLoading();
    console.error(err);
    showModal("Failed to load data");
  }

}
function applyTripStatus(){

  if (flagShow === true){

    document.getElementById("addBtn").style.display = "block";
    document.getElementById("closeTripBtn").style.display = "block";

  }else{

    document.getElementById("addBtn").style.display = "none";
    document.getElementById("closeTripBtn").style.display = "none";

  }

}

function switchTab(type){

  // hide all
  document.getElementById("expensesTab").style.display = "none";
  document.getElementById("settleTab").style.display = "none";
  document.getElementById("summaryTab").style.display = "none";

  // show target
  document.getElementById(type + "Tab").style.display = "block";

  // toggle button
  const addBtn = document.getElementById("addBtn");
  addBtn.style.display = (type === "expenses" && flagShow) ? "block" : "none";

}

function renderExpenses(){

  const el = document.getElementById("expensesTab");

  if (!expenses.length){
    el.innerHTML = `<div class="empty">No expenses</div>`;
    return;
  }

  // sorting
  const sorted = [...expenses].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  el.innerHTML = sorted.map(e => {

    const isTHB = e.currency === "THB";

    return `
      <div class="card expense-card">

        <div class="expense-row">
          <div>
            <div class="expense-title">
              ${e.type || ""} ${e.remark ? `• ${e.remark}` : ""}
            </div>

            <div class="trip-sub">
              ${e.payer.name} paid
              ${isTHB
                ? `${formatMoney(e.amount)} THB`
                : `${formatMoney(e.amount)} ${e.currency} (${formatMoney(e.amountTHB)} THB)`
              }
            </div>
          </div>

          <button class="delete-btn" data-id="${e.expenseId}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71767A" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>

        </div>

      </div>
    `;

  }).join("");

  // bind delete
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteExpense(btn.dataset.id);
    });
  });

}

function renderSettle(){

  const el = document.getElementById("settleTab");

  const txs = calculatePairwiseDebts();

  txs.sort((a, b) => {

    const fromA = getMemberName(a.from);
    const fromB = getMemberName(b.from);

    if (fromA !== fromB){
      return fromA.localeCompare(fromB);
    }

    // sorting
    const toA = getMemberName(a.to);
    const toB = getMemberName(b.to);

    return toA.localeCompare(toB);

  });

  if (!txs.length){

    el.innerHTML = `<div class="empty"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-dollar-sign-icon lucide-circle-dollar-sign"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg></div>`;
    return;

  }else{

    el.innerHTML = txs.map(t => {

      const from = getMemberName(t.from);
      const to = getMemberName(t.to);

      return `
        <div class="card">
          <div class="expense-row">
              <strong>${from} &nbsp;&nbsp;<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-arrow-right-icon lucide-circle-arrow-right"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4"/><path d="M8 12h8"/></svg> &nbsp;&nbsp;${to}</strong>
              <div class="trip-sub">
                ${formatMoney(t.amount)} THB
              </div>
          </div>
        </div>
      `;

    }).join("");

  }

}

function renderSummary(){

  if (!expenses.length){
    document.getElementById("summaryTab").innerHTML =
      `<div class="empty">No data</div>`;
    return;
  }

  //  total
  const totalTHB = expenses.reduce(
    (sum, e) => sum + Number(e.amountTHB || 0),
    0
  );

  document.getElementById("summaryTotal").innerText =
    `${formatMoney(totalTHB)} THB`;

  document.getElementById("summaryCount").innerText =
    `${expenses.length} expenses`;

  // group
  const categoryMap = {};

  expenses.forEach(e => {

    const key = e.type || "other";

    if (!categoryMap[key]){
      categoryMap[key] = {
        totalTHB: 0,
        count: 0
      };
    }

    categoryMap[key].totalTHB += Number(e.amountTHB || 0);
    categoryMap[key].count += 1;

  });

  const el = document.getElementById("summaryCategory");

  el.innerHTML = Object.entries(categoryMap).map(([type, val]) => {

    const percent = (val.totalTHB / totalTHB) * 100;

    return `
      <div class="card category-card">

        <div class="category-row">
          <div>${type}</div>
          <div>${formatMoney(val.totalTHB)} THB</div>
        </div>

        <div class="progress">
          <div class="progress-bar" style="width:${percent}%"></div>
        </div>

        <div class="summary-sub">
          ${val.count} expense • ${percent.toFixed(0)}%
        </div>

      </div>
    `;

  }).join("");

}

function closeTrip(){

  showConfirmModal(
    "End trip?",
    async () => {

      try {

        await showLoading();

        const res = await fetch(API, {
          method: "POST",
          body: JSON.stringify({
            action: "closeTrip",
            data: { tripId }
          })
        });

        const data = await res.json();

        await hideLoading();

        if (!data.success){
          showModal(data.message || "Error");
          return;
        }else{
          showConfirmModal("Trip closed!", () => {
            window.location.href = "index.html";
          });
        }

      } catch (err){
        hideLoading();
        showModal("Something went wrong");
      }

    }
  );

}

async function deleteExpense(expenseId){

  showConfirmModal(
    "Delete?",
    async () => {

      try {

        await showLoading();

        const res = await fetch(API, {
          method: "POST",
          body: JSON.stringify({
            action: "deleteExpense",
            data: { expenseId }
          })
        });

        const data = await res.json();

        if (!data.success){
          showModal(data.message || "Error");
          return;
        }

        // remove cache
        expenses = expenses.filter(e => e.expenseId !== expenseId);

        await renderExpenses();
        await hideLoading();

      } catch (err){

        hideLoading();
        showModal("Something went wrong");

      }

    }
  );

}

async function loadMembers(tripId){
  const res = await fetch(API + `?action=getTripMembers&tripId=${tripId}`);
  members = await res.json();
  document.getElementById("tripMembers").innerHTML =
    members.map(m => m.avatar).join(" ");
}

// ===================== settle ====================== //
// คำนวณหนี้ ไม่เข้าใจสูตร แต่เหมือนจะถูก
function calculatePairwiseDebts(){

  const debts = {};

  // -----------------------
  // 1. เก็บหนี้รายคู่
  // -----------------------
  expenses.forEach(e => {

    const payer = e.payer.memberId;

    (e.splits || []).forEach(s => {

      if (s.memberId === payer) return;

      const key = `${s.memberId}|${payer}`;

      if (!debts[key]) debts[key] = 0;

      debts[key] += Number(s.amount || 0); // THB

    });

  });

  // -----------------------
  // 2. net รายคู่
  // -----------------------
  const result = [];

  for (let key in debts){

    const [from, to] = key.split("|");
    const reverseKey = `${to}|${from}`;

    const forward = debts[key] || 0;
    const backward = debts[reverseKey] || 0;

    const net = Math.round((forward - backward) * 100) / 100;

    if (net > 0){
      result.push({
        from,
        to,
        amount: net
      });
    }

  }

  return result;

}

function getMemberName(id){
  const m = members.find(x => x.memberId === id);
  return m ? m.name : id;
}