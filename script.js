// 🧠 2. Otak Aplikasi (Logika Analisis Otomatis)

// Kamus Kata Kunci
const heavyKeywords = [
  "proyek",
  "laporan",
  "presentasi",
  "desain",
  "konten",
  "klien",
  "riset",
  "analisis",
  "strategi",
  "buat",
  "kembangkan",
];
const lightKeywords = [
  "email",
  "bayar",
  "posting",
  "cek",
  "kirim",
  "balas",
  "telepon",
  "beli",
  "atur",
  "jadwalkan",
];

// Ambang Batas Urgensi (dalam hari)
const urgentThresholdDays = 3;

// Referensi DOM
const taskForm = document.getElementById("task-form");
const taskNameInput = document.getElementById("task-name");
const taskDeadlineInput = document.getElementById("task-deadline");
const errorMessage = document.getElementById("error-message");
const taskBoard = document.getElementById("task-board");

// --- FIX 1: Selektor mainTitle diperbaiki ---
// Menggunakan querySelector untuk mencocokkan class dari HTML
const mainTitle = document.querySelector("#view-semua-tugas .title");

// Referensi Filter
const filterButtons = document.querySelectorAll(".filter-btn");

// Referensi Modal (Versi Bootstrap)
const taskModalElement = document.getElementById("task-modal");
let taskModal; // Variabel untuk instance modal

// --- FIX 2: Selektor showModalButton diperbaiki ---
// Menggunakan querySelector untuk mencocokkan class .add-task dari HTML
const showModalButton = document.querySelector(".add-task");

// 💾 5. Penyimpanan Lokal (localStorage)
let tasks = JSON.parse(localStorage.getItem("smartTasks")) || [];

// State Aplikasi
let currentFilter = "all";
let countdownInterval;

/**
 * Menganalisis urgensi berdasarkan deadline.
 * @param {string} deadline - String tanggal (YYYY-MM-DD).
 * @returns {'mendesak' | 'terjadwal'}
 */
function getUrgency(deadline) {
  if (!deadline) return "terjadwal";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  const dlUtc = new Date(dl.getTime() + dl.getTimezoneOffset() * 60000);
  dlUtc.setHours(0, 0, 0, 0);
  const diffTime = dlUtc - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= urgentThresholdDays ? "mendesak" : "terjadwal";
}

/**
 * Menganalisis beban kerja berdasarkan nama tugas.
 * @param {string} taskName - Nama tugas.
 * @returns {'berat' | 'ringan'}
 */
function getWorkload(taskName) {
  const lowerName = taskName.toLowerCase();
  if (heavyKeywords.some((keyword) => lowerName.includes(keyword)))
    return "berat";
  if (lightKeywords.some((keyword) => lowerName.includes(keyword)))
    return "ringan";
  return "ringan";
}

/**
 * Mendapatkan ID kuadran yang benar berdasarkan urgensi dan beban.
 * @param {string} urgency - 'mendesak' atau 'terjadwal'.
 * @param {string} workload - 'berat' atau 'ringan'.
 * @returns {string} - Kunci kuadran ('api', 'cepat', 'jadwal', 'santai').
 */
function getQuadrantKey(urgency, workload) {
  if (urgency === "mendesak" && workload === "berat") return "api";
  if (urgency === "mendesak" && workload === "ringan") return "cepat";
  if (urgency === "terjadwal" && workload === "berat") return "jadwal";
  if (urgency === "terjadwal" && workload === "ringan") return "santai";
  return "santai"; // Fallback
}

/**
 * Mendapatkan prioritas numerik untuk sorting.
 * @param {string} quadrantKey - Kunci kuadrad.
 * @returns {number} - 1 (Penting) s/d 4 (Santai).
 */
function getTaskPriority(quadrantKey) {
  switch (quadrantKey) {
    case "api":
      return 1;
    case "cepat":
      return 2;
    case "jadwal":
      return 3;
    case "santai":
      return 4;
    default:
      return 5;
  }
}

/**
 * Menyimpan semua tugas ke localStorage.
 */
function saveTasks() {
  localStorage.setItem("smartTasks", JSON.stringify(tasks));
}

