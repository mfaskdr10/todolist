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
const mainTitle = document.querySelector("#view-semua-tugas .title");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("search");

// --- Referensi untuk Fitur Baru ---
const viewToggleContainer = document.getElementById("view-toggle");
const viewDonePage = document.getElementById("view-done-page");
const mainTaskView = document.getElementById("view-semua-tugas"); // Header

// --- Referensi Statistik (Fitur 2) ---
const statToday = document.getElementById("stat-today");
const statWeek = document.getElementById("stat-week");
const completedTaskList = document.getElementById("completed-task-list");
const chartCanvas = document.getElementById("productivity-chart");
let productivityChart; // Variabel untuk instance Chart

// Referensi Modal (Versi Bootstrap)
const taskModalElement = document.getElementById("task-modal");
// --- BARU: Referensi Judul Modal ---
const modalTitle = document.getElementById("taskModalLabel");
let taskModal;
const showModalButton = document.querySelector(".add-task");

// Modal Konfirmasi
const confirmDoneModalElement = document.getElementById("confirm-done-modal");
const btnConfirmDone = document.getElementById("btn-confirm-done");
const confirmTaskName = document.getElementById("confirm-task-name");
let taskToCompleteId = null;
let confirmDoneModal;

// 💾 5. Penyimpanan Lokal (localStorage)
let tasks = JSON.parse(localStorage.getItem("smartTasks")) || [];
let completedTasks =
  JSON.parse(localStorage.getItem("smartCompletedTasks")) || [];

// State Aplikasi
let currentFilter = localStorage.getItem("smartTasksFilter") || "all";
// --- BARU: Variabel State untuk Edit ---
let currentEditId = null;
let countdownInterval;

/**
 * Menganalisis urgensi berdasarkan deadline.
 * (Fungsi ini tidak berubah)
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
 * (Fungsi ini tidak berubah)
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
 * (Fungsi ini tidak berubah)
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
 * (Fungsi ini tidak berubah)
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
 * Fungsi simpan tugas selesai
 */
function saveCompletedTasks() {
  localStorage.setItem("smartCompletedTasks", JSON.stringify(completedTasks));
}

/**
 * --- MODIFIKASI: Render Task ---
 * Menambahkan div wrapper .card-buttons dan tombol .btn-edit-task
 */
function renderTask(task) {
  let cardColorClass = "";
  let categoryName = "";
  switch (task.quadrantKey) {
    case "api":
      cardColorClass = "red";
      categoryName = "Penting";
      break;
    case "cepat":
      cardColorClass = "amber";
      categoryName = "Cicil Cepat";
      break;
    case "jadwal":
      cardColorClass = "blue";
      categoryName = "Jadwalkan";
      break;
    case "santai":
      cardColorClass = "gray";
      categoryName = "Santai";
      break;
    default:
      cardColorClass = "gray";
      categoryName = "Lainnya";
  }
  const taskCard = document.createElement("div");
  taskCard.className = `card ${cardColorClass}`;
  taskCard.dataset.id = task.id;
  taskCard.dataset.deadline = task.deadline;
  taskCard.dataset.name = task.name; // Simpan nama untuk modal

  const deadlineDate = new Date(task.deadline + "T00:00:00");
  const formattedDeadline = deadlineDate.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  taskCard.innerHTML = `
        <span class="category ${cardColorClass}">${categoryName}</span>
        <h3 class="title-card">${task.name}</h3>
        <p class="deadline">Deadline: ${formattedDeadline}</p>
        <div class="countdown" data-countdown-id="${task.id}">
            <span class="countdown-time">Menghitung...</span>
        </div>
        <div class="card-buttons">
            <button class="btn-edit-task">
                <i class="fa-solid fa-pencil"></i> Edit
            </button>
            <button class="btn-done-task">Done</button>
        </div>
    `;
  taskBoard.appendChild(taskCard);
}

/**
 * --- MODIFIKASI: Fungsi renderAllTasks ---
 * (Logika tidak berubah, tapi panggilannya ke renderTask sekarang menghasilkan tombol edit)
 */
