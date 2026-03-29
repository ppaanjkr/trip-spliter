export function showLoading(){
  document.getElementById("loadingOverlay")?.classList.remove("hidden");
}

export function hideLoading(){
  document.getElementById("loadingOverlay")?.classList.add("hidden");
}

export function showModal(text, onConfirm){
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

export function showConfirmModal(text, onConfirm){

  const modal = document.getElementById("modal");
  const textEl = document.getElementById("modalText");
  const confirmBtn = document.getElementById("modalConfirm");
  const cancelBtn = document.getElementById("modalCancel");

  if (!modal) return;

  textEl.innerText = text;

  modal.classList.remove("hidden");

  // confirm
  confirmBtn.onclick = () => {
    modal.classList.add("hidden");
    if (onConfirm) onConfirm();
  };

  // cancel
  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
  };
}

export function formatMoney(num){
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(num || 0));
}