/**
 * --- FIX 3: Fungsi renderTask ditulis ulang ---
 * Merender satu kartu tugas ke DOM.
 * Menggunakan struktur HTML dari template komentar Anda (misal, <div class="card red">).
 * @param {object} task - Objek tugas.
 */
function renderTask(task) {
  // Tentukan warna dan nama kategori
  let cardColorClass = "";
  let categoryName = "";

  switch (task.quadrantKey) {
    case "api":
      cardColorClass = "red";
      categoryName = "🔥 Penting";
      break;
    case "cepat":
      cardColorClass = "amber";
      categoryName = "✅ Cicil Cepat";
      break;
    case "jadwal":
      cardColorClass = "blue";
      categoryName = "🗓️ Jadwalkan";
      break;
    case "santai":
      cardColorClass = "gray";
      categoryName = "☕ Santai";
      break;
    default:
      cardColorClass = "gray";
      categoryName = "Lainnya";
  }

  const taskCard = document.createElement("div");
  taskCard.className = `card ${cardColorClass}`; // Sesuai template: <div class="card red">
  taskCard.dataset.id = task.id;
  taskCard.dataset.deadline = task.deadline;

  // Format tanggal (misal: 15 Nov 2025)
  const deadlineDate = new Date(task.deadline + "T00:00:00");
  const formattedDeadline = deadlineDate.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Atur innerHTML agar sesuai dengan struktur template Anda
  taskCard.innerHTML = `
        <span class="category ${cardColorClass}">${categoryName}</span>
        <h3 class="title-card">${task.name}</h3>
        <p class="deadline">Deadline: ${formattedDeadline}</p>
        <div class="countdown" data-countdown-id="${task.id}">
            <span class="countdown-time">Menghitung...</span>
        </div>
        <button class="btn-done-task">Tandai Selesai</button>
    `;
  taskBoard.appendChild(taskCard);
}

/**
 * Merender semua tugas berdasarkan filter dan sort.
 */
function renderAllTasks() {
  // Kosongkan papan
  taskBoard.innerHTML = "";

  let tasksToRender = [];

  // 1. Filter
  if (currentFilter === "all") {
    tasksToRender = [...tasks];
  } else {
    tasksToRender = tasks.filter((task) => task.quadrantKey === currentFilter);
  }

  // 2. Sort (Hanya jika 'Semua Tugas')
  if (currentFilter === "all") {
    tasksToRender.sort(
      (a, b) => getTaskPriority(a.quadrantKey) - getTaskPriority(b.quadrantKey)
    );
  }

  // 3. Render
  tasksToRender.forEach(renderTask);

  // (Re)start interval countdown
  startCountdownTimers();
}

/**
 * Menghandle submit form tambah tugas.
 * @param {Event} e - Event submit.
 */
function handleAddTask(e) {
  e.preventDefault();

  const name = taskNameInput.value.trim();
  const deadline = taskDeadlineInput.value;

  if (!name || !deadline) {
    errorMessage.style.display = "block";
    return;
  }
  errorMessage.style.display = "none";

  // 🧠 Otak Aplikasi bekerja di sini
  const urgency = getUrgency(deadline);
  const workload = getWorkload(name);
  const quadrantKey = getQuadrantKey(urgency, workload);

  const newTask = {
    id: "task-" + Date.now(),
    name: name,
    deadline: deadline,
    urgency: urgency,
    workload: workload,
    quadrantKey: quadrantKey, // Simpan kunci kuadran
  };

  tasks.push(newTask);
  saveTasks();
  renderAllTasks(); // Render ulang semua untuk sorting dan filtering

  taskForm.reset();
  taskModal.hide(); // Sembunyikan modal Bootstrap
}

/**
 * --- FIX 4: Selektor tombol delete diperbaiki ---
 * Menghandle klik pada tombol 'Selesai' (DENGAN KONFIRMASI)
 * @param {Event} e - Event klik.
 */
