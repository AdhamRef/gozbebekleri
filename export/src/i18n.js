/* i18n — كل نصوص الواجهة. تحميل متزامن عبر <script> حتى تظهر النصوص من أول رسم. */
(function (w) {
  var S = {
    ar: {
      dir: "rtl", title: "اصنع أثرًا لطفل",
      intro: "اختر الاحتياجات التي تريد تغطيتها، وسيتكوّن أثرك أمام عينيك.",
      regions: "اختر المنطقة", soon: "قريبًا",
      impact: "أثرك حتى الآن", needs: "الاحتياجات المختارة", total: "الإجمالي",
      cta: "تبرع الآن", addToCart: "أضف للسلة", ctaDone: "تمت الإضافة إلى السلة",
      secure: "معاملات آمنة ومشفّرة", zakat: "تقبل الزكاة",
      inc: "زيادة", dec: "إنقاص", cart: "السلة", unit: "احتياج", reset: "إعادة التعيين", monthly: "اجعل هذا التبرع شهريًا", monthlyNote: "يتجدّد تلقائيًا كل شهر، ويمكن إيقافه في أي وقت", perMonth: "شهريًا", none: "لم تختر بعد",
      assets: "حالة الأصول", pending: "بانتظار الملف",
      nav: { about: "من نحن", projects: "المشاريع", recurring: "التبرع الدوري", current: "اصنع أثرًا لطفل", contact: "تواصل معنا" },
      trust: [
        { title: "أثر واضح", text: "كل عنصر تختاره يمثّل احتياجًا فعليًا ضمن سلة المساعدات التي تصل للطفل." },
        { title: "تقرير بعد التسليم", text: "يصلك تقرير مصوّر بعد وصول المساعدة." },
        { title: "أسعار مؤقتة", text: "المصدر النهائي للأسعار هو نظام المشاريع في الموقع." }
      ],
      footerAbout: "جمعية قرة العيون للإغاثة والتكافل — جمعية تركية تعمل في رعاية الطفولة حول العالم.",
      footerLinks: "روابط سريعة", footerContact: "تواصل", footerCity: "إسطنبول، تركيا",
      rights: "© 2026 قرة العيون. جميع الحقوق محفوظة."
    },
    tr: {
      dir: "ltr", title: "Bir çocuk için iz bırak",
      intro: "Karşılamak istediğin ihtiyaçları seç; etkin gözünün önünde oluşsun.",
      regions: "Bölge seç", soon: "Yakında",
      impact: "Şimdiye kadarki etkin", needs: "Seçilen ihtiyaçlar", total: "Toplam",
      cta: "Şimdi bağışla", addToCart: "Sepete ekle", ctaDone: "Sepete eklendi",
      secure: "Güvenli ve şifreli işlem", zakat: "Zekâta uygun",
      inc: "Artır", dec: "Azalt", cart: "Sepet", unit: "ihtiyaç", reset: "Sıfırla", monthly: "Bu bağışı aylık yap", monthlyNote: "Her ay otomatik yenilenir, istediğiniz zaman durdurabilirsiniz", perMonth: "aylık", none: "Henüz seçim yok",
      assets: "Görsel durumu", pending: "Dosya bekleniyor",
      nav: { about: "Hakkımızda", projects: "Projeler", recurring: "Düzenli bağış", current: "Bir çocuk için iz bırak", contact: "İletişim" },
      trust: [
        { title: "Net etki", text: "Seçtiğin her kalem çocuğa ulaşan yardım paketinde gerçek bir ihtiyaçtır." },
        { title: "Teslim sonrası rapor", text: "Yardım ulaştıktan sonra fotoğraflı rapor gönderilir." },
        { title: "Geçici fiyatlar", text: "Fiyatların nihai kaynağı sitedeki proje sistemidir." }
      ],
      footerAbout: "Gözbebekleri Yardımlaşma ve Dayanışma Derneği — dünya genelinde çocuk bakımı alanında çalışır.",
      footerLinks: "Hızlı bağlantılar", footerContact: "İletişim", footerCity: "İstanbul, Türkiye",
      rights: "© 2026 Gözbebekleri. Tüm hakları saklıdır."
    },
    en: {
      dir: "ltr", title: "Make an impact for a child",
      intro: "Choose the needs you want to cover and watch your impact take shape.",
      regions: "Choose a region", soon: "Soon",
      impact: "Your impact so far", needs: "Needs selected", total: "Total",
      cta: "Donate now", addToCart: "Add to basket", ctaDone: "Added to basket",
      secure: "Secure, encrypted payment", zakat: "Zakat eligible",
      inc: "Increase", dec: "Decrease", cart: "Basket", unit: "need", reset: "Reset", monthly: "Make this donation monthly", monthlyNote: "Renews automatically each month, cancel any time", perMonth: "per month", none: "Nothing selected yet",
      assets: "Asset status", pending: "File pending",
      nav: { about: "About us", projects: "Projects", recurring: "Recurring giving", current: "Make an impact", contact: "Contact" },
      trust: [
        { title: "Clear impact", text: "Every item you pick is a real need inside the aid package that reaches the child." },
        { title: "Report after delivery", text: "You receive a photo report once the aid arrives." },
        { title: "Provisional prices", text: "The final source of pricing is the site's project system." }
      ],
      footerAbout: "Gözbebekleri Relief and Solidarity Association — a Turkish association working in child care worldwide.",
      footerLinks: "Quick links", footerContact: "Contact", footerCity: "Istanbul, Türkiye",
      rights: "© 2026 Gözbebekleri. All rights reserved."
    }
  };
  w.GB_I18N = { strings: S, t: function (lang) { return S[lang] || S.ar; } };
})(window);
