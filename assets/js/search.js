/* =========================================
   QEDEVELOPER - SEARCH & FILTER
   Pencarian dan dropdown kategori katalog
========================================= */

(function () {
  "use strict";

  const SearchController = {
    state: {
      keyword: "",
      category: "semua",
    },

    elements: {},

    /* =====================================
       INITIALIZE
    ===================================== */

    async init() {
      this.elements.searchInput = document.querySelector("#tool-search");
      this.elements.searchForm = document.querySelector("#tool-search-form");

      this.elements.categorySelect = document.querySelector("#category-select");

      this.elements.toolsContainer = document.querySelector("#tools-grid");
      this.elements.resultCount = document.querySelector("#tools-result-count");

      if (!this.elements.toolsContainer) {
        return;
      }

      this.bindEvents();

      if (window.QEDEV_UI) {
        window.QEDEV_UI.renderLoading(
          this.elements.toolsContainer,
          "Memuat katalog aplikasi...",
        );
      }

      try {
        if (!window.QEDEV_API) {
          throw new Error("API QEDeveloper belum tersedia.");
        }

        await window.QEDEV_TOOLS.loadAll();

        this.render();
        this.updateCategorySelect();

        if (window.QEDEV_APP) {
          window.QEDEV_APP.updateToolCounters();
          await window.QEDEV_APP.renderRoute();
        }
      } catch (error) {
        console.error("[KATALOG] Gagal memuat produk dari API:", error);

        this.elements.toolsContainer.innerHTML = `
          <div class="empty-state">
            <h3>Katalog belum dapat dimuat</h3>
            <p>Periksa koneksi API lalu muat ulang halaman.</p>
            <button
              class="button secondary"
              type="button"
              data-retry-catalog
            >
              Coba Lagi
            </button>
          </div>
        `;

        this.elements.toolsContainer
          .querySelector("[data-retry-catalog]")
          ?.addEventListener("click", () => this.init());
      }
    },

    /* =====================================
       BIND EVENTS
    ===================================== */

    bindEvents() {
      const { searchInput, searchForm, categorySelect } = this.elements;

      if (searchForm) {
        searchForm.addEventListener("submit", (event) => {
          event.preventDefault();

          this.state.keyword = searchInput?.value.trim() || "";
          this.render();
        });
      }

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          this.state.keyword = searchInput.value.trim();
          this.render();
        });
      }

      if (categorySelect) {
        categorySelect.addEventListener("change", () => {
          this.state.category = categorySelect.value || "semua";
          this.render();
        });
      }
    },

    /* =====================================
       SYNC DROPDOWN CATEGORY
    ===================================== */

    updateCategorySelect() {
      const select = this.elements.categorySelect;

      if (!select) return;

      select.value = this.state.category;
    },

    /* =====================================
       GET FILTERED RESULTS
    ===================================== */

    getResults() {
      if (!window.QEDEV_TOOLS) {
        return [];
      }

      return window.QEDEV_TOOLS.filter({
        keyword: this.state.keyword,
        category: this.state.category,
      });
    },

    /* =====================================
       RENDER RESULTS
    ===================================== */

    render() {
      const container = this.elements.toolsContainer;

      if (!container || !window.QEDEV_UI) {
        return;
      }

      const results = this.getResults();

      window.QEDEV_UI.renderToolList(results, container);

      this.updateResultCount(results.length);
    },

    /* =====================================
       UPDATE RESULT COUNT
    ===================================== */

    updateResultCount(count) {
      const element = this.elements.resultCount;

      if (!element) return;

      const total = window.QEDEV_TOOLS ? window.QEDEV_TOOLS.count() : 0;

      if (!this.state.keyword && this.state.category === "semua") {
        element.textContent = `${total} aplikasi tersedia`;
        return;
      }

      element.textContent = `${count} aplikasi ditemukan`;
    },

    /* =====================================
       RESET SEARCH & FILTER
    ===================================== */

    reset() {
      this.state.keyword = "";
      this.state.category = "semua";

      if (this.elements.searchInput) {
        this.elements.searchInput.value = "";
      }

      this.updateCategorySelect();
      this.render();
    },
  };

  window.QEDEV_SEARCH = SearchController;
})();