function handleDeleteTask(e) {
  // Diubah ke .btn-done-task agar sesuai renderTask baru
  if (e.target.classList.contains("btn-done-task")) {
    const taskCard = e.target.closest(".task-card"); // .task-card tidak ada, harusnya .card
    const realTaskCard = e.target.closest(".card"); // Perbaikan: cari .card
    if (!realTaskCard) return;

    // --- TAMBAHAN KONFIRMASI ---
    const taskName = realTaskCard.querySelector(".title-card").textContent;
    if (!confirm(`Yakin ingin menyelesaikan tugas:\n"${taskName}"?`)) {
      return; // Batalkan jika pengguna klik 'Cancel'
    }
    // --- SELESAI ---

    const taskId = realTaskCard.dataset.id;
    tasks = tasks.filter((task) => task.id !== taskId);

    realTaskCard.style.transition = "opacity 0.3s, transform 0.3s";
    realTaskCard.style.opacity = "0";
    realTaskCard.style.transform = "scale(0.9)";

    setTimeout(() => {
      realTaskCard.remove();
      saveTasks();
    }, 300);
  }
}

// --- ⭐ 4. Fitur Countdown Timer Dinamis ---

/**
 * --- FIX 5: Countdown string diperbaiki ---
 * Menghapus kelas Tailwind dan menggunakan inline style untuk warna.
 */
function getCountdownString(deadline) {
  const dl = new Date(deadline + "T23:59:59");
  const now = new Date();
  const totalSeconds = (dl - now) / 1000;

  if (totalSeconds <= 0) {
    return '<span class="countdown-time" style="color: red; font-weight: bold;">DEADLINE LEWAT!</span>';
  }

  const days = Math.floor(totalSeconds / 3600 / 24);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = Math.floor(totalSeconds) % 60;

  // Ganti warna menggunakan inline style
  let color = "green"; // Default
  if (days < 1) color = "red";
  else if (days <= urgentThresholdDays) color = "orange"; // 'orange' lebih umum daripada 'yellow-700'

  return `<span class="countdown-time" style="color: ${color};">
        ${days} H, ${hours} J, ${minutes} M, ${seconds} D
    </span>`;
}

function updateAllCountdowns() {
  const countdownElements = document.querySelectorAll(".countdown");
  if (countdownElements.length === 0 && countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  countdownElements.forEach((el) => {
    const card = el.closest(".card"); // Diubah dari .task-card ke .card
    if (card && card.dataset.deadline) {
      el.innerHTML = getCountdownString(card.dataset.deadline);
    }
  });
}

function startCountdownTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  updateAllCountdowns();
  countdownInterval = setInterval(updateAllCountdowns, 1000);
}

// --- Handler untuk Modal (Versi Bootstrap) ---
function showModal() {
  errorMessage.style.display = "none";
  taskForm.reset();
  taskModal.show();
}

function resetModal() {
  // Fungsi ini dipanggil saat modal ditutup
  errorMessage.style.display = "none";
  taskForm.reset();
}

// --- Handler untuk Filter ---
function handleFilterClick(e) {
  const clickedButton = e.target.closest(".filter-btn");
  if (!clickedButton) return;

  // Update state
  currentFilter = clickedButton.dataset.filter;

  // Update UI Tombol
  document.querySelectorAll("#filter-container .filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  clickedButton.classList.add("active");

  // Update Judul (Sekarang akan berhasil karena mainTitle sudah benar)
  if (mainTitle) {
    mainTitle.textContent = clickedButton.textContent.trim();
  }

  // Render ulang
  renderAllTasks();
}

// --- Inisialisasi Aplikasi ---

document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Modal Bootstrap
  taskModal = new bootstrap.Modal(taskModalElement);

  // Set input tanggal minimal hari ini
  taskDeadlineInput.min = new Date().toISOString().split("T")[0];

  // Render tugas awal
  renderAllTasks();

  // --- Tambahkan semua Event Listener ---

  // Listener Form
  taskForm.addEventListener("submit", handleAddTask);

  // Listener Tombol Hapus (Delegation)
  taskBoard.addEventListener("click", handleDeleteTask);

  // Listener Modal (Sekarang akan berhasil karena showModalButton sudah benar)
  if (showModalButton) {
    showModalButton.addEventListener("click", showModal);
  } else {
    console.error("Tombol .add-task tidak ditemukan!");
  }

  // Listener saat modal ditutup (untuk reset form)
  taskModalElement.addEventListener("hidden.bs.modal", (event) => {
    resetModal(); // Panggil fungsi reset kita
  });

  // Listener Filter
  document
    .getElementById("filter-container")
    .addEventListener("click", handleFilterClick);
});
