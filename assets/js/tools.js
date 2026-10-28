/* =========================================
   QEDEVELOPER - TOOLS SERVICE
   Pengolahan data katalog tools
========================================= */

/* =========================================
   QEDEVELOPER - TOOLS SERVICE
   Pengolahan data katalog dari API
========================================= */

(function () {
  "use strict";

  const ToolsService = {
    // Data katalog yang sedang digunakan frontend.
    cache: [],

    // Status pengambilan data dari API.
    loading: false,
    loaded: false,
    error: null,

    /* =====================================
       NORMALIZE API PRODUCT
       Menyesuaikan respons API dengan UI lama
    ===================================== */

    normalizeProduct(product) {
      if (!product) return null;

      return {
        ...product,

        // ID dari Spreadsheet menjadi ID utama.
        id: String(product.id || product.ID_PRODUK || "").trim(),

        title: product.name || product.NAMA_PRODUK || product.title || "",

        description: product.description || product.DESKRIPSI || "",

        category: product.category || product.KATEGORI || "",

        thumbnail:
          product.thumbnailUrl ||
          product.THUMBNAIL_URL ||
          product.thumbnail ||
          "",

        tutorialUrl: product.youtubeUrl || product.YOUTUBE_URL || "",

        youtubeUrl: product.youtubeUrl || product.YOUTUBE_URL || "",

        tiktokUrl: product.tiktokUrl || product.TIKTOK_URL || "",

        downloadUrl: product.downloadUrl || product.DOWNLOAD_URL || "",

        affiliateUrl: product.affiliateUrl || product.AFFILIATE_URL || "",
      };
    },

    /* =====================================
       LOAD DATA FROM API
    ===================================== */

    async loadAll(options = {}) {
      if (!window.QEDEV_API) {
        this.error = "QEDEV_API belum tersedia.";
        throw new Error(this.error);
      }

      this.loading = true;
      this.error = null;

      try {
        const data = await window.QEDEV_API.getProducts(options);

        if (!Array.isArray(data)) {
          throw new Error("Format data produk dari API tidak valid.");
        }

        this.cache = data.map((product) => this.normalizeProduct(product));

        this.loaded = true;

        return this.getAll();
      } catch (error) {
        this.error = error.message || "Gagal mengambil data produk.";
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /* =====================================
       GET ALL TOOLS
    ===================================== */

    getAll() {
      if (this.loaded) {
        return [...this.cache];
      }

      const data = window.QEDEV_DATA;

      if (!data || !Array.isArray(data.tools)) {
        return [];
      }

      return [...data.tools];
    },

    /* =====================================
       GET TOOL BY ID
    ===================================== */

    getById(id) {
      if (!id) return null;

      return this.getAll().find((tool) => tool.id === id) || null;
    },

    /* =====================================
       GET FEATURED TOOLS
    ===================================== */

    getFeatured() {
      return this.getAll().filter((tool) => tool.featured === true);
    },

    /* =====================================
       GET TOOLS BY CATEGORY
    ===================================== */

    getByCategory(category) {
      if (!category || category === "semua") {
        return this.getAll();
      }

      return this.getAll().filter((tool) => tool.category === category);
    },

    /* =====================================
       SEARCH TOOLS
    ===================================== */

    search(keyword) {
      return this.filter({ keyword });
    },

    /* =====================================
       FILTER TOOLS
    ===================================== */

    filter(options = {}) {
      const {
        category = "semua",
        keyword = "",
        featured = false,
        type = "",
      } = options;

      let results = this.getAll();

      if (category && category !== "semua") {
        results = results.filter((tool) => tool.category === category);
      }

      if (type) {
        results = results.filter(
          (tool) =>
            String(tool.productType || tool.type || "").toLowerCase() ===
            String(type).toLowerCase(),
        );
      }

      if (featured) {
        results = results.filter((tool) => tool.featured === true);
      }

      const query = String(keyword || "")
        .trim()
        .toLocaleLowerCase("id-ID");

      if (query) {
        results = results.filter((tool) => {
          const text = [
            tool.title,
            tool.description,
            tool.category,
            ...(Array.isArray(tool.tags) ? tool.tags : []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("id-ID");

          return text.includes(query);
        });
      }

      return results;
    },

    /* =====================================
       COUNT TOOLS
    ===================================== */

    count() {
      return this.getAll().length;
    },

    /* =====================================
       COUNT BY CATEGORY
    ===================================== */

    countByCategory(category) {
      return this.getByCategory(category).length;
    },

    /* =====================================
       GET CATEGORIES
    ===================================== */

    getCategories() {
      const config = window.QEDEV_CONFIG;

      if (!config || !Array.isArray(config.categories)) {
        return [];
      }

      return config.categories.map((category) => ({
        ...category,
        total: this.countByCategory(category.id),
      }));
    },
  };

  window.QEDEV_TOOLS = ToolsService;
})();
