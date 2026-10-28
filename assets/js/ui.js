/* =========================================
   QEDEVELOPER - UI COMPONENTS
   Komponen tampilan yang dapat digunakan ulang
========================================= */

(function () {
  "use strict";

  const UI = {
    /* =====================================
       HTML ESCAPE
       Mencegah teks data ditafsirkan sebagai HTML
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

    /* =====================================
       GET CATEGORY LABEL
    ===================================== */

    getCategoryLabel(categoryId) {
      const config = window.QEDEV_CONFIG;

      const categories = config?.categories || [];

      const category = categories.find((item) => item.id === categoryId);

      return category ? category.name : "Lainnya";
    },

    /* =====================================
       GET CATEGORY ICON
    ===================================== */

    getCategoryIcon(categoryId) {
      const config = window.QEDEV_CONFIG;

      const categories = config?.categories || [];

      const category = categories.find((item) => item.id === categoryId);

      return category?.icon || "🧰";
    },

    /* =====================================
       RENDER TOOL CARD
    ===================================== */

    renderToolCard(tool) {
      if (!tool) return "";

      const title = this.escapeHTML(tool.title);
      const description = this.escapeHTML(tool.description);
      const category = this.escapeHTML(this.getCategoryLabel(tool.category));

      const tags = Array.isArray(tool.tags) ? tool.tags : [];

      const safeTags = tags
        .slice(0, 3)
        .map((tag) => `<span class="tag">${this.escapeHTML(tag)}</span>`)
        .join("");

      const thumbnail = String(tool.thumbnail || "").trim();

      const thumbnailContent = thumbnail
        ? `
          <img
            class="image-cover"
            src="${this.escapeHTML(thumbnail)}"
            alt="${this.escapeHTML(tool.thumbnailAlt || tool.title)}"
            loading="lazy"
            decoding="async"
          >
        `
        : `
          <div class="thumb-fallback">
            <span>${this.escapeHTML(this.getCategoryIcon(tool.category))}</span>
            <span class="thumbnail-label">${category}</span>
          </div>
        `;

      const featuredBadge = tool.featured
        ? `<span class="tag tag-featured">Unggulan</span>`
        : "";

      const status = this.escapeHTML(tool.status || "gratis");

      return `
        <article class="tool-card" data-tool-id="${this.escapeHTML(tool.id)}">

          <a
            class="tool-thumbnail"            
            href="pages/detail.html?id=${encodeURIComponent(tool.id)}"
            aria-label="Lihat detail ${title}"
          >
            ${thumbnailContent}
            ${featuredBadge}
          </a>

          <div class="tool-card-body">

            <div class="tool-meta">
              <span class="tag">${category}</span>
              <span class="status">${status}</span>
            </div>

            <h3>
              <a href="pages/detail.html?id=${encodeURIComponent(tool.id)}">
                ${title}
              </a>
            </h3>

            <p>${description}</p>

            <div class="tool-meta">
              ${safeTags}
            </div>

            <div class="tool-card-footer">
              <a
                class="button secondary block"
                href="pages/detail.html?id=${encodeURIComponent(tool.id)}"
              >
                Lihat Detail
              </a>
            </div>

          </div>
        </article>
      `;
    },

    /* =====================================
   RENDER PRODUCT DETAIL
===================================== */

    renderProductDetail(product) {
      if (!product) {
        return `
      <div class="container">
        <div class="empty-state">
          <h2>Produk tidak ditemukan</h2>
          <p>Produk mungkin belum tersedia.</p>
          <a class="button secondary" href="#tools">
            Kembali ke katalog
          </a>
        </div>
      </div>
    `;
      }

      const title = this.escapeHTML(product.title);
      const description = this.escapeHTML(product.description);
      const category = this.escapeHTML(this.getCategoryLabel(product.category));

      const thumbnail = String(product.thumbnail || "").trim();

      const thumbnailContent = thumbnail
        ? `
      <img
        class="product-detail-image"
        src="${this.escapeHTML(thumbnail)}"
        alt="${this.escapeHTML(product.thumbnailAlt || product.title)}"
      >
    `
        : `
      <div class="product-detail-placeholder">
        <span>${this.escapeHTML(this.getCategoryIcon(product.category))}</span>
        <p>${category}</p>
      </div>
    `;

      const links = [
        {
          label: "Tonton Tutorial YouTube",
          url: product.youtubeUrl || product.tutorialUrl,
        },
        {
          label: "Lihat Review TikTok",
          url: product.tiktokUrl,
        },
        {
          label: "Download Source Code / Template",
          url: product.downloadUrl,
        },
        {
          label: "Lihat Produk Affiliate",
          url: product.affiliateUrl,
        },
      ];

      const actions = links
        .filter((item) => this.isSafeExternalUrl(item.url))
        .map(
          (item) => `
        <a
          class="button secondary block"
          href="${this.escapeHTML(item.url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${this.escapeHTML(item.label)}
        </a>
      `,
        )
        .join("");

      return `
    <section class="product-detail-section">
      <div class="container">

        <a class="product-back-link" href="#tools">
          ← Kembali ke katalog
        </a>

        <article class="product-detail-card">

          <div class="product-detail-media">
            ${thumbnailContent}
          </div>

          <div class="product-detail-content">

            <span class="tag">${category}</span>

            <h1>${title}</h1>

            <p class="product-detail-description">
              ${description}
            </p>

            <div class="product-detail-actions">
              ${
                actions ||
                `<p class="product-no-links">
                  Link tutorial dan download akan tersedia segera.
                </p>`
              }
            </div>

          </div>
        </article>

      </div>
    </section>
  `;
    },

    /* =====================================
   VALIDATE EXTERNAL URL
===================================== */

    isSafeExternalUrl(value) {
      try {
        const url = new URL(String(value || ""));

        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },

    /* =====================================
       RENDER TOOL LIST
    ===================================== */

    renderToolList(tools, container) {
      if (!container) return;

      if (!Array.isArray(tools) || tools.length === 0) {
        this.renderEmptyState(container);
        return;
      }

      container.innerHTML = tools
        .map((tool) => this.renderToolCard(tool))
        .join("");
    },

    /* =====================================
       EMPTY STATE
    ===================================== */

    renderEmptyState(container) {
      if (!container) return;

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">🔎</div>
          <h3>Tools belum ditemukan</h3>
          <p>
            Coba kata kunci lain atau pilih kategori yang berbeda.
          </p>
        </div>
      `;
    },

    /* =====================================
       LOADING STATE
    ===================================== */

    renderLoading(container, message = "Memuat data tools...") {
      if (!container) return;

      container.innerHTML = `
        <div class="loading-card" role="status" aria-live="polite">
          <p>${this.escapeHTML(message)}</p>
        </div>
      `;
    },
  };

  window.QEDEV_UI = UI;
})();