function renderAllTasks() {
  updateTaskCountBadges();

  if (currentFilter === "done") {
    viewDonePage.style.display = "block";
    taskBoard.style.display = "none";
    mainTaskView.style.display = "none";
    renderDonePage();
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    return;
  }

  viewDonePage.style.display = "none";
  mainTaskView.style.display = "block";
  if (taskBoard.classList.contains("list-view")) {
    taskBoard.style.display = "flex";
  } else {
    taskBoard.style.display = "grid";
  }

  taskBoard.innerHTML = "";
  const searchTerm = searchInput.value.toLowerCase();
  let tasksToRender = [];

  if (currentFilter === "all") {
    tasksToRender = [...tasks];
  } else {
    tasksToRender = tasks.filter((task) => task.quadrantKey === currentFilter);
  }

  if (searchTerm) {
    tasksToRender = tasksToRender.filter((task) =>
      task.name.toLowerCase().includes(searchTerm)
    );
  }

  if (currentFilter === "all") {
    tasksToRender.sort(
      (a, b) => getTaskPriority(a.quadrantKey) - getTaskPriority(b.quadrantKey)
    );
  }

  tasksToRender.forEach(renderTask);
  startCountdownTimers();
}

/**
 * --- FUNGSI renderDonePage ---
 * (Tidak berubah)
 */
function renderDonePage() {
  const stats = calculateStats();
  statToday.textContent = stats.countToday;
  statWeek.textContent = stats.countWeek;
  renderStatsChart(stats.chartLabels, stats.chartData);
  completedTaskList.innerHTML = "";
  if (completedTasks.length === 0) {
    completedTaskList.innerHTML =
      '<p class="history-item">Belum ada tugas yang selesai.</p>';
    return;
  }
  const sortedCompleted = [...completedTasks].sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
  );
  sortedCompleted.forEach((task) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const completedDate = new Date(task.completedAt).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    let categoryName = task.quadrantKey;
    switch (task.quadrantKey) {
      case "api":
        categoryName = "Penting";
        break;
      case "cepat":
        categoryName = "Cicil Cepat";
        break;
      case "jadwal":
        categoryName = "Jadwalkan";
        break;
      case "santai":
        categoryName = "Santai";
        break;
    }
    item.innerHTML = `
      <div class="history-item-header">
        <h5>${task.name}</h5>
        <small>${completedDate}</small>
      </div>
      <small class="history-item-category">Kategori: ${categoryName}</small>
    `;
    completedTaskList.appendChild(item);
  });
}

/**
 * --- FUNGSI calculateStats ---
 * (Tidak berubah)
 */
function calculateStats() {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const dayOfWeek = todayStart.getDay();
  const weekStart = new Date(
    todayStart.getTime() - dayOfWeek * 24 * 60 * 60 * 1000
  );
  let countToday = 0;
  let countWeek = 0;
  const last7DaysData = [0, 0, 0, 0, 0, 0, 0];
  const last7DaysLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
    last7DaysLabels.push(
      i === 0 ? "Hari Ini" : d.toLocaleDateString("id-ID", { weekday: "short" })
    );
  }
  completedTasks.forEach((task) => {
    const completedAt = new Date(task.completedAt);
    if (completedAt >= todayStart) {
      countToday++;
    }
    if (completedAt >= weekStart) {
      countWeek++;
    }
    const completedDateOnly = new Date(
      new Date(task.completedAt).setHours(0, 0, 0, 0)
    );
    const diffDays = Math.floor(
      (todayStart - completedDateOnly) / (1000 * 60 * 60 * 24)
    );
    if (diffDays >= 0 && diffDays < 7) {
      last7DaysData[6 - diffDays]++;
    }
  });
  return {
    countToday: countToday,
    countWeek: countWeek,
    chartLabels: last7DaysLabels,
    chartData: last7DaysData,
  };
}

/**
 * --- FUNGSI renderStatsChart ---
 * (Tidak berubah)
 */
