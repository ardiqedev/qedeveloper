/* =========================================
   QEDEVELOPER - ADMIN DASHBOARD
   Pengelolaan permintaan akses source code
========================================= */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", initAdmin);

  const TOKEN_KEY = "qedev_admin_token";
  const EXPIRED_KEY = "qedev_admin_expired_at";

  const STATUS = {
    PENDING: "BELUM_DIKIRIM",
    SENT: "SUDAH_DIKIRIM",
    REJECTED: "DITOLAK",
  };

  let adminToken = "";
  let activeStatus = STATUS.PENDING;
  let currentRequestId = "";
  let currentRequest = null;
  let isProcessing = false;

  const $ = (selector) => document.querySelector(selector);

  function initAdmin() {
    if (!window.QEDEV_API) {
      showAlert("API client tidak ditemukan. Periksa lokasi api.js.", "error");
      return;
    }

    adminToken = getStoredToken();

    if (!adminToken) {
      redirectToLogin();
      return;
    }

    bindEvents();
    loadDashboard();
  }

  /* =========================================
     AUTHENTICATION
  ========================================= */

  function getStoredToken() {
    try {
      return (
        localStorage.getItem(TOKEN_KEY) ||
        sessionStorage.getItem(TOKEN_KEY) ||
        ""
      );
    } catch (error) {
      console.error("[ADMIN] Gagal membaca sesi:", error);
      return "";
    }
  }

  function getStoredExpiry() {
    try {
      return (
        localStorage.getItem(EXPIRED_KEY) ||
        sessionStorage.getItem(EXPIRED_KEY) ||
        ""
      );
    } catch (error) {
      return "";
    }
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

  function clearAdminSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRED_KEY);

      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRED_KEY);
    } catch (error) {
      console.error("[ADMIN] Gagal membersihkan sesi:", error);
    }

    adminToken = "";
  }

  async function logout() {
    if (!confirm("Apakah Anda yakin ingin keluar dari halaman admin?")) {
      return;
    }

    try {
      await apiPost("admin-logout");
    } catch (error) {
      // Sesi lokal tetap dibersihkan jika endpoint logout belum tersedia.
      console.warn("[ADMIN] Logout server:", error.message);
    }

    clearAdminSession();
    redirectToLogin();
  }

  function checkClientExpiry() {
    const expiry = getStoredExpiry();

    if (!expiry) return true;

    const timestamp = new Date(expiry).getTime();

    if (!Number.isFinite(timestamp)) return true;

    if (Date.now() >= timestamp) {
      clearAdminSession();
      redirectToLogin();
      return false;
    }

    return true;
  }

  /* =========================================
     API
  ========================================= */

  function apiPost(action, params = {}) {
    if (!adminToken) {
      return Promise.reject(new Error("Sesi admin tidak ditemukan."));
    }

    if (!checkClientExpiry()) {
      return Promise.reject(new Error("Sesi admin telah berakhir."));
    }

    return window.QEDEV_API.post({
      action: action,
      token: adminToken,
      ...params,
    }).catch((error) => {
      const message = String(error.message || "").toLowerCase();

      if (
        error.code === "UNAUTHORIZED" ||
        error.code === "SESSION_EXPIRED" ||
        message.includes("sesi") ||
        message.includes("token tidak valid")
      ) {
        clearAdminSession();
        redirectToLogin();
      }

      throw error;
    });
  }

  /* =========================================
     EVENT LISTENERS
  ========================================= */

  function bindEvents() {
    $("#logout-button")?.addEventListener("click", logout);

    $("#refresh-requests")?.addEventListener("click", loadDashboard);

    document.querySelectorAll("[data-status-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const status = button.dataset.statusFilter;

        if (!Object.values(STATUS).includes(status)) return;

        setActiveTab(status);
        loadRequests(status);
      });
    });

    $("#close-detail-modal")?.addEventListener("click", closeDetail);
    $("#close-detail-button")?.addEventListener("click", closeDetail);

    $("#request-detail-modal")?.addEventListener("click", (event) => {
      if (event.target.id === "request-detail-modal") {
        closeDetail();
      }
    });

    $("#prepare-code-button")?.addEventListener("click", prepareCode);
    $("#confirm-sent-button")?.addEventListener("click", confirmSent);
    $("#show-reject-button")?.addEventListener("click", showRejectForm);
    $("#confirm-reject-button")?.addEventListener("click", rejectRequest);
    $("#cancel-reject-button")?.addEventListener("click", hideRejectForm);
  }

  /* =========================================
     DASHBOARD
  ========================================= */

  async function loadDashboard() {
    if (isProcessing) return;

    showAlert("", "");

    await Promise.all([loadStatistics(), loadRequests(activeStatus)]);
  }

  async function loadStatistics() {
    const targets = [
      { status: STATUS.PENDING, selector: "#count-pending" },
      { status: STATUS.SENT, selector: "#count-sent" },
      { status: STATUS.REJECTED, selector: "#count-rejected" },
    ];

    const results = await Promise.allSettled(
      targets.map((item) =>
        apiPost("admin-get-requests", { status: item.status }),
      ),
    );

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        console.error("[ADMIN] Statistik gagal:", result.reason);
        return;
      }

      const data = result.value || {};
      const requests = Array.isArray(data.requests) ? data.requests : [];
      const total = Number.isFinite(Number(data.total))
        ? Number(data.total)
        : requests.length;

      const element = $(targets[index].selector);

      if (element) {
        element.textContent = total;
      }
    });
  }

  /* =========================================
     REQUEST LIST
  ========================================= */

  function setActiveTab(status) {
    activeStatus = status;

    document.querySelectorAll("[data-status-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.statusFilter === status);
    });
  }

  async function loadRequests(status) {
    const list = $("#request-list");
    const count = $("#request-count");

    if (!list) return;

    list.innerHTML = '<div class="empty-state">Memuat data...</div>';

    if (count) {
      count.textContent = "Memuat permintaan...";
    }

    try {
      const data = await apiPost("admin-get-requests", {
        status: status,
      });

      const requests = Array.isArray(data?.requests) ? data.requests : [];

      renderRequests(requests);

      if (count) {
        count.textContent = `${requests.length} permintaan ditemukan`;
      }
    } catch (error) {
      list.innerHTML = `
        <div class="empty-state">
          Gagal mengambil data permintaan.<br>
          ${escapeHTML(error.message)}
        </div>
      `;

      if (count) {
        count.textContent = "Gagal memuat data";
      }

      showAlert(error.message, "error");
    }
  }

  function renderRequests(requests) {
    const list = $("#request-list");

    if (!list) return;

    if (!requests.length) {
      list.innerHTML = `
        <div class="empty-state">
          Tidak ada permintaan pada kategori ini.
        </div>
      `;
      return;
    }

    list.innerHTML = requests
      .map((item) => {
        const id = item.id || "";
        const name = item.name || "Tanpa Nama";
        const product = item.productId || "-";
        const amount = formatCurrency(item.donationAmount);
        const date = formatDate(item.createdAt);

        return `
        <article class="request-card">
          <div class="request-info">
            <div class="request-name">
              ${escapeHTML(name)}
            </div>

            <div class="request-meta">
              <span>Produk: ${escapeHTML(product)}</span>
              <span>Donasi: ${escapeHTML(amount)}</span>
              <span>${escapeHTML(date)}</span>
            </div>
          </div>

          <div class="request-actions">
            <button
              type="button"
              class="btn-detail"
              data-request-id="${escapeHTML(id)}">
              Detail
            </button>
          </div>
        </article>
      `;
      })
      .join("");

    list.querySelectorAll("[data-request-id]").forEach((button) => {
      button.addEventListener("click", () => {
        openDetail(button.dataset.requestId);
      });
    });
  }

  /* =========================================
     REQUEST DETAIL
  ========================================= */

  async function openDetail(requestId) {
    if (!requestId) return;

    currentRequestId = requestId;
    currentRequest = null;

    const modal = $("#request-detail-modal");

    modal?.classList.add("show");
    modal?.setAttribute("aria-hidden", "false");

    setDetailLoading();

    try {
      const data = await apiPost("admin-get-request-detail", {
        requestId: requestId,
      });

      const request = data?.request || data;

      if (!request || !request.id) {
        throw new Error("Detail permintaan tidak ditemukan.");
      }

      currentRequest = request;
      renderDetail(request);
    } catch (error) {
      showDetailAlert(error.message, "error");
    }
  }

  function setDetailLoading() {
    const fields = [
      "#detail-name",
      "#detail-whatsapp",
      "#detail-email",
      "#detail-product",
      "#detail-amount",
      "#detail-created",
      "#detail-status",
      "#detail-id",
      "#detail-access-code",
      "#detail-sent-at",
      "#detail-expired-at",
      "#detail-admin-note",
    ];

    fields.forEach((selector) => {
      const element = $(selector);
      if (element) element.textContent = "Memuat...";
    });

    const proof = $("#detail-proof");

    if (proof) {
      proof.textContent = "Memuat bukti transfer...";
    }

    showDetailAlert("", "");
  }

  function renderDetail(request) {
    setText("#detail-name", request.name);
    setText("#detail-whatsapp", request.whatsapp);
    setText("#detail-email", request.email);
    setText("#detail-product", request.productId);
    setText("#detail-amount", formatCurrency(request.donationAmount));
    setText("#detail-created", formatDate(request.createdAt));
    setText("#detail-id", request.id);
    setText("#detail-status", request.status);
    setText("#detail-sent-at", formatDate(request.sentAt));
    setText("#detail-expired-at", formatDate(request.expiredAt));
    setText("#detail-admin-note", request.adminNote || "Tidak ada catatan.");

    setText("#detail-access-code", request.accessCode || "Belum disiapkan");

    setText(
      "#detail-code-note",
      request.accessCode
        ? "Kode sudah disiapkan. Kirim secara manual melalui WhatsApp."
        : "Kode akan muncul setelah admin menyiapkannya.",
    );

    renderProof(request.proofUrl);
    updateDetailActions(request);
    renderWhatsAppButton(request);
  }

  function renderWhatsAppButton(request) {
    const section = $("#access-code-section");

    if (!section) return;

    // Hapus tombol lama agar tidak terjadi duplikasi.
    section.querySelector("#send-whatsapp-button")?.remove();

    if (!request.accessCode || request.status !== STATUS.PENDING) {
      return;
    }

    const button = document.createElement("button");

    button.type = "button";
    button.id = "send-whatsapp-button";
    button.className = "btn btn-success";
    button.textContent = "Kirim Kode via WhatsApp";

    button.addEventListener("click", function () {
      openWhatsAppMessage(request);
    });

    section.appendChild(button);
  }

  function openWhatsAppMessage(request) {
    const whatsapp = String(request.whatsapp || "")
      .replace(/\D/g, "")
      .replace(/^0/, "62");

    if (!whatsapp) {
      showDetailAlert("Nomor WhatsApp pemohon tidak tersedia.", "error");
      return;
    }

    const name = request.name || "Pelanggan";
    const productId = request.productId || "-";
    const accessCode = request.accessCode || "";

    if (!accessCode) {
      showDetailAlert("Kode akses belum disiapkan.", "error");
      return;
    }

    const activationUrl =
      "https://qedstack.com/pages/detail.html?id=" +
      encodeURIComponent(productId);

    const message = [
      `Halo, *${name}*! `,
      "",
      "Pembayaran Anda telah berhasil kami verifikasi.",
      "",
      `- *Produk:* ${productId}`,
      `- *Kode Akses:* ${accessCode}`,
      `- *Masa Berlaku:* 15 hari sejak kode dikirim.`,
      "",
      "Terima kasih telah mendukung QEDeveloper! ",
      "*QEDstack*",
    ].join("\n");

    const whatsappUrl =
      "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(message);

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function renderProof(url) {
    const element = $("#detail-proof");

    if (!element) return;

    if (!url) {
      element.textContent = "Bukti transfer belum tersedia.";
      return;
    }

    const safeUrl = getSafeUrl(url);

    if (!safeUrl) {
      element.textContent = "Link bukti transfer tidak valid.";
      return;
    }

    // Ambil ID file Google Drive
    function getDriveFileId(value) {
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/,
      ];

      for (const pattern of patterns) {
        const match = value.match(pattern);

        if (match) return match[1];
      }

      return "";
    }

    const fileId = getDriveFileId(safeUrl);

    const isPdf = /\.pdf(?:\?.*)?$/i.test(safeUrl);

    if (fileId && !isPdf) {
      const thumbnailUrl =
        "https://drive.google.com/thumbnail?id=" +
        encodeURIComponent(fileId) +
        "&sz=w1200";

      const originalUrl =
        "https://drive.google.com/file/d/" +
        encodeURIComponent(fileId) +
        "/view";

      element.innerHTML = `
      <div class="proof-preview">
        <a
          href="${escapeHTML(originalUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="${escapeHTML(thumbnailUrl)}"
            alt="Bukti transfer"
            class="proof-image"
            onerror="
              this.style.display='none';
              this.nextElementSibling.hidden=false;
            "
          >

          <div class="proof-error" hidden>
            Preview tidak dapat dimuat.
            <br>
            Silakan buka file melalui Google Drive.
          </div>
        </a>
      </div>

      <a
        href="${escapeHTML(originalUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        class="proof-open-link"
      >
        Buka Bukti Transfer di Google Drive
      </a>
    `;
    } else if (isPdf) {
      element.innerHTML = `
      <iframe
        src="${escapeHTML(safeUrl)}"
        class="proof-pdf"
        title="Preview bukti transfer"
      ></iframe>

      <a
        href="${escapeHTML(safeUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Buka PDF di Tab Baru
      </a>
    `;
    } else {
      element.innerHTML = `
      <a
        href="${escapeHTML(safeUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Buka Bukti Transfer
      </a>
    `;
    }
  }

  function updateDetailActions(request) {
    const pending = request.status === STATUS.PENDING;
    const sent = request.status === STATUS.SENT;

    const prepared = Boolean(request.accessCode);

    setHidden("#prepare-code-button", !pending || prepared);
    setHidden("#confirm-sent-button", !pending || !prepared);
    setHidden("#show-reject-button", !pending);

    setHidden("#confirm-reject-button", true);
    setHidden("#cancel-reject-button", true);
    setHidden("#reject-form-section", true);

    setHidden("#access-code-section", !prepared);

    // Permintaan yang sudah dikirim atau ditolak hanya dapat dilihat.
    if (sent || request.status === STATUS.REJECTED) {
      setHidden("#prepare-code-button", true);
      setHidden("#confirm-sent-button", true);
      setHidden("#show-reject-button", true);
    }
  }

  function closeDetail() {
    const modal = $("#request-detail-modal");

    modal?.classList.remove("show");
    modal?.setAttribute("aria-hidden", "true");

    currentRequestId = "";
    currentRequest = null;

    hideRejectForm();
  }

  /* =========================================
     PREPARE ACCESS CODE
  ========================================= */

  async function prepareCode() {
    if (!currentRequestId || isProcessing) return;

    if (!confirm("Siapkan kode akses untuk permintaan ini?")) {
      return;
    }

    setProcessing(true);

    try {
      const data = await apiPost("admin-prepare-code", {
        requestId: currentRequestId,
      });

      const accessCode = data?.accessCode;

      if (!accessCode) {
        throw new Error("Kode akses tidak diterima dari server.");
      }

      showDetailAlert(
        "Kode akses berhasil disiapkan. Silakan kirim manual melalui WhatsApp.",
        "success",
      );

      await refreshCurrentDetail();
      await loadStatistics();
    } catch (error) {
      showDetailAlert(error.message, "error");
    } finally {
      setProcessing(false);
    }
  }

  /* =========================================
     CONFIRM SENT
  ========================================= */

  async function confirmSent() {
    if (!currentRequestId || isProcessing) return;

    if (!currentRequest?.accessCode) {
      showDetailAlert("Siapkan kode akses terlebih dahulu.", "error");
      return;
    }

    const confirmed = confirm(
      "Pastikan kode akses sudah benar-benar dikirim kepada pemohon melalui WhatsApp.\n\n" +
        "Apakah pengiriman sudah dilakukan?",
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      await apiPost("admin-confirm-sent", {
        requestId: currentRequestId,
      });

      showAlert("Status permintaan berhasil diperbarui.", "success");

      closeDetail();

      await loadStatistics();
      await loadRequests(activeStatus);
    } catch (error) {
      showDetailAlert(error.message, "error");
    } finally {
      setProcessing(false);
    }
  }

  /* =========================================
     REJECT REQUEST
  ========================================= */

  function showRejectForm() {
    setHidden("#reject-form-section", false);
    setHidden("#confirm-reject-button", false);
    setHidden("#cancel-reject-button", false);

    setHidden("#show-reject-button", true);

    $("#reject-note")?.focus();
  }

  function hideRejectForm() {
    setHidden("#reject-form-section", true);
    setHidden("#confirm-reject-button", true);
    setHidden("#cancel-reject-button", true);

    if (currentRequest?.status === STATUS.PENDING) {
      setHidden("#show-reject-button", false);
    }

    const input = $("#reject-note");

    if (input) {
      input.value = "";
    }
  }

  async function rejectRequest() {
    if (!currentRequestId || isProcessing) return;

    const note = String($("#reject-note")?.value || "").trim();

    if (!note) {
      showDetailAlert("Alasan penolakan wajib diisi.", "error");
      $("#reject-note")?.focus();
      return;
    }

    if (!confirm("Tolak permintaan akses ini?")) {
      return;
    }

    setProcessing(true);

    try {
      await apiPost("admin-reject-request", {
        requestId: currentRequestId,
        adminNote: note,
      });

      showAlert("Permintaan berhasil ditolak.", "success");

      closeDetail();

      await loadStatistics();
      await loadRequests(activeStatus);
    } catch (error) {
      showDetailAlert(error.message, "error");
    } finally {
      setProcessing(false);
    }
  }

  /* =========================================
     REFRESH DETAIL
  ========================================= */

  async function refreshCurrentDetail() {
    if (!currentRequestId) return;

    const data = await apiPost("admin-get-request-detail", {
      requestId: currentRequestId,
    });

    const request = data?.request || data;

    if (!request) {
      throw new Error("Gagal memperbarui detail permintaan.");
    }

    currentRequest = request;
    renderDetail(request);
  }

  /* =========================================
     PROCESSING STATE
  ========================================= */

  function setProcessing(state) {
    isProcessing = state;

    const buttons = [
      "#prepare-code-button",
      "#confirm-sent-button",
      "#show-reject-button",
      "#confirm-reject-button",
      "#cancel-reject-button",
      "#refresh-requests",
    ];

    buttons.forEach((selector) => {
      const button = $(selector);
      if (button) button.disabled = state;
    });
  }

  /* =========================================
     UI HELPERS
  ========================================= */

  function showAlert(message, type) {
    const element = $("#admin-alert");

    if (!element) return;

    element.textContent = message;
    element.className = "alert";

    if (!message) return;

    element.classList.add("show");

    if (type === "success") {
      element.classList.add("alert-success");
    } else if (type === "info") {
      element.classList.add("alert-info");
    } else {
      element.classList.add("alert-error");
    }
  }

  function showDetailAlert(message, type) {
    const element = $("#detail-alert");

    if (!element) return;

    element.textContent = message;
    element.className = "alert";

    if (!message) return;

    element.classList.add("show");

    if (type === "success") {
      element.classList.add("alert-success");
    } else if (type === "info") {
      element.classList.add("alert-info");
    } else {
      element.classList.add("alert-error");
    }
  }

  function setText(selector, value) {
    const element = $(selector);

    if (element) {
      element.textContent =
        value === null || value === undefined || value === ""
          ? "-"
          : String(value);
    }
  }

  function setHidden(selector, hidden) {
    const element = $(selector);

    if (element) {
      element.hidden = hidden;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });
  }

  function getSafeUrl(value) {
    try {
      const url = new URL(String(value));

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }

      return url.href;
    } catch (error) {
      return "";
    }
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatCurrency(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return String(value);
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
})();
