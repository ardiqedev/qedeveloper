/* =========================================
   QEDEVELOPER - MAIN APPLICATION
   Inisialisasi dan penghubung fitur
========================================= */

(function () {
  "use strict";

  const App = {
    /* =====================================
       INITIALIZE APPLICATION
    ===================================== */

    init() {
      this.updateSiteIdentity();
      this.updateNavigation();
      this.updateFooter();

      // Tetap inisialisasi router dan komponen lain.
      this.initSearch();
      this.initRouter();
      this.initMobileMenu();
      this.initCurrentYear();
      this.initExternalLinks();

      document.documentElement.classList.add("app-ready");

      console.info("QEDeveloper berhasil diinisialisasi.");
    },

    /* =====================================
   ROUTER & PRODUCT DETAIL
===================================== */

    initRouter() {
      // Tangani klik link hash dan navigasi browser.
      window.addEventListener("hashchange", () => {
        this.renderRoute();
      });

      this.renderRoute();
    },

    async renderRoute() {
      const hash = window.location.hash || "#beranda";
      const detailMatch = hash.match(/^#detail\/([^/?#]+)$/);

      const detailContainer = document.querySelector("#product-detail");
      const homeSections = document.querySelectorAll("[data-home-section]");

      // Jika bukan halaman detail, tampilkan halaman utama.
      if (!detailMatch) {
        if (detailContainer) {
          detailContainer.hidden = true;
          detailContainer.innerHTML = "";
        }

        homeSections.forEach((section) => {
          section.hidden = false;
        });

        return;
      }

      let productId;

      try {
        productId = decodeURIComponent(detailMatch[1]);
      } catch {
        productId = detailMatch[1];
      }

      homeSections.forEach((section) => {
        section.hidden = true;
      });

      if (!detailContainer) {
        console.error('Elemen "#product-detail" tidak ditemukan.');
        return;
      }

      detailContainer.hidden = false;
      detailContainer.innerHTML = `
    <div class="container">
      <div class="loading-card" role="status">
        <p>Memuat detail produk...</p>
      </div>
    </div>
  `;

      try {
        if (!window.QEDEV_API) {
          throw new Error("API QEDeveloper belum tersedia.");
        }

        if (!window.QEDEV_TOOLS || !window.QEDEV_UI) {
          throw new Error("Komponen katalog QEDEV belum tersedia.");
        }

        // Ambil detail produk langsung dari Google Apps Script.
        const product = await window.QEDEV_API.getProduct(productId);

        console.log("[DETAIL] Hash:", hash);
        console.log("[DETAIL] ID produk:", productId);
        console.log("[DETAIL] Respons API:", product);

        // Abaikan respons lama jika pengunjung berpindah halaman.
        if (window.location.hash !== hash) return;

        if (!product || typeof product !== "object") {
          throw new Error(
            `API tidak mengembalikan produk untuk ID ${productId}.`,
          );
        }

        // Mendukung format objek API maupun format data katalog.
        const normalizedProduct =
          typeof window.QEDEV_TOOLS.normalizeProduct === "function"
            ? window.QEDEV_TOOLS.normalizeProduct(product)
            : {
                ...product,
                id: product.id || product.ID_PRODUK || productId,
                title:
                  product.title || product.name || product.NAMA_PRODUK || "",
                description: product.description || product.DESKRIPSI || "",
                category: product.category || product.KATEGORI || "",
                thumbnail:
                  product.thumbnail ||
                  product.thumbnailUrl ||
                  product.THUMBNAIL_URL ||
                  "",
                youtubeUrl: product.youtubeUrl || product.tutorialUrl || "",
                tiktokUrl: product.tiktokUrl || "",
                downloadUrl: product.downloadUrl || "",
                affiliateUrl: product.affiliateUrl || "",
              };

        if (!normalizedProduct.title) {
          throw new Error("Nama produk tidak tersedia pada respons API.");
        }

        detailContainer.innerHTML =
          window.QEDEV_UI.renderProductDetail(normalizedProduct);

        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        if (window.location.hash !== hash) return;

        console.error("[DETAIL] Gagal memuat produk:", error);

        detailContainer.innerHTML = `
      <div class="container">
        <div class="empty-state">
          <h2>Detail produk belum dapat dimuat</h2>
          <p>${window.QEDEV_UI.escapeHTML(error.message)}</p>
          <a class="button secondary" href="#tools">
            Kembali ke katalog
          </a>
        </div>
      </div>
    `;
      }
    },

    /* =====================================
       UPDATE SITE IDENTITY
    ===================================== */

    updateSiteIdentity() {
      const config = window.QEDEV_CONFIG;

      if (!config) return;

      document.querySelectorAll("[data-site-name]").forEach((element) => {
        element.textContent = config.siteName;
      });

      document.querySelectorAll("[data-site-tagline]").forEach((element) => {
        element.textContent = config.tagline;
      });

      document
        .querySelectorAll("[data-site-description]")
        .forEach((element) => {
          element.textContent = config.description;
        });

      document.title = `${config.siteName} — ${config.tagline}`;

      const description = document.querySelector('meta[name="description"]');

      if (description) {
        description.setAttribute("content", config.description);
      }
    },

    /* =====================================
       UPDATE NAVIGATION
    ===================================== */

    updateNavigation() {
      const config = window.QEDEV_CONFIG;

      if (!config || !Array.isArray(config.navigation)) {
        return;
      }

      document
        .querySelectorAll("[data-site-navigation]")
        .forEach((container) => {
          container.innerHTML = config.navigation
            .map(
              (item) => `
              <a href="${this.escapeAttribute(item.href)}">
                ${this.escapeHTML(item.label)}
              </a>
            `,
            )
            .join("");
        });
    },

    /* =====================================
       UPDATE FOOTER
    ===================================== */

    updateFooter() {
      const config = window.QEDEV_CONFIG;

      if (!config) return;

      document.querySelectorAll("[data-footer-brand]").forEach((element) => {
        element.textContent = config.siteName;
      });

      const links = config.links || {};

      document.querySelectorAll("[data-social-link]").forEach((element) => {
        const key = element.dataset.socialLink;
        const url = links[key];

        if (url) {
          element.href = url;
          element.hidden = false;
        } else {
          element.hidden = true;
        }
      });
    },

    /* =====================================
       UPDATE TOOL COUNTERS
    ===================================== */

    updateToolCounters() {
      const total = window.QEDEV_TOOLS ? window.QEDEV_TOOLS.count() : 0;

      document.querySelectorAll("[data-tools-count]").forEach((element) => {
        element.textContent = String(total);
      });

      document.querySelectorAll("[data-category-count]").forEach((element) => {
        const category = element.dataset.categoryCount;

        const count = window.QEDEV_TOOLS
          ? window.QEDEV_TOOLS.countByCategory(category)
          : 0;

        element.textContent = String(count);
      });
    },

    /* =====================================
       INITIALIZE SEARCH
    ===================================== */

    initSearch() {
      if (!window.QEDEV_SEARCH) return;

      window.QEDEV_SEARCH.init();
    },

    /* =====================================
       MOBILE MENU
    ===================================== */

    initMobileMenu() {
      const toggle = document.querySelector("[data-mobile-menu-toggle]");

      const menu = document.querySelector("[data-mobile-menu]");

      if (!toggle || !menu) return;

      const closeMenu = () => {
        menu.hidden = true;

        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Buka menu");

        document.body.classList.remove("menu-open");
      };

      const openMenu = () => {
        menu.hidden = false;

        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Tutup menu");

        document.body.classList.add("menu-open");
      };

      toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";

        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      menu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      });

      closeMenu();
    },

    /* =====================================
       CURRENT YEAR
    ===================================== */

    initCurrentYear() {
      const year = new Date().getFullYear();

      document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = String(year);
      });
    },

    /* =====================================
       EXTERNAL LINKS
    ===================================== */

    initExternalLinks() {
      document.querySelectorAll('a[target="_blank"]').forEach((link) => {
        link.rel = "noopener noreferrer";
      });
    },

    /* =====================================
       HTML ESCAPE HELPERS
    ===================================== */

    escapeHTML(value) {
      return String(value ?? "").replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character],
      );
    },

    escapeAttribute(value) {
      return this.escapeHTML(value);
    },
  };

  /* =====================================
     START APPLICATION
  ===================================== */

  function startApp() {
    App.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    startApp();
  }

  window.QEDEV_APP = App;
})();
