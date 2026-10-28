/* =========================================
   QEDEVELOPER - API CLIENT
   Koneksi frontend ke Google Apps Script
========================================= */

(function () {
  "use strict";

  const APIClient = {
    // Ganti dengan URL Web App Apps Script yang berakhiran /exec.

    baseUrl:
      "https://script.google.com/macros/s/AKfycbzNixB5Xw6tULg_H9SuZj1wpWowHSkH8-JDZAeTKY98jeQw6BIqwuV5yoVLX1W_5qfX/exec",

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
          reject(new Error("URL API QEDeveloper belum dikonfigurasi."));
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
    getSourceCode(id) {
      return this.request({
        action: "source-code",
        id: id,
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
