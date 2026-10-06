/* محوّلات الخدمات — نقاط التكامل الوحيدة مع نظام الموقع الحالي. */
(function (w) {
  // --- المشاريع: المصدر النهائي للأسعار وprojectId ---
  var projectService = {
    mode: "mock",
    // استبدل الجسم بنداء API حقيقي؛ الواجهة لا تتغير.
    fetchProjects: function (region, currency) {
      return Promise.resolve(
        (w.GB_DATA ? w.GB_DATA.itemsFor(region) : []).map(function (i) {
          return { itemId: i.id, projectId: i.projectId, price: i.price, currency: currency || i.currency };
        })
      );
    },
    applyPricing: function (items, pricing) {
      if (!pricing) return items;
      return items.map(function (i) {
        var p = pricing.filter(function (x) { return x.itemId === i.id; })[0];
        return p ? Object.assign({}, i, { price: p.price, currency: p.currency, projectId: p.projectId }) : i;
      });
    }
  };

  // --- العملة: تنسيق مركزي، لا تنسيق يدوي داخل الواجهة ---
  var currency = {
    fromUrl: function () {
      try { return new URLSearchParams(location.search).get("currency"); } catch (e) { return null; }
    },
    format: function (amount, code, lang) {
      try {
        // أرقام لاتينية في كل اللغات لتطابق صيغة الموقع
        return new Intl.NumberFormat((lang === "tr" ? "tr-TR" : "en-US") + "-u-nu-latn",
          { style: "currency", currency: code, maximumFractionDigits: 0, currencyDisplay: "code" }).format(amount);
      } catch (e) { return amount + " " + code; }
    }
  };

  // --- الدفع ---
  var CURRENCIES = ["USD", "EUR", "GBP", "TRY", "SAR", "AED", "QAR", "KWD"];
  var LANGS = [["ar", "العربية"], ["tr", "Türkçe"], ["en", "English"]];

  var checkout = {
    proceedToCheckout: function (lines, options) {
      console.info("[checkout] proceedToCheckout", { lines: lines, frequency: (options && options.monthly) ? "monthly" : "one_time" });
      return Promise.resolve({ ok: true, redirect: null });
    }
  };

  // --- وضع التطوير: ?dev=1 ---
  var dev = {
    enabled: (function () {
      try { return new URLSearchParams(location.search).get("dev") === "1"; } catch (e) { return false; }
    })()
  };

  w.GB_SERVICES = { CURRENCIES: CURRENCIES, LANGS: LANGS, projectService: projectService, currency: currency, checkout: checkout, dev: dev };
})(window);
