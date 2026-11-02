/* =========================================
   QEDEVELOPER - PRODUCT DETAIL PAGE
   Detail produk + Dynamic Source Preview
========================================= */

(function () {
  "use strict";

  const DetailPage = {
    elements: {},
    sourceFiles: [],
    activeFileIndex: 0,

    init() {
      this.elements.container = document.querySelector(
        "#product-detail-content",
      );

      this.elements.year = document.querySelector("#current-year");

      if (this.elements.year) {
        this.elements.year.textContent = String(new Date().getFullYear());
      }

      if (!this.elements.container) {
        console.error(
          '[DETAIL PAGE] Elemen "#product-detail-content" tidak ditemukan.',
        );
        return;
      }

      this.loadProduct();
    },

    getProductId() {
      const params = new URLSearchParams(window.location.search);
      return String(params.get("id") || "").trim();
    },

    async loadProduct() {
      const id = this.getProductId();

      if (!id) {
        this.renderError(
          "ID produk belum tersedia",
          "Silakan buka detail produk melalui katalog QedStack.",
        );
        return;
      }

      if (!window.QEDEV_API) {
        this.renderError(
          "API belum tersedia",
          "Pastikan file api.js berhasil dimuat.",
        );
        return;
      }

      this.renderLoading();

      try {
        const product = await window.QEDEV_API.getProduct(id);

        if (this.getProductId() !== id) return;

        if (!product || typeof product !== "object") {
          throw new Error("Data produk tidak ditemukan.");
        }

        this.renderProduct(product);
      } catch (error) {
        if (this.getProductId() !== id) return;

        console.error("[DETAIL PAGE] Gagal memuat produk:", error);

        this.renderError(
          "Detail produk belum dapat dimuat",
          error.message || "Terjadi kesalahan saat mengambil data produk.",
        );
      } finally {
        if (this.getProductId() === id) {
          this.elements.container.setAttribute("aria-busy", "false");
        }
      }
    },

    async proofBlobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(reader.result || "");
          resolve(result);
        };

        reader.onerror = () => {
          reject(new Error("Gagal membaca hasil kompresi foto."));
        };

        reader.readAsDataURL(blob);
      });
    },

    renderAccessRequestForm(accessConfig = {}) {
      const message = document.querySelector("#source-preview-message");
      const layout = document.querySelector("#source-preview-layout");

      if (!message) return;

      if (layout) layout.hidden = true;

      const amount = Number(accessConfig.donationAmount || 0).toLocaleString(
        "id-ID",
      );

      const qrisImageUrl = String(
        accessConfig.qrisImageUrl || "../assets/images/qris-qedstack.png",
      ).trim();

      message.hidden = false;

      message.innerHTML = `
    <div class="source-access-locked">

      <strong>🔐 Ajukan Akses Source Code</strong>

      <p>
       Untuk mendapatkan kode aktivasi, silakan isi
        data berikut dan unggah bukti pembayaran.
      </p>

      <div class="access-donation-card">

        <strong>🎁 Donasi Akses</strong>

        <p>
          Dapatkan kode aktivasi dengan donasi sebesar:
        </p>

        <div class="access-donation-amount">
          Rp${amount}
        </div>

        <div class="access-qris-section">

          <strong>Scan QRIS QedStack</strong>

          ${
            qrisImageUrl
              ? `
                <img
                  src="${qrisImageUrl}"
                  alt="QRIS Pembayaran QedStack"
                  class="access-qris-image"
                >
              `
              : `
                <div class="access-qris-placeholder">
                  QRIS belum dikonfigurasi.
                </div>
              `
          }

          <p>
            Scan menggunakan DANA, GoPay, OVO,
            atau Mobile Banking yang mendukung QRIS.
          </p>

        </div>

        <p class="access-donation-validity">
          🗓️ Masa akses: <strong>15 hari</strong>
        </p>

      </div>

      <form id="access-request-form">

        <label for="access-request-name">Nama Lengkap</label>
        <input
          type="text"
          id="access-request-name"
          required
          maxlength="100"
          placeholder="Masukkan nama lengkap"
        >

        <label for="access-request-whatsapp">Nomor WhatsApp</label>
        <input
          type="tel"
          id="access-request-whatsapp"
          required
          maxlength="20"
          placeholder="Contoh: 081234567890"
        >

        <label for="access-request-email">Email (Opsional)</label>
        <input
          type="email"
          id="access-request-email"
          placeholder="Masukkan email"
        >

        <label for="access-request-proof">Bukti Pembayaran</label>
        <input
          type="file"
          id="access-request-proof"
          accept="image/jpeg,image/png,image/webp"
          required
        >

        <div id="access-proof-preview" hidden>
          <img
            id="access-proof-image"
            alt="Pratinjau bukti transfer"
            style="max-width:100%;max-height:240px;object-fit:contain;"
          >

          <p id="access-proof-size"></p>
        </div>

        <button type="submit" id="access-request-submit">
          Kirim Permintaan Akses
        </button>

      </form>

      <p id="access-request-status" role="status"></p>

    </div>
  `;

      const form = document.querySelector("#access-request-form");
      const fileInput = document.querySelector("#access-request-proof");
      const preview = document.querySelector("#access-proof-preview");
      const previewImage = document.querySelector("#access-proof-image");
      const sizeInfo = document.querySelector("#access-proof-size");
      const button = document.querySelector("#access-request-submit");
      const status = document.querySelector("#access-request-status");

      let compressedProof = null;
      let previewUrl = "";

      const formatKB = (bytes) => {
        return (bytes / 1024).toFixed(1) + " KB";
      };

      fileInput.addEventListener("change", async () => {
        compressedProof = null;
        preview.hidden = true;
        status.textContent = "";

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewUrl = "";
        }

        const file = fileInput.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
          status.textContent = "Pilih file gambar yang valid.";
          fileInput.value = "";
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          status.textContent = "Ukuran foto asli maksimal 20 MB.";
          fileInput.value = "";
          return;
        }

        status.textContent = "Mengompres foto...";

        try {
          compressedProof = await this.compressProofImage(file);

          previewUrl = URL.createObjectURL(compressedProof.blob);
          previewImage.src = previewUrl;

          preview.hidden = false;

          sizeInfo.textContent =
            "Ukuran asli: " +
            formatKB(file.size) +
            " | Setelah kompresi: " +
            formatKB(compressedProof.compressedSize);

          if (compressedProof.compressedSize < 100 * 1024) {
            status.textContent = "Foto berhasil dikompres di bawah 100 KB.";
          } else {
            status.textContent =
              "Foto berhasil dikompres, tetapi masih di atas 100 KB.";
          }
        } catch (error) {
          console.error("[PROOF COMPRESSION]", error);
          status.textContent = error.message;
          fileInput.value = "";
        }
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!compressedProof) {
          status.textContent = "Silakan pilih bukti transfer terlebih dahulu.";
          return;
        }

        button.disabled = true;
        button.textContent = "Mengirim...";
        status.textContent = "Sedang mengirim permintaan akses...";

        try {
          const productId = this.getProductId();

          const base64 = await this.proofBlobToBase64(compressedProof.blob);

          const result = await window.QEDEV_API.createAccessRequest({
            productId,
            name: document.querySelector("#access-request-name").value.trim(),
            whatsapp: document
              .querySelector("#access-request-whatsapp")
              .value.trim(),
            email: document.querySelector("#access-request-email").value.trim(),

            proof: {
              fileName: compressedProof.fileName,
              mimeType: compressedProof.mimeType,
              base64,
            },
          });

          form.hidden = true;

          status.textContent =
            result.message ||
            "Permintaan akses berhasil dikirim. Silakan menunggu verifikasi admin.";
        } catch (error) {
          console.error("[ACCESS REQUEST]", error);

          status.textContent =
            error.message || "Permintaan gagal dikirim. Silakan coba kembali.";

          button.disabled = false;
          button.textContent = "Kirim Permintaan Akses";
        }
      });
    },

    renderLoading() {
      this.elements.container.setAttribute("aria-busy", "true");

      this.elements.container.innerHTML = `
        <div class="detail-loading loading-card"
             role="status"
             aria-live="polite">
          <p>Memuat detail produk...</p>
        </div>
      `;
    },

    renderProduct(product) {
      const name = product.name || product.NAMA_PRODUK || "Produk QedStack";

      const type = String(product.type || product.JENIS || "").trim();

      const category = String(
        product.category || product.KATEGORI || "",
      ).trim();

      const description =
        product.description ||
        product.DESKRIPSI ||
        "Belum ada deskripsi untuk produk ini.";

      const thumbnail =
        product.thumbnailUrl ||
        product.thumbnail ||
        product.THUMBNAIL_URL ||
        "";

      const youtubeUrl = product.youtubeUrl || product.YOUTUBE_URL || "";

      const tiktokUrl = product.tiktokUrl || product.TIKTOK_URL || "";

      const downloadUrl = product.downloadUrl || product.DOWNLOAD_URL || "";

      const affiliateUrl = product.affiliateUrl || product.AFFILIATE_URL || "";

      /*
       * Mendukung nama field yang akan ditambahkan ke API.
       * URL harus menunjuk ke TXT yang bisa dibaca dengan fetch().
       */
      const sourceCodeUrl =
        product.sourceCodeUrl ||
        product.SOURCE_CODE_URL ||
        product.previewUrl ||
        product.PREVIEW_URL ||
        product.sourceUrl ||
        product.SOURCE_URL ||
        "";

      const accessType = String(product.accessType || "GRATIS")
        .trim()
        .toUpperCase();

      const donationAmount = Number(product.donationAmount || 0);
      const validityDays = Number(product.validityDays || 15);

      const accessLabel =
        accessType === "DONASI" ? "AKSES DONASI" : "AKSES GRATIS";

      const safeName = this.escapeHTML(name);
      const safeType = this.escapeHTML(type);
      const safeCategory = this.escapeHTML(category);

      // Deskripsi lengkap dengan format HTML
      const descriptionHTML = this.formatProductDescription(description);

      // Ringkasan singkat di bawah judul produk
      const descriptionPlain = String(description)
        .replace(/#{1,3}\s*/g, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/(?:^|\n)\s*[-•]\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const descriptionSummary = this.escapeHTML(
        descriptionPlain.length > 180
          ? descriptionPlain.slice(0, 180) + "..."
          : descriptionPlain,
      );

      const thumbnailHTML = this.isValidHttpUrl(thumbnail)
        ? `
          <div class="product-detail-thumbnail">
            <img
              src="${this.escapeAttribute(thumbnail)}"
              alt="Preview ${safeName}"
              loading="lazy"
              decoding="async"
            >
          </div>
        `
        : `
          <div class="product-detail-thumbnail product-detail-thumbnail-empty">
            <span class="detail-preview-icon" aria-hidden="true">🧰</span>
            <p>Preview aplikasi belum tersedia</p>
          </div>
        `;

      const actionLink = (url, label, className = "product-detail-link") => {
        if (!this.isValidHttpUrl(url)) return "";

        return `
          <a
            class="${className}"
            href="${this.escapeAttribute(url)}"
            target="_blank"
            rel="noopener noreferrer"
          >${this.escapeHTML(label)}</a>
        `;
      };

      const tutorialLinks = [
        actionLink(youtubeUrl, "▶ Tonton Tutorial YouTube"),
        actionLink(tiktokUrl, "♪ Lihat Tutorial TikTok"),
      ]
        .filter(Boolean)
        .join("");

      const resourceLinks = [
        actionLink(
          downloadUrl,
          "↓ Download Source Code (.txt)",
          "button primary",
        ),
        actionLink(
          affiliateUrl,
          "Lihat Produk Rekomendasi",
          "button secondary",
        ),
      ]
        .filter(Boolean)
        .join("");

      this.elements.container.innerHTML = `
        <article class="product-detail">

          <div class="product-detail-meta">
            ${safeCategory ? `<span class="tag">${safeCategory}</span>` : ""}
            ${safeType ? `<span class="tag">${safeType}</span>` : ""}
           
            <span class="status">${accessLabel}</span>
          </div>

          <h1 class="product-detail-title">${safeName}</h1>

          <p class="product-detail-description">
            ${descriptionSummary}
          </p>

          <div class="product-detail-section">
            ${thumbnailHTML}
          </div>

          <section class="source-preview" id="source-preview" hidden>
            <h2 class="source-preview-heading">
              Struktur Source Code
            </h2>

            <p class="source-preview-description">
              Seluruh kode disimpan dalam satu file TXT.
              Pilih nama file untuk membaca dan menyalin kodenya.
            </p>

            <div
              class="source-preview-message"
              id="source-preview-message"
              role="status"
              aria-live="polite"
            >
              Memuat source code...
            </div>

            <div class="source-preview-layout" id="source-preview-layout" hidden>
              <nav
                class="source-file-list"
                id="source-file-list"
                aria-label="Daftar file source code"
              ></nav>

              <div class="source-code-panel">
                <div class="source-code-toolbar">
                  <div>
                    <div
                      class="source-code-filename"
                      id="source-code-filename"
                    ></div>
                    <span
                      class="source-code-language"
                      id="source-code-language"
                    ></span>
                  </div>

                  <button
                    class="source-copy-button"
                    id="source-copy-button"
                    type="button"
                  >
                    Salin Kode
                  </button>
                </div>

                <pre class="source-code-content"><code id="source-code-content"></code></pre>
              </div>
            </div>
          </section>

          <section class="product-detail-section product-description-section">
            <h2>Tentang Produk</h2>

            <div class="product-description-content">
              ${descriptionHTML}
            </div>
          </section>

          <section class="product-detail-section">
            <h2>Video Tutorial</h2>
            ${
              tutorialLinks
                ? `<div class="product-detail-actions">${tutorialLinks}</div>`
                : `<p>Video tutorial belum tersedia.</p>`
            }
          </section>

          <section class="product-detail-section">
         
          
            ${this.renderAffiliateSection()}

          </section>

          <div class="product-detail-actions">
            <a
              class="button secondary"
              href="../index.html#tools"
            >
              ← Kembali ke Katalog
            </a>
          </div>

        </article>
      `;

      this.elements.container.removeAttribute("aria-busy");
      console.log(
        "[DETAIL LOADING CHECK]",
        this.elements.container.getAttribute("aria-busy"),
        getComputedStyle(this.elements.container).cursor,
      );

      // =======================================
      // SEO DINAMIS HALAMAN DETAIL PRODUK
      // =======================================

      const seoTitle = `${name} — QedStack`;

      const seoDescription = String(description)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);

      const canonicalUrl = new URL(
        "/pages/detail.html",
        window.location.origin,
      );

      canonicalUrl.searchParams.set(
        "id",
        product.id || product.ID_PRODUK || "",
      );

      const seoUrl = canonicalUrl.href;

      // Update document title
      document.title = seoTitle;

      // Helper untuk membuat atau memperbarui metadata
      const setMeta = (selector, attribute, value) => {
        let element = document.querySelector(selector);

        if (!element) {
          element = document.createElement("meta");

          const match = selector.match(/\[(?:name|property)="([^"]+)"\]/);

          if (!match) return;

          const attributeName = selector.includes("[property=")
            ? "property"
            : "name";

          element.setAttribute(attributeName, match[1]);
          document.head.appendChild(element);
        }

        element.setAttribute("content", value);
      };

      // Meta description
      setMeta('meta[name="description"]', "name", seoDescription);

      // Open Graph
      setMeta('meta[property="og:type"]', "property", "product");
      setMeta('meta[property="og:site_name"]', "property", "QEDeveloper");
      setMeta('meta[property="og:title"]', "property", seoTitle);
      setMeta('meta[property="og:description"]', "property", seoDescription);
      setMeta('meta[property="og:url"]', "property", seoUrl);

      // Twitter Card
      setMeta('meta[name="twitter:card"]', "name", "summary_large_image");

      setMeta('meta[name="twitter:title"]', "name", seoTitle);

      setMeta('meta[name="twitter:description"]', "name", seoDescription);

      // Thumbnail produk sebagai gambar preview
      if (this.isValidHttpUrl(thumbnail)) {
        setMeta('meta[property="og:image"]', "property", thumbnail);

        setMeta('meta[name="twitter:image"]', "name", thumbnail);

        setMeta('meta[property="og:image:alt"]', "property", `Preview ${name}`);
      }

      setMeta('meta[name="twitter:title"]', "name", seoTitle);

      setMeta('meta[name="twitter:description"]', "name", seoDescription);

      // Canonical URL
      let canonicalLink = document.querySelector('link[rel="canonical"]');

      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalLink);
      }

      canonicalLink.setAttribute("href", seoUrl);

      this.currentSourceCodeUrl = sourceCodeUrl;

      this.initSourcePreview(sourceCodeUrl, {
        accessType: accessType,
        donationAmount: donationAmount,
        validityDays: validityDays,
      });
      this.loadAffiliateProducts(product.id || product.ID_PRODUK || "");
    },

    /* =========================================
   FORMAT DESKRIPSI PRODUK
   Markdown sederhana menjadi HTML aman
========================================= */

    formatProductDescription(description) {
      let source = String(description || "")
        .replace(/\r\n?/g, "\n")
        .trim();

      if (!source) {
        return "<p>Belum ada deskripsi untuk produk ini.</p>";
      }

      // Membantu mengenali heading/list jika teks
      // dari Spreadsheet tidak memiliki line break.
      source = source
        .replace(/\s+(?=#{1,3}\s)/g, "\n")
        .replace(/\s+(?=-\s|•\s)/g, "\n");

      const lines = source.split("\n");
      const output = [];

      let paragraph = [];
      let inList = false;

      const formatInline = (text) => {
        return this.escapeHTML(text)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/`([^`]+)`/g, "<code>$1</code>");
      };

      const flushParagraph = () => {
        if (!paragraph.length) return;

        output.push(`<p>${formatInline(paragraph.join(" "))}</p>`);

        paragraph = [];
      };

      const closeList = () => {
        if (!inList) return;

        output.push("</ul>");
        inList = false;
      };

      lines.forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
          flushParagraph();
          closeList();
          return;
        }

        // Heading Markdown
        const heading = line.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
          flushParagraph();
          closeList();

          const level = heading[1].length + 1;
          const content = formatInline(heading[2]);

          output.push(`<h${level}>${content}</h${level}>`);
          return;
        }

        // Bullet list
        const listItem = line.match(/^(?:[-*•]\s+|✅\s*)(.+)$/);

        if (listItem) {
          flushParagraph();

          if (!inList) {
            output.push('<ul class="product-description-list">');
            inList = true;
          }

          output.push(`<li>${formatInline(listItem[1])}</li>`);
          return;
        }

        // Paragraf biasa
        closeList();
        paragraph.push(line);
      });

      flushParagraph();
      closeList();

      return output.join("\n");
    },

    /* =====================================
       AFFILIATE PRODUCTS
    ===================================== */

    renderAffiliateSection() {
      return `
        <section
          class="product-detail-section affiliate-section"
          id="affiliate-section"
        >
          <h2>Produk Rekomendasi</h2>

          <p class="affiliate-description">
            Produk pilihan yang mungkin membantu pekerjaanmu.
          </p>

          <div
            class="affiliate-products-list"
            id="affiliate-products-list"
            aria-live="polite"
          >
            <p>Memuat produk rekomendasi...</p>
          </div>
        </section>
      `;
    },

    async loadAffiliateProducts(productId) {
      const container = document.querySelector("#affiliate-products-list");

      if (!container) return;

      if (!productId) {
        container.textContent = "ID produk tidak tersedia.";
        return;
      }

      if (
        !window.QEDEV_API ||
        typeof window.QEDEV_API.getAffiliateProducts !== "function"
      ) {
        container.textContent = "Layanan produk rekomendasi belum tersedia.";
        return;
      }

      container.textContent = "Memuat produk rekomendasi...";

      // Format harga ke Rupiah.
      const formatAffiliatePrice = (price) => {
        const value = String(price ?? "").trim();

        if (!value) return "";

        // Mendukung angka 150000 maupun teks 150.000.
        const normalized = value.replace(/[^\d,-]/g, "").replace(",", ".");
        const amount = Number(normalized);

        if (!Number.isFinite(amount) || amount < 0) {
          return "";
        }

        return `Rp${new Intl.NumberFormat("id-ID", {
          maximumFractionDigits: 0,
        }).format(amount)}`;
      };

      try {
        const products = await window.QEDEV_API.getAffiliateProducts(productId);

        if (!Array.isArray(products)) {
          throw new Error("Format data affiliate tidak valid.");
        }

        const activeProducts = products.filter((product) => {
          return (
            product &&
            String(product.productId || "").trim() ===
              String(productId).trim() &&
            String(product.status || "")
              .trim()
              .toUpperCase() === "AKTIF" &&
            this.isValidAffiliateUrl(product.affiliateUrl)
          );
        });

        if (!activeProducts.length) {
          container.innerHTML = "";

          const section = document.querySelector("#affiliate-section");
          if (section) section.hidden = true;

          return;
        }

        const section = document.querySelector("#affiliate-section");
        if (section) section.hidden = false;

        container.innerHTML = activeProducts
          .map((product) => {
            const name = this.escapeHTML(product.name || "Produk Rekomendasi");

            const description = this.escapeHTML(
              product.description || "Lihat detail produk di Shopee.",
            );

            const price = formatAffiliatePrice(product.price);

            const priceHTML = price
              ? `<p class="affiliate-price">${this.escapeHTML(price)}</p>`
              : "";

            const affiliateUrl = this.escapeAttribute(product.affiliateUrl);
            const imageUrl = this.getAffiliateImageUrl(product.thumbnailUrl);

            const imageHTML = imageUrl
              ? `
            <div class="affiliate-image">
              <img
                src="${this.escapeAttribute(imageUrl)}"
                alt="${name}"
                loading="lazy"
                decoding="async"
                onerror="this.closest('.affiliate-image').innerHTML='<span aria-hidden=&quot;true&quot;>🛍️</span>'"
              >
            </div>
          `
              : `
            <div class="affiliate-image" aria-hidden="true">
              <span>🛍️</span>
            </div>
          `;

            return `
          <article class="affiliate-card">
            ${imageHTML}

            <div class="affiliate-content">
              <span class="affiliate-badge">Shopee</span>

              <h3>${name}</h3>
              ${priceHTML}
              <p>${description}</p>

              <div class="affiliate-actions">
                
                <a
                  class="affiliate-button"
                  href="${affiliateUrl}"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  <svg
                    class="affiliate-cart-icon"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>

                  <span>Lihat Produk</span>
                  <span aria-hidden="true">↗</span>
                </a>


                <a
                  class="affiliate-button affiliate-button-whatsapp"
                  href="https://api.whatsapp.com/send?text=${encodeURIComponent(product.affiliateUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    class="whatsapp-icon"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M20.52 3.48A11.82 11.82 0 0 0 12.05 0C5.46 0 .1 5.36.1 11.95c0 2.1.55 4.15 1.6 5.96L0 24l6.24-1.64a11.9 11.9 0 0 0 5.8 1.5h.01C18.64 23.86 24 18.5 24 11.91a11.82 11.82 0 0 0-3.48-8.43ZM12.05 21.83a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.7.97.99-3.61-.24-.37a9.86 9.86 0 0 1-1.51-5.28c0-5.46 4.45-9.91 9.92-9.91a9.85 9.85 0 0 1 7.02 2.91 9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.92 9.92Zm5.44-7.43c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.17.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.27.3-1.05 1.02-1.05 2.49s1.08 2.88 1.23 3.08c.15.2 2.12 3.24 5.14 4.55.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/>
                  </svg>
                  Bagikan via WhatsApp
                </a>
              </div>
            </div>
          </article>
        `;
          })
          .join("");
      } catch (error) {
        console.error("[AFFILIATE] Gagal memuat produk:", error);

        container.textContent =
          "Produk rekomendasi belum dapat dimuat. Silakan coba lagi nanti.";
      }
    },

    isValidAffiliateUrl(value) {
      try {
        const url = new URL(String(value || "").trim());

        return (
          url.protocol === "https:" &&
          (url.hostname === "s.shopee.co.id" ||
            url.hostname === "shopee.co.id" ||
            url.hostname.endsWith(".shopee.co.id") ||
            url.hostname === "shopee.com" ||
            url.hostname.endsWith(".shopee.com"))
        );
      } catch {
        return false;
      }
    },

    getAffiliateImageUrl(value) {
      const rawUrl = String(value || "").trim();

      if (!rawUrl) return "";

      try {
        const url = new URL(rawUrl);

        if (url.protocol !== "https:") return "";

        const isDriveThumbnail =
          url.hostname === "drive.google.com" &&
          url.pathname === "/thumbnail" &&
          Boolean(url.searchParams.get("id"));

        const isPublicImage = /\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(rawUrl);

        if (isDriveThumbnail || isPublicImage) {
          return rawUrl;
        }

        // Dukungan URL Google Drive format /file/d/ID/view
        if (url.hostname === "drive.google.com") {
          const match = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);

          const fileId = match?.[1] || url.searchParams.get("id") || "";

          if (fileId) {
            return (
              "https://drive.google.com/thumbnail?id=" +
              encodeURIComponent(fileId) +
              "&sz=w800"
            );
          }
        }

        return "";
      } catch (error) {
        return "";
      }
    },

    async initSourcePreview(sourceCodeUrl, accessConfig = {}) {
      const section = document.querySelector("#source-preview");
      const message = document.querySelector("#source-preview-message");
      const layout = document.querySelector("#source-preview-layout");

      if (!section || !message) return;

      if (!this.isValidHttpUrl(sourceCodeUrl)) return;

      section.hidden = false;
      message.hidden = false;

      const productId = this.getProductId();
      const isDonation = accessConfig.accessType === "DONASI";

      // Periksa token perangkat yang tersimpan.
      const token = isDonation
        ? window.QEDEV_API.getAccessToken(productId)
        : "";

      // Produk DONASI tanpa token menampilkan card akses.
      if (isDonation && !token) {
        this.renderAccessEntry(accessConfig);
        return;
      }
      message.textContent = "Memuat source code...";

      try {
        if (
          !window.QEDEV_API ||
          typeof window.QEDEV_API.getSourceCode !== "function"
        ) {
          throw new Error("Method API source code belum tersedia.");
        }

        const result = await window.QEDEV_API.getSourceCode(productId);
        const sourceText = result && result.content;

        if (typeof sourceText !== "string" || !sourceText.trim()) {
          throw new Error("Isi source code tidak ditemukan.");
        }

        this.sourceFiles = this.parseSourceText(sourceText);
        this.activeFileIndex = 0;

        if (!this.sourceFiles.length) {
          throw new Error("Penanda nama file tidak ditemukan dalam TXT.");
        }

        this.renderSourceFiles();

        if (layout) layout.hidden = false;

        // Tampilkan informasi status akses.
        if (isDonation) {
          let expiredAt = "";

          try {
            const savedMeta = localStorage.getItem(
              "qedev_access_meta_" + productId,
            );

            if (savedMeta) {
              const meta = JSON.parse(savedMeta);
              expiredAt = meta.expiredAt || "";
            }
          } catch (error) {
            console.warn("[ACCESS META] Gagal membaca informasi akses:", error);
          }

          let accessInfo = `
    <div class="source-access-status">
      <strong>🟢 AKSES AKTIF</strong>
      <p>Perangkat ini berhasil diaktivasi.</p>
  `;

          if (expiredAt) {
            const expiryDate = new Date(expiredAt);

            if (!isNaN(expiryDate.getTime())) {
              const formattedDate = expiryDate.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              const remaining = Math.max(
                0,
                Math.ceil((expiryDate.getTime() - Date.now()) / 86400000),
              );

              accessInfo += `
        <p>Berlaku sampai: <strong>${formattedDate}</strong></p>
        <p>Sisa masa akses: <strong>${remaining} hari</strong></p>
      `;
            }
          } else {
            accessInfo += `
      <p>Tanggal kedaluwarsa belum tersedia.</p>
    `;
          }

          accessInfo += `</div>`;

          message.innerHTML = accessInfo;
          message.hidden = false;
        } else {
          message.hidden = true;
        }
      } catch (error) {
        console.error("[SOURCE PREVIEW]", error);

        if (layout) layout.hidden = true;

        if (isDonation) {
          // Token yang ditolak backend tidak boleh terus digunakan.
          window.QEDEV_API.clearAccessToken(productId);

          try {
            localStorage.removeItem("qedev_access_meta_" + productId);
          } catch (storageError) {
            console.warn(
              "[ACCESS META] Gagal menghapus informasi akses:",
              storageError,
            );
          }

          this.renderActivationForm(
            accessConfig,
            "Token tidak valid atau masa akses telah berakhir. Silakan masukkan kode akses kembali.",
          );

          return;
        }

        message.hidden = false;
        message.textContent =
          "Preview belum dapat dimuat. " +
          (error.message || "Periksa URL dan akses file TXT.") +
          " Tombol download tetap dapat digunakan jika tersedia.";
      }
    },

    renderActivationForm(accessConfig = {}, errorMessage = "") {
      const message = document.querySelector("#source-preview-message");
      const layout = document.querySelector("#source-preview-layout");

      if (!message) return;

      if (layout) layout.hidden = true;

      const amount = Number(accessConfig.donationAmount || 0).toLocaleString(
        "id-ID",
      );

      const validity = Number(accessConfig.validityDays || 15);

      message.hidden = false;

      message.innerHTML = `
    <div class="source-access-locked">
      <strong>🔒 Aktivasi Source Code</strong>

      <p>
        Produk ini memerlukan kode aktivasi
        untuk membuka source code.
      </p>

      <div class="access-donation-card">
        <strong>🎁 Donasi Akses</strong>

        <p>
          Dapatkan kode aktivasi dengan donasi sebesar:
        </p>

        <div class="access-donation-amount">
          Rp${amount}
        </div>

        <div class="access-qris-section">
          <strong>Scan QRIS QedStack</strong>

          <img
            src="${accessConfig.qrisImageUrl || ""}"
            alt="QRIS Pembayaran QedStack"
            class="access-qris-image"
          >

          <p>
            Scan menggunakan DANA, GoPay, OVO,
            atau Mobile Banking yang mendukung QRIS.
          </p>
        </div>

        <p>
          🗓️ Masa akses: <strong>15 hari</strong>
        </p>
      </div>
      <p>Masa akses: <strong>${validity} hari</strong></p>

      ${
        errorMessage
          ? `<p class="source-access-error">${this.escapeHTML(errorMessage)}</p>`
          : ""
      }

      <form id="source-activation-form">
        <label for="source-activation-code">
          Kode Aktivasi
        </label>

        <input
          type="text"
          id="source-activation-code"
          name="code"
          placeholder="Masukkan kode aktivasi"
          autocomplete="off"
          required
        >

        <button type="submit" id="source-activation-submit">
          Aktifkan Akses
        </button>
      </form>

      <p id="source-activation-status" role="status"></p>
    </div>
  `;

      const form = document.querySelector("#source-activation-form");
      const input = document.querySelector("#source-activation-code");
      const button = document.querySelector("#source-activation-submit");
      const status = document.querySelector("#source-activation-status");

      if (!form || !input || !button || !status) return;

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const code = input.value.trim();

        if (!code) {
          status.textContent = "Kode aktivasi wajib diisi.";
          return;
        }

        button.disabled = true;
        button.textContent = "Memproses...";
        status.textContent = "Memeriksa kode aktivasi...";

        try {
          const productId = this.getProductId();

          const activation = await window.QEDEV_API.activateAccess(
            productId,
            code,
          );

          // Simpan informasi masa berlaku untuk tampilan.
          if (activation && activation.expiredAt) {
            try {
              localStorage.setItem(
                "qedev_access_meta_" + productId,
                JSON.stringify({
                  expiredAt: activation.expiredAt,
                }),
              );
            } catch (error) {
              console.warn(
                "[ACCESS META] Gagal menyimpan informasi akses:",
                error,
              );
            }
          }

          status.textContent = "Aktivasi berhasil. Memuat source code...";

          await this.initSourcePreview(this.currentSourceCodeUrl, accessConfig);
        } catch (error) {
          console.error("[SOURCE ACTIVATION]", error);

          status.textContent =
            error.message || "Aktivasi gagal. Silakan coba kembali.";

          button.disabled = false;
          button.textContent = "Aktifkan Akses";
        }
      });
    },

    renderAccessEntry(accessConfig = {}) {
      const message = document.querySelector("#source-preview-message");
      const layout = document.querySelector("#source-preview-layout");

      if (!message) return;

      if (layout) layout.hidden = true;

      const amount = Number(accessConfig.donationAmount || 0).toLocaleString(
        "id-ID",
      );

      const validity = Number(accessConfig.validityDays || 15);

      message.hidden = false;

      message.innerHTML = `
    <div class="source-access-entry">

      <div class="source-access-entry-header">
        <div>
          <strong>🔒 Struktur Source Code</strong>
          <p>
            Seluruh kode disimpan dalam satu file TXT.
            Ajukan akses untuk membuka source code.
          </p>
        </div>

        <span class="source-access-badge">
          Akses Terkunci
        </span>
      </div>

      <div class="source-access-entry-content">

        <div class="source-access-donation">
          <strong>🎁 Akses Source Code</strong>

          <p>
            Donasi untuk mendapatkan kode aktivasi.
          </p>

          <div class="source-access-price">
            Rp${amount}
          </div>

          <p class="source-access-validity">
            🗓 Masa akses: ${validity} hari
            <br>
            Setelah masa akses habis, kode aktivasi tidak berlaku lagi.
          </p>
        </div>

        <div class="source-access-actions">

          <button
            type="button"
            id="open-access-request"
            class="source-access-primary"
          >
            ✈ Ajukan Akses Source Code
          </button>

          <div class="source-access-separator">
            <span>atau</span>
          </div>

          <form id="source-access-code-form">

            <label for="source-access-code">
              Sudah memiliki kode aktivasi?
            </label>

            <input
              type="text"
              id="source-access-code"
              placeholder="Masukkan kode aktivasi"
              autocomplete="off"
              required
            >

            <button
              type="submit"
              id="source-access-activate"
              class="source-access-secondary"
            >
              ✓ Aktifkan Akses
            </button>

            <p
              id="source-access-code-status"
              role="status"
            ></p>

          </form>

        </div>
      </div>
    </div>
  `;

      // Tombol pengajuan membuka modal.
      document
        .querySelector("#open-access-request")
        .addEventListener("click", () => {
          this.openAccessRequestModal(accessConfig);
        });

      // Aktivasi kode langsung dari card.
      const form = document.querySelector("#source-access-code-form");
      const input = document.querySelector("#source-access-code");
      const button = document.querySelector("#source-access-activate");
      const status = document.querySelector("#source-access-code-status");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const code = input.value.trim();

        if (!code) {
          status.textContent = "Kode aktivasi wajib diisi.";
          return;
        }

        button.disabled = true;
        button.textContent = "Memproses...";
        status.textContent = "Memeriksa kode aktivasi...";

        try {
          const productId = this.getProductId();

          const activation = await window.QEDEV_API.activateAccess(
            productId,
            code,
          );

          if (activation && activation.expiredAt) {
            localStorage.setItem(
              "qedev_access_meta_" + productId,
              JSON.stringify({
                expiredAt: activation.expiredAt,
              }),
            );
          }

          await this.initSourcePreview(this.currentSourceCodeUrl, accessConfig);
        } catch (error) {
          status.textContent =
            error.message || "Aktivasi gagal. Silakan coba kembali.";

          button.disabled = false;
          button.textContent = "✓ Aktifkan Akses";
        }
      });
    },

    openAccessRequestModal(accessConfig = {}) {
      // Hindari modal ganda.
      document.querySelector("#access-request-modal")?.remove();

      const amount = Number(accessConfig.donationAmount || 0).toLocaleString(
        "id-ID",
      );

      const validity = Number(accessConfig.validityDays || 15);

      // Lokasi gambar QRIS.
      const qrisImageUrl = String(
        accessConfig.qrisImageUrl || "../assets/images/qris-qedstack.png",
      ).trim();

      const modal = document.createElement("div");
      modal.id = "access-request-modal";
      modal.className = "access-modal-overlay";

      modal.innerHTML = `
    <div class="access-modal" role="dialog" aria-modal="true"
         aria-labelledby="access-modal-title">

      <button type="button" class="access-modal-close"
              id="access-modal-close" aria-label="Tutup">
        &times;
      </button>

      <div class="access-modal-heading">
        <div class="access-modal-icon">⌘</div>
        <div>
          <h3 id="access-modal-title">Ajukan Akses Source Code</h3>
          <p>Lengkapi data berikut untuk mengajukan akses.</p>
        </div>
      </div>

      <div class="access-modal-content">

        <div class="access-modal-donation">

          <strong>🎁 Donasi Akses</strong>

          <p>Dapatkan kode aktivasi dengan donasi sebesar:</p>

          <div class="access-modal-price">Rp${amount}</div>

          <div class="access-modal-qris">

            <strong>Scan QRIS QedStack</strong>

            ${
              qrisImageUrl
                ? `
                  <img
                    src="${qrisImageUrl}"
                    alt="QRIS Pembayaran QedStack"
                    class="access-modal-qris-image"
                  >

                  <button
                    type="button"
                    id="access-qris-expand"
                    class="access-qris-expand"
                  >
                    Perbesar QRIS
                  </button>
                `
                : `
                  <div class="access-modal-qris-placeholder">
                    QRIS belum tersedia.
                  </div>
                `
            }

            <p>
              Scan menggunakan DANA, GoPay, OVO,
              atau Mobile Banking yang mendukung QRIS.
            </p>

          </div>

          <p class="access-modal-validity">
            🗓 Masa akses: <strong>${validity} hari</strong>
          </p>

        </div>

        <form id="access-request-form" class="access-request-form">

          <div class="access-form-field">
            <label for="access-request-name">Nama Lengkap *</label>
            <input
              type="text"
              id="access-request-name"
              maxlength="100"
              placeholder="Masukkan nama lengkap"
              required
            >
          </div>

          <div class="access-form-field">
            <label for="access-request-whatsapp">Nomor WhatsApp *</label>
            <input
              type="tel"
              id="access-request-whatsapp"
              maxlength="20"
              placeholder="Contoh: 081234567890"
              required
            >
          </div>

          <div class="access-form-field">
            <label for="access-request-email">Email (Opsional)</label>
            <input
              type="email"
              id="access-request-email"
              maxlength="150"
              placeholder="Masukkan alamat email"
            >
          </div>

          <div class="access-form-field">
            <label for="access-request-proof">Bukti Pembayaran *</label>
            <input
              type="file"
              id="access-request-proof"
              accept="image/jpeg,image/png,image/webp"
              required
            >

            <div id="access-proof-preview" class="access-proof-preview"
                 hidden>
              <img id="access-proof-image" alt="Pratinjau bukti transfer">
              <p id="access-proof-size"></p>
            </div>

            <p class="access-proof-hint">
              JPG, PNG, atau WEBP. Kompresi otomatis dengan target di bawah 100 KB.
            </p>
          </div>

          <p id="access-request-status"
             class="access-request-status" role="status"></p>

          <div class="access-modal-actions">
            <button type="button" id="access-request-cancel"
                    class="access-modal-button access-modal-cancel">
              Batal
            </button>

            <button type="submit" id="access-request-submit"
                    class="access-modal-button access-modal-submit">
              ✈ Kirim Permintaan
            </button>
          </div>

        </form>
      </div>
    </div>
  `;

      document.body.appendChild(modal);
      // Preview QRIS ukuran besar.
      const qrisExpandButton = modal.querySelector("#access-qris-expand");

      if (qrisExpandButton && qrisImageUrl) {
        const lightbox = document.createElement("div");

        lightbox.className = "access-qris-lightbox";
        lightbox.innerHTML = `
    <div class="access-qris-lightbox-content">
      <button
        type="button"
        class="access-qris-lightbox-close"
        aria-label="Tutup preview"
      >
        &times;
      </button>

      <img
        src="${qrisImageUrl}"
        alt="QRIS Pembayaran QEDeveloper"
      >

      <p>Scan QRIS QEDeveloper</p>
    </div>
  `;

        modal.appendChild(lightbox);

        const closeQrisPreview = () => {
          lightbox.classList.remove("active");
        };

        qrisExpandButton.addEventListener("click", () => {
          lightbox.classList.add("active");
        });

        lightbox
          .querySelector(".access-qris-lightbox-close")
          .addEventListener("click", closeQrisPreview);

        lightbox.addEventListener("click", (event) => {
          if (event.target === lightbox) {
            closeQrisPreview();
          }
        });

        // Tutup preview menggunakan tombol ESC.
        const handleEscape = (event) => {
          if (event.key === "Escape") {
            closeQrisPreview();
          }
        };

        document.addEventListener("keydown", handleEscape);

        // Bersihkan listener ESC saat modal pengajuan ditutup.
        const observer = new MutationObserver(() => {
          if (!document.body.contains(modal)) {
            document.removeEventListener("keydown", handleEscape);
            observer.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
        });
      }

      const form = modal.querySelector("#access-request-form");
      const fileInput = modal.querySelector("#access-request-proof");
      const preview = modal.querySelector("#access-proof-preview");
      const previewImage = modal.querySelector("#access-proof-image");
      const sizeInfo = modal.querySelector("#access-proof-size");
      const status = modal.querySelector("#access-request-status");
      const submitButton = modal.querySelector("#access-request-submit");

      let compressedProof = null;
      let previewUrl = "";

      const closeModal = () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewUrl = "";
        }

        modal.remove();
      };

      modal
        .querySelector("#access-modal-close")
        .addEventListener("click", closeModal);

      modal
        .querySelector("#access-request-cancel")
        .addEventListener("click", closeModal);

      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });

      // Kompresi bukti transfer.
      fileInput.addEventListener("change", async () => {
        compressedProof = null;
        preview.hidden = true;
        status.textContent = "";

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          previewUrl = "";
        }

        const file = fileInput.files[0];
        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          status.textContent = "Format foto harus JPG, PNG, atau WEBP.";
          fileInput.value = "";
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          status.textContent = "Ukuran foto asli maksimal 20 MB.";
          fileInput.value = "";
          return;
        }

        fileInput.disabled = true;
        status.textContent = "Sedang mengompres foto...";

        try {
          compressedProof = await this.compressProofImage(file);

          if (compressedProof.compressedSize > 5 * 1024 * 1024) {
            throw new Error(
              "Ukuran foto hasil kompresi melebihi batas upload.",
            );
          }

          previewUrl = URL.createObjectURL(compressedProof.blob);
          previewImage.src = previewUrl;
          preview.hidden = false;

          sizeInfo.textContent =
            "Ukuran asli: " +
            (file.size / 1024).toFixed(1) +
            " KB | Setelah kompresi: " +
            (compressedProof.compressedSize / 1024).toFixed(1) +
            " KB";

          status.textContent =
            compressedProof.compressedSize < 100 * 1024
              ? "Foto berhasil dikompres di bawah 100 KB."
              : "Foto sudah dikompres, tetapi masih di atas 100 KB.";
        } catch (error) {
          compressedProof = null;
          fileInput.value = "";
          status.textContent = error.message || "Gagal mengompres foto.";
        } finally {
          fileInput.disabled = false;
        }
      });

      // Kirim permintaan akses.
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!compressedProof) {
          status.textContent = "Silakan pilih bukti transfer terlebih dahulu.";
          return;
        }

        const name = modal.querySelector("#access-request-name").value.trim();

        const whatsapp = modal
          .querySelector("#access-request-whatsapp")
          .value.trim();

        const email = modal.querySelector("#access-request-email").value.trim();

        submitButton.disabled = true;
        submitButton.textContent = "Mengirim...";
        status.textContent = "Sedang mengirim permintaan akses...";

        try {
          const base64 = await this.proofBlobToBase64(compressedProof.blob);

          const result = await window.QEDEV_API.createAccessRequest({
            productId: this.getProductId(),
            name,
            whatsapp,
            email,
            proof: {
              fileName: compressedProof.fileName,
              mimeType: compressedProof.mimeType,
              base64,
            },
          });

          if (!result) {
            throw new Error("Respons permintaan akses tidak valid.");
          }

          // Tutup modal pengajuan.
          closeModal();

          // Tampilkan pesan sukses.
          this.showAccessRequestSuccess(name, whatsapp);
        } catch (error) {
          console.error("[ACCESS REQUEST]", error);

          status.textContent =
            error.message || "Permintaan gagal dikirim. Silakan coba kembali.";

          submitButton.disabled = false;
          submitButton.textContent = "✈ Kirim Permintaan";
        }
      });

      modal.querySelector("#access-request-name").focus();
    },

    showAccessRequestSuccess(name, whatsapp) {
      document.querySelector("#access-success-modal")?.remove();

      const safeName = this.escapeHTML(name);
      const safeWhatsapp = this.escapeHTML(whatsapp);

      const modal = document.createElement("div");
      modal.id = "access-success-modal";
      modal.className = "access-modal-overlay";

      modal.innerHTML = `
    <div class="access-success-modal"
         role="dialog"
         aria-modal="true"
         aria-labelledby="access-success-title">

      <button type="button"
              class="access-modal-close"
              id="access-success-close"
              aria-label="Tutup">
        &times;
      </button>

      <div class="access-success-icon">✓</div>

      <h3 id="access-success-title">
        Terima Kasih, ${safeName}!
      </h3>

      <p>
        Data Anda telah kami terima.
        Permintaan akses berhasil.
      </p>

      <p>
        Kode aktivasi akan segera kami kirimkan
        melalui WhatsApp ke nomor
        <strong>${safeWhatsapp}</strong>.
      </p>

      <button type="button"
              id="access-success-done"
              class="access-modal-button access-modal-submit">
        Tutup
      </button>

    </div>
  `;

      document.body.appendChild(modal);

      const closeSuccess = () => modal.remove();

      modal
        .querySelector("#access-success-close")
        .addEventListener("click", closeSuccess);

      modal
        .querySelector("#access-success-done")
        .addEventListener("click", closeSuccess);

      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeSuccess();
      });
    },

    /**
     * Kompres foto bukti transfer menggunakan Canvas.
     * Target ukuran: di bawah 100 KB.
     */
    async compressProofImage(file) {
      const MAX_SIZE = 100 * 1024;
      const MAX_DIMENSION = 1600;

      if (!file || !file.type.startsWith("image/")) {
        throw new Error("Silakan pilih file gambar.");
      }

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Format foto harus JPG, PNG, atau WEBP.");
      }

      const image = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Foto tidak dapat dibaca."));
        };

        img.src = url;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let width = image.width;
      let height = image.height;

      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

      width = Math.round(width * scale);
      height = Math.round(height * scale);

      let quality = 0.85;
      let result = null;

      for (let attempt = 0; attempt < 20; attempt++) {
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        result = await new Promise((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", quality);
        });

        if (!result) {
          throw new Error("Gagal mengompres foto.");
        }

        if (result.size < MAX_SIZE) {
          return {
            blob: result,
            fileName: "bukti-transfer.jpg",
            mimeType: "image/jpeg",
            originalSize: file.size,
            compressedSize: result.size,
          };
        }

        if (quality > 0.35) {
          quality -= 0.1;
        } else {
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);
          quality = 0.75;
        }

        if (width < 320 || height < 320) break;
      }

      if (result && result.size <= 5 * 1024 * 1024) {
        return {
          blob: result,
          fileName: "bukti-transfer.jpg",
          mimeType: "image/jpeg",
          originalSize: file.size,
          compressedSize: result.size,
        };
      }

      throw new Error(
        "Ukuran foto terlalu besar untuk dikompres. Silakan gunakan foto lain.",
      );
    },

    parseSourceText(sourceText) {
      const lines = String(sourceText || "")
        .replace(/\r\n?/g, "\n")
        .split("\n");

      const files = [];
      let currentFile = null;

      /*
       * Format penanda yang didukung:
       * // ===== FILE: Code.gs =====
       * /* ===== FILE: style.css ===== *\/
       * <!-- ===== FILE: index.html ===== -->
       */
      const markerPattern =
        /^\s*(?:(?:\/\/|\/\*|<!--)\s*)?={2,}\s*FILE:\s*(.+?)\s*={2,}\s*(?:\*\/|-->)?\s*$/i;

      for (const line of lines) {
        const match = line.match(markerPattern);

        if (match) {
          if (currentFile) {
            currentFile.code = currentFile.lines
              .join("\n")
              .replace(/^\n+|\n+$/g, "");
            delete currentFile.lines;
            files.push(currentFile);
          }

          const fileName = match[1].trim();

          currentFile = {
            name: fileName,
            lines: [],
          };

          continue;
        }

        if (currentFile) {
          currentFile.lines.push(line);
        }
      }

      if (currentFile) {
        currentFile.code = currentFile.lines
          .join("\n")
          .replace(/^\n+|\n+$/g, "");
        delete currentFile.lines;
        files.push(currentFile);
      }

      return files.filter((file) => file.name);
    },

    renderSourceFiles() {
      const list = document.querySelector("#source-file-list");

      if (!list) return;

      list.innerHTML = this.sourceFiles
        .map((file, index) => {
          const active = index === this.activeFileIndex;

          return `
            <button
              type="button"
              class="source-file-button${active ? " is-active" : ""}"
              data-source-file-index="${index}"
              aria-pressed="${active}"
            >
              <span class="source-file-icon" aria-hidden="true">▤</span>
              <span>
                <span class="source-file-name">${this.escapeHTML(file.name)}</span>
                <span class="source-file-description">
                  ${this.escapeHTML(this.getFileDescription(file.name))}
                </span>
              </span>
            </button>
          `;
        })
        .join("");

      list.querySelectorAll("[data-source-file-index]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.dataset.sourceFileIndex);

          if (!Number.isInteger(index)) return;
          if (!this.sourceFiles[index]) return;

          this.activeFileIndex = index;
          this.renderSourceFiles();
          this.renderActiveSourceFile();
        });
      });

      const copyButton = document.querySelector("#source-copy-button");

      if (copyButton) {
        copyButton.onclick = () => this.copyActiveSource();
      }

      this.renderActiveSourceFile();
    },

    renderActiveSourceFile() {
      const file = this.sourceFiles[this.activeFileIndex];

      if (!file) return;

      const filename = document.querySelector("#source-code-filename");
      const language = document.querySelector("#source-code-language");
      const code = document.querySelector("#source-code-content");

      if (filename) filename.textContent = file.name;
      if (language) language.textContent = this.getFileLanguage(file.name);

      // textContent mencegah source code dianggap sebagai HTML.
      if (code) code.textContent = file.code;
    },

    async copyActiveSource() {
      const file = this.sourceFiles[this.activeFileIndex];

      if (!file) return;

      const button = document.querySelector("#source-copy-button");

      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error("Clipboard API tidak tersedia.");
        }

        await navigator.clipboard.writeText(file.code);

        if (button) {
          button.textContent = "✓ Berhasil Disalin";

          window.setTimeout(() => {
            if (button.isConnected) button.textContent = "Salin Kode";
          }, 1800);
        }
      } catch (error) {
        console.error("[SOURCE PREVIEW] Gagal menyalin kode:", error);

        if (button) button.textContent = "Gagal Menyalin";

        window.setTimeout(() => {
          if (button && button.isConnected) {
            button.textContent = "Salin Kode";
          }
        }, 1800);
      }
    },

    getFileLanguage(filename) {
      const extension = String(filename).split(".").pop().toLowerCase();

      const languages = {
        gs: "Google Apps Script",
        js: "JavaScript",
        html: "HTML",
        htm: "HTML",
        css: "CSS",
        json: "JSON",
        txt: "Text",
        sql: "SQL",
        py: "Python",
        php: "PHP",
        xml: "XML",
        md: "Markdown",
      };

      return languages[extension] || "Source Code";
    },

    getFileDescription(filename) {
      const name = String(filename).toLowerCase();

      if (name.endsWith(".gs")) return "Backend Google Apps Script";
      if (name.endsWith(".html")) return "Struktur halaman aplikasi";
      if (name.endsWith(".css")) return "Tampilan dan styling";
      if (name.endsWith(".js")) return "Interaksi dan logika frontend";
      if (name.endsWith(".json")) return "Konfigurasi data";

      return "Source code aplikasi";
    },

    renderError(title, message) {
      this.elements.container.removeAttribute("aria-busy");

      this.elements.container.innerHTML = `
        <div class="product-detail-message">
          <h2>${this.escapeHTML(title)}</h2>
          <p>${this.escapeHTML(message)}</p>
          <a
            class="button secondary"
            href="../index.html#tools"
          >
            ← Kembali ke Katalog
          </a>
        </div>
      `;

      document.title = `${title} — QedStack`;
    },

    isValidHttpUrl(value) {
      try {
        const url = new URL(String(value || "").trim());

        return (
          (url.protocol === "https:" || url.protocol === "http:") &&
          Boolean(url.hostname)
        );
      } catch {
        return false;
      }
    },

    formatAffiliatePrice(price) {
      const value = String(price ?? "").trim();

      if (!value) return "";

      // Mendukung harga seperti 150000 atau 150.000
      const normalized = value.replace(/[^\d,-]/g, "").replace(",", ".");
      const amount = Number(normalized);

      if (!Number.isFinite(amount) || amount < 0) {
        return "";
      }

      return `Rp${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
      }).format(amount)}`;
    },

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

  function startDetailPage() {
    DetailPage.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDetailPage, {
      once: true,
    });
  } else {
    startDetailPage();
  }

  window.QEDEV_DETAIL_PAGE = DetailPage;
})();