function renderStatsChart(labels, data) {
  if (productivityChart) {
    productivityChart.destroy();
  }
  const ctx = chartCanvas.getContext("2d");
  if (!ctx) return;
  productivityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Tugas Selesai",
          data: data,
          backgroundColor: "rgba(55, 48, 163, 0.7)",
          borderColor: "rgba(55, 48, 163, 1)",
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

/**
 * --- MODIFIKASI: handleAddTask ---
 * Sekarang menangani "Tambah" dan "Edit"
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

  if (currentEditId) {
    // --- LOGIKA EDIT ---
    const taskToEdit = tasks.find((task) => task.id === currentEditId);
    if (taskToEdit) {
      taskToEdit.name = name;
      taskToEdit.deadline = deadline;
      taskToEdit.urgency = urgency;
      taskToEdit.workload = workload;
      taskToEdit.quadrantKey = quadrantKey;
    }
  } else {
    // --- LOGIKA TAMBAH (yang sudah ada) ---
    const newTask = {
      id: "task-" + Date.now(),
      name: name,
      deadline: deadline,
      urgency: urgency,
      workload: workload,
      quadrantKey: quadrantKey,
    };
    tasks.push(newTask);
  }

  saveTasks();
  renderAllTasks();

  taskForm.reset();
  taskModal.hide(); // resetModal() akan dipanggil oleh event 'hidden.bs.modal'
}

/**
 * Memulai proses 'Selesai' (Fitur 1)
 * (Tidak berubah)
 */
function initiateCompleteTask(e) {
  const taskCard = e.target.closest(".card");
  if (!taskCard) return;

  taskToCompleteId = taskCard.dataset.id;
  confirmTaskName.textContent = taskCard.dataset.name;
  confirmDoneModal.show();
}

/**
 * Konfirmasi 'Selesai' (Fitur 1)
 * (Tidak berubah)
 */
function confirmCompleteTask() {
  if (!taskToCompleteId) return;
  const taskIndex = tasks.findIndex((task) => task.id === taskToCompleteId);
  if (taskIndex === -1) return;
  const [completedTask] = tasks.splice(taskIndex, 1);
  completedTask.completedAt = new Date().toISOString();
  completedTasks.push(completedTask);
  saveTasks();
  saveCompletedTasks();
  renderAllTasks();
  confirmDoneModal.hide();
  taskToCompleteId = null;
}

// --- ⭐ 4. Fitur Countdown Timer Dinamis ---
// (Tidak ada perubahan di semua fungsi countdown)
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
  let color = "green";
  if (days < 1) color = "red";
  else if (days <= urgentThresholdDays) color = "orange";
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
    const card = el.closest(".card");
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
// --- (Selesai Fungsi Countdown) ---

/**
 * --- BARU: Fungsi untuk memulai mode Edit ---
 */
function initiateEdit(e) {
  const taskCard = e.target.closest(".card");
  if (!taskCard) return;

  const taskId = taskCard.dataset.id;
  const taskToEdit = tasks.find((task) => task.id === taskId);
  if (!taskToEdit) return;

  currentEditId = taskId; // Set ID global
  modalTitle.textContent = "Edit Tugas"; // Ubah judul modal
  taskNameInput.value = taskToEdit.name; // Isi form
  taskDeadlineInput.value = taskToEdit.deadline; // Isi form

  taskModal.show(); // Tampilkan modal
}

// --- Handler untuk Modal (Versi Bootstrap) ---
function showModal() {
  // (Tidak berubah)
  errorMessage.style.display = "none";
  taskForm.reset();
  taskModal.show();
}

/**
 * --- MODIFIKASI: resetModal ---
 * Sekarang juga mereset ID edit dan judul modal
 */
function resetModal() {
  errorMessage.style.display = "none";
  taskForm.reset();
  currentEditId = null; // Reset ID
  if (modalTitle) {
    modalTitle.textContent = "Tambah Tugas Baru"; // Reset Judul
  }
}

// --- Fungsi update hitungan badge (Fitur 3) ---
// (Tidak berubah)
function updateTaskCountBadges() {
  document.getElementById("count-all").textContent = tasks.length;
  document.getElementById("count-api").textContent = tasks.filter(
    (t) => t.quadrantKey === "api"
  ).length;
  document.getElementById("count-cepat").textContent = tasks.filter(
    (t) => t.quadrantKey === "cepat"
  ).length;
  document.getElementById("count-jadwal").textContent = tasks.filter(
    (t) => t.quadrantKey === "jadwal"
  ).length;
  document.getElementById("count-santai").textContent = tasks.filter(
    (t) => t.quadrantKey === "santai"
  ).length;
  document.getElementById("count-done").textContent = completedTasks.length;
}

/**
 * Handler untuk Filter
 * (Tidak berubah)
 */
function handleFilterClick(e) {
  const clickedButton = e.target.closest(".filter-btn");
  if (!clickedButton) return;
  currentFilter = clickedButton.dataset.filter;
  localStorage.setItem("smartTasksFilter", currentFilter);
  document.querySelectorAll("#filter-container .filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  clickedButton.classList.add("active");
  if (currentFilter !== "done" && mainTitle) {
    mainTitle.textContent = clickedButton.textContent
      .trim()
      .replace(/\d+$/, "")
      .trim();
  }
  renderAllTasks();
}

/**
 * Handler untuk View Toggle (Fitur 1)
 * (Tidak berubah)
 */
function handleViewToggle(e) {
  const clickedButton = e.target.closest(".view");
  if (!clickedButton) return;
  const view = clickedButton.dataset.view;
  document
    .querySelectorAll("#view-toggle .view")
    .forEach((btn) => btn.classList.remove("active"));
  clickedButton.classList.add("active");
  if (view === "list") {
    taskBoard.classList.add("list-view");
    taskBoard.style.display = "flex";
  } else {
    taskBoard.classList.remove("list-view");
    taskBoard.style.display = "grid";
  }
}

/**
 * --- BARU: Handler untuk klik di task board ---
 * (Memeriksa klik "Done" atau "Edit")
 */
function handleTaskBoardClick(e) {
  if (e.target.closest(".btn-done-task")) {
    initiateCompleteTask(e); // Panggil fungsi "Done"
  }
  if (e.target.closest(".btn-edit-task")) {
    initiateEdit(e); // Panggil fungsi "Edit"
  }
}

// --- (BARU) FITUR SAPAAN & WAKTU DINAMIS ---

// 1. Fungsi Sapaan (Berjalan Sekali)
function setDynamicGreeting() {
  const greetingElement = document.getElementById("dynamic-greeting");
  if (!greetingElement) return;

  const now = new Date();
  const currentHour = now.getHours();
  let greeting = "Selamat Datang!";

  if (currentHour >= 5 && currentHour < 11) {
    greeting = "Selamat Pagi! ☀️";
  } else if (currentHour >= 11 && currentHour < 15) {
    greeting = "Selamat Siang. Tetap fokus!";
  } else if (currentHour >= 15 && currentHour < 18) {
    greeting = "Selamat Sore. Semangat! 🔥";
  } else {
    greeting = "Selamat Malam. Waktunya istirahat?";
  }

  greetingElement.textContent = greeting;
}

// 2. Fungsi Waktu (Berjalan Terus Menerus)
function updateDynamicTime() {
  const timeElement = document.getElementById("dynamic-time");
  if (!timeElement) return;

  const now = new Date();

  // Format Tanggal (misal: Sabtu, 15 November 2025)
  const dateOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  const formattedDate = now.toLocaleDateString("id-ID", dateOptions);

  // Format Waktu (misal: 19:42:52)
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  // .replace agar formatnya 19:42:52 bukan 19.42.52
  const formattedTime = now
    .toLocaleTimeString("id-ID", timeOptions)
    .replace(/\./g, ":");

  // Gabungkan
  timeElement.textContent = `${formattedDate} | ${formattedTime}`;
}

// --- Inisialisasi Aplikasi ---
document.addEventListener("DOMContentLoaded", () => {
  // Inisialisasi Modal Bootstrap
  taskModal = new bootstrap.Modal(taskModalElement);
  confirmDoneModal = new bootstrap.Modal(confirmDoneModalElement);

  // Set input tanggal minimal hari ini
  taskDeadlineInput.min = new Date().toISOString().split("T")[0];

  // Atur UI filter agar sesuai dengan state yang dimuat
  document.querySelectorAll("#filter-container .filter-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `#filter-container .filter-btn[data-filter="${currentFilter}"]`
  );
  if (activeButton) {
    activeButton.classList.add("active");
    if (currentFilter !== "done" && mainTitle) {
      mainTitle.textContent = activeButton.textContent
        .trim()
        .replace(/\d+$/, "")
        .trim();
    }
  }

  // Render tugas awal
  renderAllTasks();

  // Panggil sapaan & waktu
  setDynamicGreeting();
  updateDynamicTime();
  setInterval(updateDynamicTime, 1000);

  // --- Tambahkan semua Event Listener ---
  taskForm.addEventListener("submit", handleAddTask);

  // MODIFIKASI: Listener Task Board
  taskBoard.addEventListener("click", handleTaskBoardClick);

  btnConfirmDone.addEventListener("click", confirmCompleteTask);

  if (showModalButton) {
    showModalButton.addEventListener("click", showModal);
  } else {
    console.error("Tombol .add-task tidak ditemukan!");
  }

  taskModalElement.addEventListener("hidden.bs.modal", (event) => {
    resetModal();
  });

  document
    .getElementById("filter-container")
    .addEventListener("click", handleFilterClick);

  searchInput.addEventListener("input", renderAllTasks);
  viewToggleContainer.addEventListener("click", handleViewToggle);
});
