/* ───────────────────────────────────────────────────────────────
   محرّك الشخصية — يبني المشهد من البيانات وحدها.
   لا يعرف أي اسم عنصر؛ يتعامل مع: kind · slot · zIndex · priority.

   compose() → { layers, hidden, missing }
   stateOf() → حالة الشخصية المتحققة (أو null)
   ─────────────────────────────────────────────────────────────── */
(function (w) {

  /* حالة الشخصية: أول حالة تتحقق كل شروطها */
  function stateOf(items, qtyOf, states) {
    var chosen = {};
    items.forEach(function (i) { if (qtyOf(i) > 0) chosen[i.key] = true; });
    for (var n = 0; n < (states || []).length; n++) {
      if (states[n].requires.every(function (k) { return chosen[k]; })) return states[n];
    }
    return null;
  }

  function compose(opts) {
    var region     = opts.region,
        items      = opts.items,
        qtyOf      = opts.qtyOf,
        isAvailable = opts.isAvailable,
        srcOf      = opts.srcOf,
        propSrcOf  = opts.propSrcOf,
        stageSlots = opts.stageSlots || {},
        stageOrder = opts.stageOrder || [],
        covered    = opts.covered || [],
        aligned    = opts.aligned === true; // fail-safe

    var chosen = items
      .filter(function (i) { return qtyOf(i) > 0; })
      .sort(function (a, b) { return a.priority - b.priority; });

    var layers = [], hidden = 0, missing = [];

    /* ── طبقات مطابقة للجسم ─────────────────────────────────── */
    var bySlot = {};
    chosen
      .filter(function (i) { return i.kind === "aligned"; })
      .forEach(function (i) { if (!bySlot[i.slot]) bySlot[i.slot] = i; else hidden++; });

    Object.keys(bySlot).forEach(function (slot) {
      var i = bySlot[slot];
      // لا تُرسم إلا على شخصية موزونة على نفس body rig
      if (!aligned) { missing.push(i.visualKey); return; }
      if (!isAvailable(region, i.visualKey)) { missing.push(i.visualKey); hidden++; return; }

      layers.push({ key: i.visualKey, z: i.zIndex, src: srcOf(region, i.visualKey) });
      (i.extraVisuals || []).forEach(function (x) {
        if (isAvailable(region, x.visualKey))
          layers.push({ key: x.visualKey, z: opts.slotZ[x.slot], src: srcOf(region, x.visualKey) });
        else missing.push(x.visualKey);
      });
    });

    /* ── عناصر مستقلة في فتحات المسرح ───────────────────────────
       المسرح تمثيل بصري مختصر للأثر، لا مرآة لكل بند في السلة.  */
    var free = stageOrder.slice(), shown = 0;
    var maxProps = opts.maxProps || stageOrder.length;

    chosen
      .filter(function (i) { return i.kind === "prop" && covered.indexOf(i.key) === -1; })
      .forEach(function (i) {
        var fixed = !!i.stageSlot; // فتحة معيّنة (كالخلفية) لا تزاحم فتحات المقدمة
        if (!fixed && shown >= maxProps) return;
        var name = i.stageSlot || free.shift();
        if (!name) return;
        if (!fixed) shown++;
        var slot = stageSlots[name];
        layers.push({ key: i.visualKey, z: slot.z, src: propSrcOf(i), placement: slot, stageSlot: name });
      });

    return {
      layers: layers.sort(function (a, b) { return a.z - b.z; }),
      hidden: hidden,
      missing: missing
    };
  }

  w.GB_ENGINE = { compose: compose, stateOf: stateOf };
})(window);
