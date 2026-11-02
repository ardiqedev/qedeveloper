document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const form = document.getElementById("admin-login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("toggle-password");
  const rememberSession = document.getElementById("remember-session");
  const loginButton = document.getElementById("login-button");
  const loginMessage = document.getElementById("login-message");

  const TOKEN_KEY = "qedev_admin_token";
  const EXPIRED_KEY = "qedev_admin_expired_at";

  // Tampilkan / sembunyikan password
  togglePassword.addEventListener("click", function () {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    togglePassword.setAttribute(
      "aria-label",
      isPassword ? "Sembunyikan password" : "Tampilkan password",
    );
  });

  // Tampilkan pesan
  function showMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = "login-message show " + type;
  }

  // Loading tombol
  function setLoading(loading) {
    loginButton.disabled = loading;

    loginButton.querySelector("span").textContent = loading
      ? "Memproses login..."
      : "Masuk ke Dashboard";
  }

  // Hapus sesi lama
  function clearOldSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EXPIRED_KEY);

      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(EXPIRED_KEY);
    } catch (error) {
      console.warn("[Admin Auth] Gagal membersihkan sesi lama.");
    }
  }

  // Simpan token berdasarkan pilihan ingat sesi
  function saveSession(data) {
    const storage = rememberSession.checked ? localStorage : sessionStorage;

    try {
      clearOldSession();

      storage.setItem(TOKEN_KEY, data.token);
      storage.setItem(EXPIRED_KEY, data.expiredAt);
    } catch (error) {
      throw new Error("Browser tidak dapat menyimpan sesi admin.");
    }
  }

  // Proses login
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    loginMessage.className = "login-message";
    loginMessage.textContent = "";

    if (!username || !password) {
      showMessage("Username dan password wajib diisi.", "error");
      return;
    }

    if (
      !window.QEDEV_API ||
      typeof window.QEDEV_API.adminLogin !== "function"
    ) {
      showMessage(
        "API login belum tersedia. Periksa pemuatan api.js.",
        "error",
      );
      return;
    }

    setLoading(true);

    try {
      // Login ke Google Apps Script
      const result = await window.QEDEV_API.adminLogin(username, password);

      // Simpan token sesi
      saveSession(result);

      // Bersihkan password dari input
      passwordInput.value = "";

      showMessage("Login berhasil. Mengalihkan ke dashboard...", "success");

      // Masuk ke dashboard
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("[Admin Auth] Login gagal:", error.code || "UNKNOWN_ERROR");

      showMessage(
        error.message || "Login gagal. Silakan coba kembali.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  });
});
