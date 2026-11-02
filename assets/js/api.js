/* =========================================
   QEDEVELOPER - API CLIENT
   Koneksi frontend ke Google Apps Script
========================================= */

(function () {
  "use strict";

  const APIClient = {
    // Ganti dengan URL Web App Apps Script yang berakhiran /exec.

    baseUrl:
      "https://script.google.com/macros/s/AKfycbzGnIyT4NSA2Mg8E5JkhbhRVCdEcOhlAeJuRJDZMcrIwc1dcUuz9lA3AojvHWByxbjdrw/exec",

    timeout: 30000,

    /**
     * Konfigurasi URL backend.
     */
    configure(url) {
      const value = String(url || "").trim();

      if (!value) {
        throw new Error("URL API QEDeveloper belum diisi.");
      }

      this.baseUrl = value.replace(/\/+$/, "");
    },

    /**
     * Meminta data dari Google Apps Script menggunakan JSONP.
     * Backend perlu mendukung parameter callback.
     */
    request(params = {}) {
      return new Promise((resolve, reject) => {
        if (!this.baseUrl) {
          reject(new Error("QEDeveloper belum dikonfigurasi."));
          return;
        }

        const callbackName =
          "qedevCallback_" +
          Date.now() +
          "_" +
          Math.random().toString(36).slice(2, 9);

        const query = new URLSearchParams({
          ...params,
          callback: callbackName,
        });

        const script = document.createElement("script");
        const url = `${this.baseUrl}?${query.toString()}`;

        let timeoutId;

        const cleanup = () => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          script.remove();
        };

        window[callbackName] = (response) => {
          cleanup();

          if (!response || response.success !== true) {
            reject(new Error(response?.message || "Permintaan API gagal."));
            return;
          }

          resolve(response.data);
        };

        script.onerror = () => {
          cleanup();
          reject(new Error("Gagal menghubungi API QEDeveloper."));
        };

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Permintaan API melewati batas waktu."));
        }, this.timeout);

        script.src = url;
        document.head.appendChild(script);
      });
    },

    /**
     * Mengirim data ke Google Apps Script menggunakan POST.
     * Digunakan khusus untuk aktivasi dan source code.
     */
    post(params = {}) {
      if (!this.baseUrl) {
        return Promise.reject(new Error("QEDeveloper belum dikonfigurasi."));
      }

      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      const body = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        body.append(key, String(value ?? ""));
      });

      return fetch(this.baseUrl, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "follow",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: body.toString(),
        signal: controller.signal,
      })
        .then(async (response) => {
          const text = await response.text();

          let result;

          try {
            result = JSON.parse(text);
          } catch (error) {
            throw new Error("Respons POST API bukan JSON yang valid.");
          }

          if (!result || result.success !== true) {
            const error = new Error(result?.message || "Permintaan API gagal.");

            error.code = result?.error?.code || "API_ERROR";
            error.response = result;

            throw error;
          }

          return result.data;
        })
        .catch((error) => {
          if (error.name === "AbortError") {
            throw new Error("Permintaan POST melewati batas waktu.");
          }

          throw error;
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    },

    /**
     * Login Super Admin.
     * Mengirim username dan password melalui POST.
     */
    adminLogin(username, password) {
      const user = String(username || "").trim();
      const pass = String(password || "");

      if (!user || !pass) {
        return Promise.reject(new Error("Username dan password wajib diisi."));
      }

      return this.post({
        action: "admin-login",
        username: user,
        password: pass,
      }).then((data) => {
        if (!data || !data.token) {
          throw new Error(
            "Login berhasil diproses, tetapi token sesi tidak diterima.",
          );
        }

        return {
          token: data.token,
          expiredAt: data.expiredAt,
          durationHours: data.durationHours,
        };
      });
    },

    /**
     * Membuat key penyimpanan token berdasarkan produk.
     */
    getAccessTokenKey(productId) {
      return "qedev_access_token_" + String(productId).trim();
    },

    /**
     * Mengambil token perangkat dari localStorage.
     */
    getAccessToken(productId) {
      try {
        return localStorage.getItem(this.getAccessTokenKey(productId)) || "";
      } catch (error) {
        console.error("[API] Gagal membaca token:", error);
        return "";
      }
    },

    /**
     * Menghapus token lokal perangkat.
     */
    clearAccessToken(productId) {
      try {
        localStorage.removeItem(this.getAccessTokenKey(productId));

        return true;
      } catch (error) {
        console.error("[API] Gagal menghapus token:", error);
        return false;
      }
    },

    /**
     * Aktivasi akses source code menggunakan kode donasi.
     */
    activateAccess(productId, code) {
      const id = String(productId || "").trim();
      const activationCode = String(code || "").trim();

      if (!id || !activationCode) {
        return Promise.reject(
          new Error("ID produk dan kode akses wajib diisi."),
        );
      }

      return this.post({
        action: "activate-access",
        productId: id,
        code: activationCode,
      }).then((data) => {
        if (!data || !data.token) {
          throw new Error(
            "Aktivasi berhasil diproses, tetapi token tidak diterima.",
          );
        }

        try {
          localStorage.setItem(this.getAccessTokenKey(id), data.token);
        } catch (error) {
          throw new Error("Token diterima, tetapi gagal disimpan di browser.");
        }

        // Jangan tampilkan token ke console.
        return {
          success: true,
          productId: id,
          expiredAt: data.expiredAt,
          message: data.message,
        };
      });
    },

    /**
     * Mengirim permintaan akses source code beserta bukti transfer.
     */
    createAccessRequest(data = {}) {
      const productId = String(data.productId || "").trim();
      const name = String(data.name || "").trim();
      const whatsapp = String(data.whatsapp || "").trim();
      const email = String(data.email || "").trim();
      const proof = data.proof || {};

      if (!productId || !name || !whatsapp) {
        return Promise.reject(
          new Error("Nama, nomor WhatsApp, dan produk wajib diisi."),
        );
      }

      if (!proof.base64 || !proof.fileName || !proof.mimeType) {
        return Promise.reject(new Error("Bukti transfer wajib diunggah."));
      }

      return this.post({
        action: "create-access-request",
        productId: productId,
        name: name,
        whatsapp: whatsapp,
        email: email,
        fileName: proof.fileName,
        mimeType: proof.mimeType,
        base64: proof.base64,
      });
    },

    /**
     * Mengambil daftar produk.
     */
    getProducts(options = {}) {
      return this.request({
        action: "products",
        category: options.category || "",
        type: options.type || "",
        keyword: options.keyword || "",
      });
    },

    /**
     * Mengambil daftar produk affiliate.
     */
    getAffiliateProducts() {
      return this.request({
        action: "getAffiliateProducts",
      });
    },

    /**
     * Mengambil detail produk berdasarkan ID.
     */

    getProduct(id) {
      console.log("[API DETAIL] ID yang diminta:", id);

      return this.request({
        action: "product",
        id: id,
      }).then((data) => {
        console.log("[API DETAIL] Data diterima:", data);
        return data;
      });
    },

    /**
     * Mengambil source code TXT berdasarkan ID produk.
     */

    /**
     * Mengambil source code menggunakan POST.
     * Token dikirim melalui body, bukan URL.
     */
    getSourceCode(id) {
      const productId = String(id || "").trim();

      if (!productId) {
        return Promise.reject(new Error("ID produk wajib diisi."));
      }

      const token = this.getAccessToken(productId);

      return this.post({
        action: "source-code",
        id: productId,
        token: token,
      });
    },

    /**
     * Mengambil produk affiliate berdasarkan ID produk konten.
     * Satu konten dapat memiliki beberapa produk affiliate.
     */
    getAffiliateProducts(id) {
      return this.request({
        action: "getAffiliateProducts",
        id: id || "",
      });
    },

    /**
     * Mengambil daftar kategori.
     */
    getCategories() {
      return this.request({
        action: "categories",
      });
    },
  };

  window.QEDEV_API = APIClient;
})();
