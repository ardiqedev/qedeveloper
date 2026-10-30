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
          "Silakan buka detail produk melalui katalog QEDeveloper.",
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
      const name = product.name || product.NAMA_PRODUK || "Produk QEDeveloper";

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
            <span class="status">Gratis</span>
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

      document.title = `${name} — QEDeveloper`;

      const metaDescription = document.querySelector(
        'meta[name="description"]',
      );

      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          String(description).slice(0, 160),
        );
      }

      this.initSourcePreview(sourceCodeUrl);
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

    async initSourcePreview(sourceCodeUrl) {
      const section = document.querySelector("#source-preview");
      const message = document.querySelector("#source-preview-message");

      if (!section || !message) return;

      // Produk tanpa URL TXT tetap menampilkan detail normal.
      if (!this.isValidHttpUrl(sourceCodeUrl)) {
        return;
      }

      section.hidden = false;
      message.hidden = false;
      message.textContent = "Memuat source code...";

      try {
        const productId = this.getProductId();

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

        if (!sourceText.trim()) {
          throw new Error("File TXT masih kosong.");
        }

        this.sourceFiles = this.parseSourceText(sourceText);
        this.activeFileIndex = 0;

        if (!this.sourceFiles.length) {
          throw new Error("Penanda nama file tidak ditemukan dalam TXT.");
        }

        this.renderSourceFiles();

        message.hidden = true;

        document.querySelector("#source-preview-layout").hidden = false;
      } catch (error) {
        console.error("[SOURCE PREVIEW]", error);

        message.hidden = false;
        message.textContent =
          "Preview belum dapat dimuat. " +
          (error.message || "Periksa URL dan akses file TXT.") +
          " Tombol download tetap dapat digunakan jika tersedia.";

        const layout = document.querySelector("#source-preview-layout");

        if (layout) layout.hidden = true;
      }
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

      document.title = `${title} — QEDeveloper`;
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
