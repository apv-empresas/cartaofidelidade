const config = { darBonusDownload: true };

// Cole aqui a URL publicada do seu Google Apps Script.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztImO0YVuC3onx64rCLPKUdvbbJVSCYxe2KK-P3GN5iDyA8Jw3wVcCWG23DpcaBNzD-w/exec";
const TOTAL_VISITS = 10;
const REWARD_TEXT = "uma rodada de dadinhos de tapioca, cortesia da casa!";
const PROGRESS_STORAGE_KEY = "mocoto_progresso";

let visits = 0;
let weekAnchor = new Date();

const stampsGrid = document.querySelector("#stamps-grid");
const progressTitle = document.querySelector("#progress-title");
const progressRemaining = document.querySelector("#progress-remaining");
const progressFill = document.querySelector("#progress-fill");
const weekLabel = document.querySelector("#week-label");
const visitForm = document.querySelector("#visit-form");
const visitCode = document.querySelector("#visit-code");
const validationMessage = document.querySelector("#validation-message");
const statusLive = document.querySelector("#status-live");
const modalOverlay = document.querySelector("#modal-overlay");
const closeModalButton = document.querySelector("#close-modal");
const confettiContainer = document.querySelector("#confetti-container");

function loadProgress() {
  const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);

  if (savedProgress !== null) {
    const parsedProgress = Number.parseInt(savedProgress, 10);
    visits = Number.isNaN(parsedProgress)
      ? 0
      : Math.min(Math.max(parsedProgress, 0), TOTAL_VISITS);
    return;
  }

  if (config.darBonusDownload) {
    visits = 1;
    localStorage.setItem(PROGRESS_STORAGE_KEY, String(visits));
  }
}

function getWeekRange(date) {
  const currentDate = new Date(date);
  const dayOfWeek = (currentDate.getDay() + 6) % 7;
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function formatShort(date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

function renderWeekLabel() {
  const { monday, sunday } = getWeekRange(weekAnchor);
  weekLabel.textContent = `Semana de ${formatShort(monday)} a ${formatShort(sunday)}`;
}

function renderStamps() {
  stampsGrid.replaceChildren();
  for (let index = 1; index <= TOTAL_VISITS; index += 1) {
    const stamp = document.createElement("div");
    stamp.className = `stamp${index <= visits ? " filled" : ""}`;
    stamp.textContent = index;
    stamp.setAttribute("aria-label", index <= visits ? `Visita ${index} validada` : `Visita ${index} pendente`);
    stampsGrid.append(stamp);
  }
}

function renderProgress() {
  const percentage = Math.round((visits / TOTAL_VISITS) * 100);
  progressFill.style.width = `${percentage}%`;
  progressTitle.textContent = `${visits} de ${TOTAL_VISITS} visitas`;
  progressRemaining.textContent = visits === TOTAL_VISITS ? "completo!" : `faltam ${TOTAL_VISITS - visits}`;
}

function renderAll() {
  renderWeekLabel();
  renderStamps();
  renderProgress();
}

function showValidationMessage(message, isSuccess = false) {
  validationMessage.textContent = message;
  validationMessage.classList.toggle("success", isSuccess);
}

function spawnConfetti() {
  const colors = ["#f3ce87", "#fff7e8", "#5c7a4b", "#9c3d22"];
  confettiContainer.replaceChildren();
  for (let index = 0; index < 24; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiContainer.append(piece);
  }
}

function openRewardModal() {
  modalOverlay.hidden = false;
  spawnConfetti();
  closeModalButton.focus();
}

function resetCycle() {
  visits = config.darBonusDownload ? 1 : 0;
  if (config.darBonusDownload) {
    localStorage.setItem(PROGRESS_STORAGE_KEY, String(visits));
  } else {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  }
  weekAnchor = new Date(weekAnchor);
  weekAnchor.setDate(weekAnchor.getDate() + 7);
  renderAll();
  showValidationMessage("");
  statusLive.textContent = "Novo ciclo iniciado. Contagem de visitas reiniciada.";
  visitCode.focus();
}

function closeRewardModal() {
  modalOverlay.hidden = true;
  confettiContainer.replaceChildren();
  resetCycle();
}

visitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submittedCode = visitCode.value.trim().toUpperCase();

  if (visits >= TOTAL_VISITS || !submittedCode) return;

  if (GOOGLE_SCRIPT_URL === "SUA_URL_AQUI") {
    alert("Configure a URL do Google Apps Script no arquivo app.js.");
    return;
  }

  const submitButton = visitForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  submitButton.textContent = "Carregando...";
  showValidationMessage("");

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        action: "marcarUsado",
        codigo: submittedCode,
        origem: "cliente"
      })
    });
    const responseText = await response.text();
    console.log("[Apps Script] Resposta:", response.status, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Apps Script] Resposta nao-JSON:", responseText, parseError);
      throw new Error("O servidor retornou uma resposta invalida.");
    }

    if (!response.ok || !(result.success ?? result.sucesso)) {
      throw new Error(result.message || result.mensagem || "Codigo invalido ou ja utilizado.");
    }

    visits += 1;
  localStorage.setItem(PROGRESS_STORAGE_KEY, String(visits));
    visitCode.value = "";
    showValidationMessage("Visita validada com sucesso.", true);
    statusLive.textContent = `Visita registrada. ${visits} de ${TOTAL_VISITS} visitas.`;
    renderAll();

    if (visits === TOTAL_VISITS) openRewardModal();
  } catch (error) {
    alert(error.message || "Não foi possível validar a visita. Tente novamente.");
    statusLive.textContent = "Falha ao validar a visita.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Validar visita";
  }
});

closeModalButton.addEventListener("click", closeRewardModal);
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeRewardModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalOverlay.hidden) closeRewardModal();
});

loadProgress();
renderAll();
