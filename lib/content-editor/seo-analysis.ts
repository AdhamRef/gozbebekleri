import { seoPlainText } from "./seo-fill";
import type { TextValues } from "./contracts";

export type SeoFinding={id:string;label:string;status:"pass"|"warning"|"error";detail:string;field:string};
type RichNode={type?:string;text?:string;attrs?:Record<string,unknown>;marks?:Array<{type?:string;attrs?:Record<string,unknown>}>;content?:RichNode[]};
const normalize=(value:string)=>value.normalize("NFKC").toLocaleLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,"").replace(/\s+/g," ").trim();

/** Inspect the actual draft, including rich content. No ranking scores or fabricated research. */
export function analyzeSeo(values:TextValues,locale:string):{findings:SeoFinding[];words:number;headingCount:number;internalLinks:number;imageCount:number} {
  const findings:SeoFinding[]=[];
  const add=(id:string,label:string,ok:boolean,detail:string,field:string,severity:"warning"|"error"="warning")=>findings.push({id,label,status:ok?"pass":severity,detail,field});
  const title=seoPlainText(values.seoTitle || values.metaTitle || "");
  const description=seoPlainText(values.seoDescription || values.metaDescription || "");
  const bodyKeys=["content","description","intro","heroLead"].filter(key=>values[key]);
  const content=bodyKeys.map(key=>seoPlainText(values[key])).join(" ");
  const words=content.split(/\s+/u).filter(Boolean).length;
  const bodyField=values.content?"content":"description";
  const titleField="seoTitle" in values?"seoTitle":"metaTitle";
  const descriptionField="seoDescription" in values?"seoDescription":"metaDescription";
  add("title","عنوان نتيجة البحث",Boolean(title),title?`${[...title].length} حرفًا. يجب أن يصف الموضوع بوضوح ويختلف عن الصفحات الأخرى.`:"أضف عنوانًا مخصصًا لهذه اللغة.",titleField,"error");
  if(title)add("title-length","وضوح العنوان وطوله",[...title].length>=20&&[...title].length<=70,`${[...title].length} حرفًا؛ راجع احتمال القص إن طال العنوان، أو ضعف الوصف إن كان قصيرًا. عرض النتيجة يختلف بحسب الجهاز.`,titleField);
  add("description","وصف نتيجة البحث",Boolean(description),description?`${[...description].length} حرفًا؛ وصف واضح للفائدة دون ادعاءات إضافية.`:"اكتب ملخصًا محددًا من المحتوى المحفوظ.",descriptionField,"error");
  if(description)add("description-length","طول الوصف",[...description].length>=70&&[...description].length<=170,`${[...description].length} حرفًا. استخدم وصفًا موجزًا ومكتمل المعنى؛ هذه إرشادات تحريرية وليست حدودًا تضمن ظهور النص كاملًا.`,descriptionField);
  add("unique-copy","تمييز العنوان عن الوصف",!title||!description||normalize(title)!==normalize(description),"يجب أن يضيف الوصف معلومة مفيدة بدل تكرار العنوان حرفيًا.",descriptionField);
  add("content-depth","كفاية المحتوى",words>=60,`${words} كلمة في النص. إذا كان النص قصيرًا، أضف سياقًا وشرحًا من معلومات موثقة فقط؛ لا تطِل النص لمجرد عدد الكلمات.`,bodyField);
  const keyword=normalize(values.seoKeyword || "");
  if(keyword){
    for(const [id,label,text,field] of [["keyword-title","العبارة المستهدفة في العنوان",title,titleField],["keyword-description","العبارة المستهدفة في الوصف",description,descriptionField],["keyword-body","توافق المحتوى مع العبارة المستهدفة",content,bodyField]])
      add(id,label,normalize(text).includes(keyword),"استخدم العبارة أو صياغة طبيعية مكافئة عند ملاءمتها للمعنى. الفحص حرفي ولا يقيس حجم البحث أو المرادفات.",field);
    const occurrences=normalize(content).split(keyword).length-1;
    add("keyword-repetition","تكرار العبارة",words<60||occurrences<=Math.max(4,Math.ceil(words/40)),`${occurrences} ظهورًا مطابقًا؛ تجنّب الحشو على حساب سلاسة القراءة.`,bodyField);
  }else add("keyword","هدف الصفحة البحثي",false,"حدد عبارة رئيسية تصف نية الزائر وموضوع الصفحة؛ لا يستند هذا الحقل إلى بيانات حجم البحث.","seoKeyword");
  const headings:Array<{level:number;text:string}>=[],links:string[]=[],images:Array<{alt:string}>=[],paragraphs:string[]=[];
  const walk=(node:RichNode)=>{
    if(node.type==="heading")headings.push({level:Number(node.attrs?.level || 2),text:seoPlainText(JSON.stringify({type:"doc",content:[node]}))});
    if(node.type==="paragraph")paragraphs.push(seoPlainText(JSON.stringify({type:"doc",content:[node]})));
    if(node.type==="image")images.push({alt:String(node.attrs?.alt || "")});
    for(const mark of node.marks || [])if(mark.type==="link")links.push(String(mark.attrs?.href || ""));
    for(const child of node.content || [])walk(child);
  };
  for(const key of bodyKeys){
    try{const doc=JSON.parse(values[key]);if(doc.type==="doc"){walk(doc);continue;}}catch{/* HTML or plain text */}
    const html=values[key];
    for(const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi))headings.push({level:Number(m[1]),text:seoPlainText(m[2])});
    for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*)["']/gi))links.push(m[1]);
    for(const m of html.matchAll(/<img\b[^>]*>/gi))images.push({alt:m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || ""});
    for(const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))paragraphs.push(seoPlainText(m[1]));
  }
  add("heading-hierarchy","تسلسل عناوين المحتوى",!headings.some((h,i)=>h.level===1||!h.text||(i>0&&h.level>headings[i-1].level+1)),"عنوان الصفحة الرئيسي H1 تعرضه الصفحة تلقائيًا. استخدم H2 ثم H3 داخل المحتوى دون عناوين فارغة أو قفزات.",bodyField);
  if(words>250)add("subheadings","تقسيم النص الطويل",headings.length>0,"قسّم الموضوع الطويل إلى أقسام واضحة بعناوين فرعية مفيدة.",bodyField);
  add("paragraphs","سهولة قراءة الفقرات",!paragraphs.some(p=>p.split(/\s+/).length>90),"الفقرات الطويلة جدًا أصعب في المسح البصري؛ قسّمها دون حذف المعنى.",bodyField);
  const unsafe=links.filter(url=>!url.trim()||/^(?:javascript|data|vbscript):/i.test(url.trim()));
  add("link-safety","صلاحية روابط المحتوى",unsafe.length===0,unsafe.length?`${unsafe.length} رابط فارغ أو ذو بروتوكول غير آمن.`:"الفحص يشمل الصيغة فقط؛ لا يؤكد استجابة الصفحات المرتبطة.",bodyField,"error");
  const internalLinks=links.filter(url=>url.startsWith("/")&&!url.startsWith("//")).length;
  if(words>150)add("internal-links","الربط الداخلي",internalLinks>0,"اربط المحتوى بصفحة أو مشروع مناسب عند وجود رابط موثق؛ لا تضف روابط عشوائية.",bodyField);
  add("image-alt","الوصف البديل للصورة الرئيسية",Boolean(values.imageAlt?.trim()),"صف مضمون الصورة الفعلي بإيجاز. لا تستنتج تفاصيل لم تُراجع بصريًا.","imageAlt");
  if(images.length)add("inline-image-alt","وصف الصور داخل المحتوى",images.every(image=>image.alt.trim()),`${images.filter(image=>!image.alt.trim()).length} صورة داخل المحتوى دون وصف بديل.`,bodyField);
  add("social-title","عنوان المشاركة",Boolean(values.ogTitle || title),values.ogTitle?"عنوان مشاركة مخصص لهذه اللغة.":"يُستخدم عنوان البحث عند ترك عنوان المشاركة فارغًا.","ogTitle");
  add("social-image","صورة المشاركة",Boolean(values.ogImage),"راجع صورة المشاركة وأبعادها في تبويب المشاركة. قد تستخدم الصفحة الصورة الرئيسية عند عدم تخصيص صورة.","ogImage");
  let faq:unknown=[];try{faq=JSON.parse(values.faqContent || "[]");}catch{faq=null;}
  const faqRows=Array.isArray(faq)?faq as Array<{q?:unknown;a?:unknown}>:null;
  add("faq","الأسئلة الشائعة والبيانات المنظمة",Boolean(faqRows&&faqRows.every(row=>row&&typeof row.q==="string"&&row.q.trim()&&typeof row.a==="string"&&row.a.trim())&&new Set(faqRows.map(row=>normalize(String(row.q)))).size===faqRows.length),"الأسئلة اختيارية. إذا أضفتها، أكمل السؤال والإجابة وتجنب تكرار السؤال؛ تُعرض مع البيانات المنظمة المطابقة.","faqContent");
  if(locale!=="ar"&&content.length>80){const arabic=(content.match(/[\u0621-\u064a]/g)||[]).length;add("translation-language","لغة النص",arabic/content.length<0.6,"راجع بقاء نص عربي طويل في النسخة المترجمة، مع الحفاظ على الآيات والنصوص المقصودة بالعربية.",bodyField);}
  add("indexing","السماح بالفهرسة",values.seoNoIndex!=="true",values.seoNoIndex==="true"?"هذه اللغة مضبوطة على noindex. غيّرها فقط إذا كان نشرها في البحث مقصودًا.":"الفهرسة مسموحة في إعدادات هذه اللغة؛ لا يضمن ذلك الزحف أو الظهور.","seoNoIndex");
  return{findings,words,headingCount:headings.length,internalLinks,imageCount:images.length};
}
