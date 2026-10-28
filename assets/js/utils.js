/* =========================================
   QEDEVELOPER - UTILITIES
   Fungsi bantuan umum
========================================= */

(function () {
  "use strict";

  const Utils = {
    /* =====================================
       ESCAPE HTML
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
       FORMAT DATE
    ===================================== */

    formatDate(value) {
      if (!value) return "-";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    },

    /* =====================================
       DEBOUNCE
       Membatasi pemanggilan fungsi berulang
    ===================================== */

    debounce(callback, delay = 250) {
      let timeoutId;

      return function (...args) {
        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
          callback.apply(this, args);
        }, delay);
      };
    },

    /* =====================================
       SAFE URL
       Hanya menerima URL HTTP dan HTTPS
    ===================================== */

    safeURL(value) {
      if (!value) return "";

      try {
        const url = new URL(value, window.location.href);

        if (!["http:", "https:"].includes(url.protocol)) {
          return "";
        }

        return url.href;
      } catch {
        return "";
      }
    },

    /* =====================================
       GET ELEMENT
    ===================================== */

    getElement(selector, parent = document) {
      return parent.querySelector(selector);
    },

    /* =====================================
       GET ALL ELEMENTS
    ===================================== */

    getElements(selector, parent = document) {
      return Array.from(parent.querySelectorAll(selector));
    },

    /* =====================================
       SET TEXT
    ===================================== */

    setText(selector, value, parent = document) {
      const element = this.getElement(selector, parent);

      if (!element) return false;

      element.textContent = String(value ?? "");

      return true;
    },

    /* =====================================
       SCROLL TO ELEMENT
    ===================================== */

    scrollTo(selector, options = {}) {
      const element = this.getElement(selector);

      if (!element) return false;

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        ...options,
      });

      return true;
    },

    /* =====================================
       COPY TEXT
    ===================================== */

    async copyText(value) {
      if (!navigator.clipboard?.writeText) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(String(value ?? ""));
        return true;
      } catch {
        return false;
      }
    },
  };

  window.QEDEV_UTILS = Utils;
})();
