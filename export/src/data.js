/* ───────────────────────────────────────────────────────────────
   طبقة البيانات — المناطق، الشخصيات، الاحتياجات، وهندسة المسرح.
   لا منطق واجهة ولا أنماط هنا.

   أنواع الاحتياجات:
     state   ← يبدّل صورة الشخصية كاملة (كسوة، حمل)
     aligned ← طبقة مطابقة لكانفس الشخصية تُركّب فوقها
     prop    ← عنصر مستقل يوضع في فتحة ثابتة على المسرح
   ─────────────────────────────────────────────────────────────── */
(function (w) {

  /* ── 1. ترتيب الطبقات (z-index) ───────────────────────────── */
  var SLOT_Z = {
    background: 10, back_backpack: 20, back_blanket: 30, base: 40,
    body: 50, feet: 60, outerwear: 70, front_backpack: 80,
    front_blanket: 90, hand: 100, ground: 110
  };

  /* ── 2. فتحات المسرح — مواضع ثابتة لا تحتاج مطابقة الجسم ───
     k  = عرض العنصر كنسبة من عرض المسرح
     px = الموضع الأفقي (%)، py = الموضع الرأسي (%)            */
  var STAGE_SLOTS = {
    BACKGROUND:   { k: 0.95, px: 50, py: 96, z: 5 },
    GROUND_LEFT:  { k: 0.26, px: 30, py: 99, z: 112 },
    GROUND_RIGHT: { k: 0.26, px: 70, py: 99, z: 111 },
    GROUND_FAR_L: { k: 0.22, px: 8,  py: 97, z: 110 },
    GROUND_FAR_R: { k: 0.22, px: 92, py: 97, z: 109 }
  };
  var STAGE_ORDER = ["GROUND_RIGHT", "GROUND_LEFT", "GROUND_FAR_R", "GROUND_FAR_L"];
  var MAX_PROPS = STAGE_ORDER.length;

  /* ── 3. حالات الشخصية — من الأشمل للأبسط، وأول متحققة تُعرض ─
     covers: عناصر تمثّلها الصورة فلا تُرسم كـprop مكرّر        */
  var STATES = [
    { key: "carrying",    requires: ["clothing", "education", "food"], covers: ["food"] },
    { key: "schooled",    requires: ["clothing", "education"],         covers: [] },
    { key: "bagged_fed",  requires: ["education", "food"],             covers: ["food"] },
    { key: "dressed_fed", requires: ["clothing", "food"],              covers: ["food"] },
    { key: "dressed",     requires: ["clothing"],                      covers: [] },
    { key: "bagged",      requires: ["education"],                     covers: [] },
    { key: "fed",         requires: ["food"],                          covers: ["food"] }
  ];

  /* ── 4. المناطق ────────────────────────────────────────────
     alignedAssets: هل طبقات shared-layers موزونة على هذه الشخصية؟ */
  function region(id, ar, tr, en) {
    var dir = "characters/" + id + "/";
    var r = { id: id, name_ar: ar, name_tr: tr, name_en: en, active: true,
              alignedAssets: false, base: dir + "base.webp" };
    STATES.forEach(function (s) { r[s.key] = dir + s.key + ".webp"; });
    return r;
  }

  var REGIONS = [
    region("gaza",  "غزة",     "Gazze",  "Gaza"),
    region("quds",  "القدس",   "Kudüs",  "Al-Quds"),
    region("sudan", "السودان", "Sudan",  "Sudan"),
    region("yemen", "اليمن",   "Yemen",  "Yemen"),
    region("syria", "سوريا",   "Suriye", "Syria")
  ];

  /* ── 5. كتالوج الاحتياجات — مشترك بين كل المناطق ───────────
     السعر وprojectId مؤقتان؛ المصدر النهائي هو Project API.    */
  function item(o) {
    var d = { currency: "USD", projectId: null, priority: 5,
              zakatEligible: false, maxQuantity: 10, active: true };
    for (var k in o) d[k] = o[k];
    d.icon = "assets/item-" + (o.iconKey || o.key) + ".png";
    d.zIndex = SLOT_Z[o.slot];
    return d;
  }

  var CATALOG = [
    item({ key: "clothing",  kind: "state", stateKey: "dressed",
           name_ar: "ملابس وحذاء", name_tr: "Giysi ve ayakkabı", name_en: "Clothing & shoes",
           category: "clothing", visualKey: "body_clothing", slot: "body",
           priority: 1, price: 15, iconKey: "clothes" }),

    item({ key: "food",      kind: "prop",
           name_ar: "غذاء", name_tr: "Gıda", name_en: "Food",
           category: "food", visualKey: "prop_food", slot: "hand",
           priority: 3, price: 6 }),

    item({ key: "water",     kind: "prop",
           name_ar: "ماء نظيف", name_tr: "Temiz su", name_en: "Clean water",
           category: "water", visualKey: "prop_water", slot: "hand",
           priority: 2, price: 4 }),

    item({ key: "milk",      kind: "prop",
           name_ar: "حليب أطفال", name_tr: "Bebek maması", name_en: "Baby milk",
           category: "milk", visualKey: "prop_milk", slot: "hand",
           priority: 4, price: 8 }),

    item({ key: "shelter",   kind: "prop", stageSlot: "BACKGROUND",
           name_ar: "مأوى ودفء", name_tr: "Barınma", name_en: "Shelter",
           category: "shelter", visualKey: "background_shelter", slot: "background",
           priority: 1, price: 100 }),

    item({ key: "education", kind: "aligned",
           name_ar: "تعليم", name_tr: "Eğitim", name_en: "Education",
           category: "education", visualKey: "back_backpack", slot: "back_backpack",
           extraVisuals: [{ visualKey: "front_backpack", slot: "front_backpack" }],
           priority: 1, price: 10, iconKey: "stationery" }),

    item({ key: "medicine",  kind: "prop",
           name_ar: "علاج", name_tr: "Tedavi", name_en: "Medicine",
           category: "health", visualKey: "prop_medicine", slot: "ground",
           priority: 4, price: 15 }),

    item({ key: "psych",     kind: "prop",
           name_ar: "دعم نفسي ولعب", name_tr: "Psikososyal destek", name_en: "Play & support",
           category: "psychosocial", visualKey: "prop_toy", slot: "ground",
           priority: 2, price: 5, iconKey: "toy" })
  ];

  /* ── 6. توليد عناصر كل منطقة من الكتالوج ───────────────────── */
  var ITEMS = [];
  REGIONS.forEach(function (r) {
    CATALOG.forEach(function (c) {
      var copy = {};
      for (var k in c) copy[k] = c[k];
      copy.region = r.id;
      copy.id = r.id + "-" + c.key;
      ITEMS.push(copy);
    });
  });

  /* ── 7. طبقات مشتركة بانتظار ملفاتها — تُراقَب في وضع التطوير ─ */
  var PENDING_LAYERS = [
    { visualKey: "body_clothing",   name: "كسوة" },
    { visualKey: "feet_shoes",      name: "حذاء" },
    { visualKey: "back_backpack",   name: "حقيبة خلف" },
    { visualKey: "front_backpack",  name: "حقيبة أمام" },
    { visualKey: "outerwear_jacket", name: "معطف" },
    { visualKey: "back_blanket",    name: "بطانية خلف" },
    { visualKey: "front_blanket",   name: "بطانية أمام" }
  ];

  /* ── 8. الواجهة العامة ─────────────────────────────────────── */
  w.GB_DATA = {
    SLOT_Z: SLOT_Z,
    STAGE_SLOTS: STAGE_SLOTS,
    STAGE_ORDER: STAGE_ORDER,
    MAX_PROPS: MAX_PROPS,
    STATES: STATES,
    REGIONS: REGIONS,
    CATALOG: CATALOG,
    ITEMS: ITEMS,
    PENDING_LAYERS: PENDING_LAYERS,

    region:    function (id) { return REGIONS.filter(function (r) { return r.id === id; })[0]; },
    itemsFor:  function (id) { return ITEMS.filter(function (i) { return i.region === id && i.active; }); },
    item:      function (id) { return ITEMS.filter(function (i) { return i.id === id; })[0]; },
    name:      function (o, lang) { return o["name_" + lang] || o.name_en || o.name_ar; },

    // الطبقات المشتركة لا تتبع منطقة — نفس body rig لكل الشخصيات
    layerSrc:      function (_region, visualKey) { return "shared-layers/" + visualKey + ".webp"; },
    cardIcon:      function (item) { return item.icon; },
    stagePropSrc:  function (item) { return item.stageProp || item.icon; }
  };
})(window);
