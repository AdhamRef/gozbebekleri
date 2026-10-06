/* مصدر المشاريع — نقطة التكامل الوحيدة مع نظام المشاريع في gozbebekleri.org.
   عند توفر الـAPI: املأ ENDPOINT وعدّل normalize() فقط؛ لا تغيير في الصفحات. */
(function (w) {
  var ENDPOINT = ""; // مثال: "https://www.gozbebekleri.org/api/projects?recurring=1"

  // يُستخدم ريثما يُوصل الـAPI. المفاتيح تطابق ما يتوقعه النموذج.
  var FALLBACK = [
    { id: "most",      name: "الأكثر احتياجًا", amount: 25, region: "كل المناطق", photo: "assets/photo-children-wide.jpg",
      text: "يوجَّه إلى أكثر البرامج حاجة في حينه وفق تقدير الفرق الميدانية.",
      rows: [{ k: "التوجيه", v: "حسب الأولوية" }, { k: "التقرير", v: "ربع سنوي" }] },
    { id: "water",     name: "مياه نظيفة", amount: 10, region: "غزة", photo: "assets/photo-water.jpg",
      text: "حصة شهرية من المياه المعالجة تصل بالصهاريج إلى نقاط التوزيع في الأحياء المدمَّرة.",
      rows: [{ k: "الوحدة", v: "أسرة واحدة" }, { k: "التسليم", v: "أسبوعيًا" }] },
    { id: "food",      name: "السلة الغذائية", amount: 25, region: "غزة", photo: "assets/photo-tent.jpg",
      text: "طحين وأرز وزيت وبقول تُسلَّم إلى باب الخيمة، ويضاف حليب الرضّع عند وجود طفل دون السنتين.",
      rows: [{ k: "الوحدة", v: "سلة شهرية" }, { k: "التسليم", v: "إلى العنوان" }] },
    { id: "education", name: "تعليم", amount: 15, region: "غزة والقدس", photo: "assets/photo-school.jpg",
      text: "قرطاسية ووجبة مدرسية ضمن النشاط التعليمي الذي تديره الجمعية مع المدارس المحلية.",
      rows: [{ k: "الوحدة", v: "طالب واحد" }, { k: "المتابعة", v: "تقرير فصلي" }] },
    { id: "health",    name: "علاج", amount: 30, region: "غزة", photo: "assets/photo-children-wide.jpg",
      text: "أدوية ومستلزمات علاجية للأطفال عبر النقاط الطبية المتعاونة مع الجمعية.",
      rows: [{ k: "الوحدة", v: "طفل واحد" }, { k: "الصرف", v: "شهري" }] },
    { id: "child",     name: "دعم أطفال", amount: 50, region: "كل المناطق", photo: "assets/photo-children-wide.jpg",
      text: "دعم شهري متصل يغطي احتياجات الأطفال الأساسية ومتابعة تعليمهم وصحتهم.",
      rows: [{ k: "الوحدة", v: "طفل واحد" }, { k: "الزيارة", v: "كل ٣ أشهر" }] },
    { id: "zakat",     name: "زكاة", amount: 50, region: "كل المناطق", photo: "assets/photo-tent.jpg", zakat: true,
      text: "تُفصل في حساب مستقل وتُصرف في مصارفها الشرعية دون خصم مصاريف إدارية.",
      rows: [{ k: "الحساب", v: "مستقل" }, { k: "المصاريف", v: "لا تُخصم" }] }
  ];

  // حوّل استجابة الـAPI إلى الشكل أعلاه.
  function normalize(raw) {
    return (raw || []).map(function (p) {
      return {
        id: String(p.id), projectId: p.id, name: p.title || p.name,
        amount: Number(p.monthly_amount || p.price || 0),
        region: p.region || "", photo: p.image || "", text: p.summary || "",
        zakat: !!p.zakat_eligible, rows: []
      };
    }).filter(function (p) { return p.name && p.amount; });
  }

  function load() {
    if (!ENDPOINT) return Promise.resolve({ source: "fallback", projects: FALLBACK });
    return fetch(ENDPOINT, { credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = normalize(j.data || j.projects || j);
        return list.length ? { source: "api", projects: list } : { source: "fallback", projects: FALLBACK };
      })
      .catch(function () { return { source: "fallback", projects: FALLBACK }; });
  }

  w.GB_PROJECTS = { ENDPOINT: ENDPOINT, FALLBACK: FALLBACK, normalize: normalize, load: load };
})(window);
