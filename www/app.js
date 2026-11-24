const STORAGE_KEY = "carnet_entretien_kia_ceed_v1";

let entries = [];
let searchQuery = "";

const form = document.getElementById("maintenance-form");
const nameInput = document.getElementById("service-name");
const dateInput = document.getElementById("service-date");
const kmInput = document.getElementById("service-km");
const notesInput = document.getElementById("service-notes");
const tbody = document.getElementById("maintenance-tbody");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const btnClearAll = document.getElementById("btn-clear-all");
const btnExportPdf = document.getElementById("btn-export-pdf");
const btnExportJson = document.getElementById("btn-export-json");

const statKm = document.getElementById("stat-km");
const statCount = document.getElementById("stat-count");
const statLastDate = document.getElementById("stat-last-date");
const toastEl = document.getElementById("toast");

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2400);
}

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      entries = [];
      return;
    }
    const parsed = JSON.parse(raw);
    entries = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur lecture localStorage :", err);
    entries = [];
  }
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Erreur sauvegarde localStorage :", err);
    showToast("⚠️ Erreur de sauvegarde locale");
  }
}

function formatDateFr(isoDate) {
  if (!isoDate) return "—";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatKm(km) {
  const num = Number(km);
  if (Number.isNaN(num)) return "0 km";
  return `${num.toLocaleString("fr-FR")} km`;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSortedEntries() {
  return [...entries].sort((a, b) => {
    const kmDiff = Number(b.km) - Number(a.km);
    if (kmDiff !== 0) return kmDiff;
    return String(b.date).localeCompare(String(a.date));
  });
}

function updateStats() {
  const sorted = getSortedEntries();
  statCount.textContent = String(entries.length);

  if (sorted.length === 0) {
    statKm.textContent = "— km";
    statLastDate.textContent = "—";
    return;
  }

  const maxKm = Math.max(...entries.map((e) => Number(e.km) || 0));
  statKm.textContent = formatKm(maxKm);

  const byDate = [...entries].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  statLastDate.textContent = formatDateFr(byDate[0].date);
}

function renderTable() {
  updateStats();

  const q = searchQuery.trim().toLowerCase();
  const filtered = getSortedEntries().filter((item) => {
    if (!q) return true;
    const hay = `${item.name} ${item.notes || ""} ${item.km} ${formatDateFr(item.date)}`.toLowerCase();
    return hay.includes(q);
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.add("visible");
    if (entries.length > 0 && q) {
      emptyState.querySelector("p").textContent = "Aucun entretien ne correspond à la recherche.";
      emptyState.querySelector("span").textContent = "Modifiez ou effacez le filtre de recherche.";
    } else {
      emptyState.querySelector("p").textContent = "Aucun entretien enregistré pour le moment.";
      emptyState.querySelector("span").textContent = "Ajoutez une intervention à gauche pour démarrer le suivi.";
    }
    return;
  }

  emptyState.classList.remove("visible");

  for (const item of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(formatDateFr(item.date))}</td>
      <td><span class="km-badge">${escapeHtml(formatKm(item.km))}</span></td>
      <td><div class="service-title">${escapeHtml(item.name)}</div></td>
      <td><div class="notes-text">${item.notes ? escapeHtml(item.notes) : "—"}</div></td>
      <td style="text-align: center;">
        <button type="button" class="btn-delete" data-id="${escapeHtml(item.id)}" title="Supprimer">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const date = dateInput.value;
  const km = parseInt(kmInput.value, 10);
  const notes = notesInput.value.trim();

  if (!name || !date || Number.isNaN(km) || km < 0) {
    showToast("⚠️ Vérifiez les champs obligatoires");
    return;
  }

  const newEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    date,
    km,
    notes
  };

  entries.push(newEntry);
  saveEntries();
  renderTable();

  nameInput.value = "";
  notesInput.value = "";
  setDefaultDate();
  nameInput.focus();

  showToast("✅ Entretien ajouté");
});

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-delete");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  renderTable();
  showToast("🗑️ Entretien supprimé");
});

btnClearAll.addEventListener("click", () => {
  if (entries.length === 0) {
    showToast("ℹ️ L'historique est déjà vide");
    return;
  }
  const ok = confirm("Voulez-vous vraiment supprimer tout l'historique des entretiens ?");
  if (!ok) return;
  entries = [];
  saveEntries();
  renderTable();
  showToast("🗑️ Historique vidé");
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderTable();
});

document.querySelectorAll(".tag-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-val");
    if (val) {
      nameInput.value = val;
      nameInput.focus();
    }
  });
});

btnExportJson.addEventListener("click", () => {
  const payload = {
    vehicule: "Kia Cee'd CRDi Break",
    exportDate: new Date().toISOString(),
    totalEntries: entries.length,
    entries: getSortedEntries()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-entretien-kia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("💾 Sauvegarde JSON exportée");
});

btnExportPdf.addEventListener("click", () => {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("⚠️ Module PDF indisponible (vérifiez la connexion)");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CARNET D'ENTRETIEN — KIA CEE'D CRDI BREAK", 14, 13);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  const exportDateStr = new Date().toLocaleDateString("fr-FR");
  const maxKm = entries.length ? Math.max(...entries.map((e) => Number(e.km) || 0)) : 0;
  doc.text(
    `Édité le ${exportDateStr}  |  Total interventions : ${entries.length}  |  Kilométrage max : ${formatKm(maxKm)}`,
    14,
    21
  );

  const sorted = getSortedEntries();
  const rows = sorted.map((item) => [
    formatDateFr(item.date),
    formatKm(item.km),
    item.name,
    item.notes || "—"
  ]);

  if (typeof doc.autoTable === "function") {
    doc.autoTable({
      startY: 34,
      head: [["Date", "Kilométrage", "Entretien effectué", "Détails / Notes"]],
      body: rows.length ? rows : [["—", "—", "Aucun entretien enregistré", "—"]],
      theme: "grid",
      headStyles: {
        fillColor: [14, 165, 233],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9.5,
        textColor: [30, 41, 59],
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249]
      },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 38 },
        2: { cellWidth: 105 },
        3: { cellWidth: 94 }
      }
    });
  } else {
    let y = 40;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    rows.forEach((r) => {
      doc.text(`${r[0]}  |  ${r[1]}  |  ${r[2]}  |  ${r[3]}`, 14, y);
      y += 8;
    });
  }

  doc.save(`carnet-entretien-kia-${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast("📄 PDF généré et téléchargé");
});

setDefaultDate();
loadEntries();
renderTable();
        
