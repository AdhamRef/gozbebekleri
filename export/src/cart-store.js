/* حالة السلة المركزية — مصدر الحقيقة الوحيد لكل مكوّنات الواجهة. */
(function (w) {
  // محوّل الحفظ: استبدله بمخزن الموقع الحقيقي عند الدمج.
  var persistence = {
    key: "gb_impact_cart_v1",
    load: function () {
      try { return JSON.parse(sessionStorage.getItem(this.key)) || {}; } catch (e) { return {}; }
    },
    save: function (state) {
      try { sessionStorage.setItem(this.key, JSON.stringify(state)); } catch (e) {}
    }
  };

  function createCart(getItem) {
    var state = persistence.load();
    var subs = [];
    function emit() { persistence.save(state); subs.forEach(function (f) { f(state); }); }

    return {
      subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      qty: function (region, id) { return (state[region] || {})[id] || 0; },
      count: function () {
        return Object.keys(state).reduce(function (t, r) {
          return t + Object.keys(state[r]).reduce(function (x, id) { return x + state[r][id]; }, 0);
        }, 0);
      },
      change: function (region, item, delta) {
        var cur = state[region] || (state[region] = {});
        var next = Math.min(item.maxQuantity, Math.max(0, (cur[item.id] || 0) + delta));
        if (next) cur[item.id] = next; else delete cur[item.id];
        emit();
      },
      clear: function () { state = {}; emit(); },
      clearRegion: function (region) { delete state[region]; emit(); },
      lines: function () {
        var out = [];
        Object.keys(state).forEach(function (region) {
          Object.keys(state[region]).forEach(function (id) {
            var it = getItem(id); if (!it) return;
            var q = state[region][id];
            out.push({
              region: region, itemId: id, projectId: it.projectId, visualKey: it.visualKey,
              quantity: q, unitPrice: it.price, amount: q * it.price,
              currency: it.currency, zakatEligible: it.zakatEligible
            });
          });
        });
        return out;
      }
    };
  }

  w.GB_CART = { create: createCart, persistence: persistence };
})(window);
