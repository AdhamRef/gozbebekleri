import type { IntegrationProvider } from "./catalog";
import type { SafeIntegrationProviderSnapshot } from "./types";

export type IntegrationUiStatus =
  | "READY"
  | "NEEDS_SETUP"
  | "PENDING_TEST"
  | "PENDING_ACTIVATION"
  | "TEST_FAILED"
  | "DISABLED"
  | "ENCRYPTION_ERROR"
  | "ENCRYPTION_KEY_MISSING";

export const INTEGRATION_UI_STATUS_LABEL: Record<IntegrationUiStatus, string> = {
  READY: "جاهز",
  NEEDS_SETUP: "يحتاج إعداد",
  PENDING_TEST: "تغييرات بانتظار الاختبار",
  PENDING_ACTIVATION: "نجح الاختبار وينتظر الاعتماد",
  TEST_FAILED: "فشل الاختبار",
  DISABLED: "معطل",
  ENCRYPTION_ERROR: "خطأ في التشفير",
  ENCRYPTION_KEY_MISSING: "مفتاح التشفير غير مضبوط",
};

export const PROVIDER_USAGE: Record<IntegrationProvider, string> = {
  META_WHATSAPP: "إرسال واتساب عبر Meta Cloud API",
  BREVO: "إرسال الإيميل وSMS للأرقام الدولية",
  NETGSM: "إرسال SMS إلى أرقام تركيا +90",
  SYSTEM: "حماية وتشغيل الجدولة التلقائية",
};

export const PROVIDER_UI_LABEL: Record<IntegrationProvider, string> = {
  META_WHATSAPP: "Meta WhatsApp",
  BREVO: "Brevo",
  NETGSM: "Netgsm",
  SYSTEM: "الجدولة Cron",
};

export const FIELD_HELP: Record<string, string> = {
  ACCESS_TOKEN: "من Meta Business Manager ضمن إعدادات WhatsApp API ورمز الوصول الدائم.",
  APP_SECRET: "من إعدادات تطبيق Meta ضمن Basic Settings. يُستخدم للتحقق من App Secret Proof وتوقيع Webhook.",
  WEBHOOK_VERIFY_TOKEN: "قيمة تختارها داخل النظام، ثم تدخل القيمة نفسها عند إعداد Webhook في Meta.",
  BUSINESS_ACCOUNT_ID: "معرّف WhatsApp Business Account الظاهر في إعدادات WhatsApp Manager.",
  DEFAULT_PHONE_NUMBER_ID: "معرّف رقم الهاتف من صفحة API Setup داخل تطبيق Meta.",
  GRAPH_API_VERSION: "إصدار Graph API المستخدم، مثل v23.0.",
  API_KEY: "من Brevo: SMTP & API ثم API Keys.",
  EMAIL_SENDER_NAME: "الاسم الذي يظهر للمستلم في رسائل البريد.",
  EMAIL_SENDER_EMAIL: "بريد مرسل موثّق ومفعّل داخل Brevo.",
  SMS_SENDER: "اسم المرسل الدولي المسجل أو المسموح به داخل Brevo.",
  WEBHOOK_SECRET: "مفتاح داخلي للتحقق من أحداث Webhook الواردة من Brevo.",
  USERCODE: "رمز مستخدم Netgsm الخاص بالحساب.",
  PASSWORD: "كلمة مرور API لحساب Netgsm.",
  HEADER: "اسم المرسل المعتمد داخل حساب Netgsm.",
  CRON_SECRET: "مفتاح قوي لحماية مسار Cron باستخدام Authorization Bearer.",
};

export const ERROR_MESSAGES_AR: Record<string, string> = {
  META_UNAUTHORIZED: "رمز الوصول غير صالح أو انتهت صلاحيته.",
  META_APP_SECRET_MISMATCH: "App Secret لا يتوافق مع Access Token.",
  META_BUSINESS_ACCOUNT_UNAVAILABLE: "تعذر الوصول إلى حساب أعمال Meta.",
  META_PHONE_NUMBER_MISMATCH: "رقم واتساب المحدد لا يتبع حساب الأعمال.",
  META_PHONE_NUMBER_UNAVAILABLE: "تعذر الوصول إلى رقم واتساب المحدد.",
  BREVO_UNAUTHORIZED: "مفتاح Brevo غير صالح.",
  BREVO_EMAIL_SENDER_NOT_VERIFIED: "بريد المرسل غير موجود أو غير مفعل داخل Brevo.",
  NETGSM_AUTH_REJECTED: "بيانات دخول Netgsm غير صحيحة.",
  NETGSM_HEADER_NOT_AVAILABLE: "اسم المرسل غير متاح في حساب Netgsm.",
  CRON_SECRET_INVALID: "مفتاح الجدولة لا يحقق متطلبات الأمان.",
  CANDIDATE_NOT_VERIFIED: "يجب نجاح اختبار الاتصال قبل اعتماد الإعدادات.",
  CANDIDATE_VERSION_MISMATCH: "تم تغيير الإعدادات منذ آخر اختبار. أعد الاختبار من جديد.",
  ENCRYPTION_KEY_MISSING: "مفتاح تشفير إعدادات التكاملات غير مضبوط على السيرفر.",
  ENCRYPTION_KEY_INVALID: "مفتاح تشفير إعدادات التكاملات غير صالح.",
  MISSING_REQUIRED_FIELDS: "بعض البيانات المطلوبة غير مكتملة.",
};

export function uiStatus(snapshot: SafeIntegrationProviderSnapshot): IntegrationUiStatus {
  if (!snapshot.encryptionKeyConfigured && snapshot.fields.some((field) => field.isSecret && !field.configured)) return "ENCRYPTION_KEY_MISSING";
  if (!snapshot.enabled) return "DISABLED";
  if (snapshot.status === "ERROR") return "ENCRYPTION_ERROR";
  if (snapshot.candidate.hasChanges) {
    if (snapshot.candidate.lastTestResult === "SUCCESS" && snapshot.candidate.lastTestAt) return "PENDING_ACTIVATION";
    if (snapshot.candidate.lastTestResult === "FAILED") return "TEST_FAILED";
    return "PENDING_TEST";
  }
  return snapshot.status === "READY" ? "READY" : "NEEDS_SETUP";
}

export function safeErrorMessage(code: string | null | undefined, fallback: string): string {
  return code ? ERROR_MESSAGES_AR[code] ?? fallback : fallback;
}
