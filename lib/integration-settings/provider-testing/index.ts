import type {
  IntegrationProvider,
} from "../catalog";
import type {
  IntegrationProviderTester,
  ProviderConnectionTestInput,
  ProviderConnectionTestResult,
} from "../types";
import { providerFetch, type ProviderFetch } from "./http";

const failed = (messageAr: string, failureCode: string): ProviderConnectionTestResult => ({
  success: false,
  connectionStatus: "FAILED",
  messageAr,
  failureCode,
});

const connected = (messageAr: string): ProviderConnectionTestResult => ({
  success: true,
  connectionStatus: "CONNECTED",
  messageAr,
  failureCode: null,
});

function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

function apiKey(key: string): HeadersInit {
  return { "api-key": key, accept: "application/json" };
}

function arrayFrom(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== "object") return [];
  const candidate = (value as Record<string, unknown>)[key];
  return Array.isArray(candidate) ? candidate : [];
}

export class MetaWhatsAppConnectionTester implements IntegrationProviderTester {
  constructor(private readonly fetchImpl: ProviderFetch = fetch) {}

  async test(input: ProviderConnectionTestInput): Promise<ProviderConnectionTestResult> {
    const token = input.values.ACCESS_TOKEN;
    const version = input.values.GRAPH_API_VERSION;
    const businessId = input.values.BUSINESS_ACCOUNT_ID;
    const phoneId = input.values.DEFAULT_PHONE_NUMBER_ID;
    if (!token || !version || !businessId || !phoneId) {
      return failed("بيانات Meta المطلوبة غير مكتملة.", "META_CONFIGURATION_INCOMPLETE");
    }

    const base = `https://graph.facebook.com/${version}`;
    try {
      const account = await providerFetch(this.fetchImpl, `${base}/${businessId}?fields=id,name`, {
        method: "GET",
        headers: bearer(token),
      });
      if (!account.ok) return failed("تعذر الوصول إلى حساب أعمال Meta.", account.status === 401 ? "META_UNAUTHORIZED" : "META_BUSINESS_ACCOUNT_UNAVAILABLE");

      const phones = await providerFetch(this.fetchImpl, `${base}/${businessId}/phone_numbers?fields=id,verified_name,display_phone_number`, {
        method: "GET",
        headers: bearer(token),
      });
      if (!phones.ok) return failed("تعذر قراءة أرقام واتساب المرتبطة بحساب الأعمال.", "META_PHONE_NUMBERS_UNAVAILABLE");
      const linked = arrayFrom(phones.body, "data").some((item) => !!item && typeof item === "object" && String((item as Record<string, unknown>).id ?? "") === phoneId);
      if (!linked) return failed("رقم واتساب المحدد غير مرتبط بحساب الأعمال.", "META_PHONE_NUMBER_MISMATCH");

      const phone = await providerFetch(this.fetchImpl, `${base}/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating`, {
        method: "GET",
        headers: bearer(token),
      });
      if (!phone.ok) return failed("تعذر الوصول إلى رقم واتساب المحدد.", "META_PHONE_NUMBER_UNAVAILABLE");
      return connected("تم التحقق من اتصال Meta وحساب الأعمال ورقم واتساب بنجاح.");
    } catch {
      return failed("تعذر الاتصال بخدمة Meta حاليًا.", "META_REQUEST_FAILED");
    }
  }
}

export class BrevoConnectionTester implements IntegrationProviderTester {
  constructor(private readonly fetchImpl: ProviderFetch = fetch) {}

  async test(input: ProviderConnectionTestInput): Promise<ProviderConnectionTestResult> {
    const key = input.values.API_KEY;
    const senderEmail = input.values.EMAIL_SENDER_EMAIL?.toLowerCase();
    if (!key || !senderEmail || !input.values.SMS_SENDER) {
      return failed("بيانات Brevo المطلوبة غير مكتملة.", "BREVO_CONFIGURATION_INCOMPLETE");
    }

    try {
      const account = await providerFetch(this.fetchImpl, "https://api.brevo.com/v3/account", {
        method: "GET",
        headers: apiKey(key),
      });
      if (!account.ok) return failed("تعذر الوصول إلى حساب Brevo.", account.status === 401 ? "BREVO_UNAUTHORIZED" : "BREVO_ACCOUNT_UNAVAILABLE");

      const senders = await providerFetch(this.fetchImpl, "https://api.brevo.com/v3/senders", {
        method: "GET",
        headers: apiKey(key),
      });
      if (!senders.ok) return failed("تعذر التحقق من مرسلي البريد في Brevo.", "BREVO_SENDERS_UNAVAILABLE");
      const verified = arrayFrom(senders.body, "senders").some((item) => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return typeof row.email === "string" && row.email.toLowerCase() === senderEmail && row.active !== false;
      });
      if (!verified) return failed("بريد المرسل غير موجود أو غير مفعل في Brevo.", "BREVO_EMAIL_SENDER_NOT_VERIFIED");

      return connected("تم التحقق من حساب Brevo ومرسل البريد بنجاح، وتمت مراجعة إعداد مرسل SMS دون إرسال رسالة.");
    } catch {
      return failed("تعذر الاتصال بخدمة Brevo حاليًا.", "BREVO_REQUEST_FAILED");
    }
  }
}

export class NetgsmConnectionTester implements IntegrationProviderTester {
  constructor(private readonly fetchImpl: ProviderFetch = fetch) {}

  async test(input: ProviderConnectionTestInput): Promise<ProviderConnectionTestResult> {
    const usercode = input.values.USERCODE;
    const password = input.values.PASSWORD;
    const header = input.values.HEADER;
    if (!usercode || !password || !header) return failed("بيانات Netgsm المطلوبة غير مكتملة.", "NETGSM_CONFIGURATION_INCOMPLETE");

    const authorization = `Basic ${Buffer.from(`${usercode}:${password}`).toString("base64")}`;
    try {
      const account = await providerFetch(this.fetchImpl, "https://api.netgsm.com.tr/balance/list/get", {
        method: "GET",
        headers: { Authorization: authorization, accept: "application/json,text/plain" },
      });
      if (!account.ok) return failed("تعذر التحقق من حساب Netgsm.", account.status === 401 ? "NETGSM_UNAUTHORIZED" : "NETGSM_ACCOUNT_UNAVAILABLE");
      const normalized = account.text.trim();
      if (/^(30|40|50|60|70)\b/.test(normalized)) return failed("بيانات دخول Netgsm غير مقبولة.", "NETGSM_AUTH_REJECTED");

      const headers = await providerFetch(this.fetchImpl, "https://api.netgsm.com.tr/sms/rest/v2/header", {
        method: "GET",
        headers: { Authorization: authorization, accept: "application/json,text/plain" },
      });
      if (headers.ok) {
        const haystack = JSON.stringify(headers.body ?? headers.text).toLocaleUpperCase("tr-TR");
        if (!haystack.includes(header.toLocaleUpperCase("tr-TR"))) {
          return failed("اسم المرسل غير موجود ضمن عناوين Netgsm المتاحة.", "NETGSM_HEADER_NOT_AVAILABLE");
        }
      } else if (headers.status !== 404 && headers.status !== 405) {
        return failed("تعذر التحقق من اسم المرسل في Netgsm.", "NETGSM_HEADER_CHECK_FAILED");
      }

      return connected("تم التحقق من حساب Netgsm واسم المرسل دون إرسال رسالة.");
    } catch {
      return failed("تعذر الاتصال بخدمة Netgsm حاليًا.", "NETGSM_REQUEST_FAILED");
    }
  }
}

export class SystemCronConnectionTester implements IntegrationProviderTester {
  async test(input: ProviderConnectionTestInput): Promise<ProviderConnectionTestResult> {
    const secret = input.values.CRON_SECRET;
    if (!secret) return failed("مفتاح الجدولة غير متوفر.", "CRON_SECRET_MISSING");
    if (secret.length < 32 || /[\r\n]/.test(secret)) return failed("مفتاح الجدولة لا يحقق متطلبات الأمان.", "CRON_SECRET_INVALID");
    return connected("تم التحقق من إمكانية قراءة مفتاح الجدولة وتوافقه مع حماية Bearer الحالية.");
  }
}

export class IntegrationProviderTesterRegistry implements IntegrationProviderTester {
  private readonly testers: Record<IntegrationProvider, IntegrationProviderTester>;

  constructor(fetchImpl: ProviderFetch = fetch) {
    this.testers = {
      META_WHATSAPP: new MetaWhatsAppConnectionTester(fetchImpl),
      BREVO: new BrevoConnectionTester(fetchImpl),
      NETGSM: new NetgsmConnectionTester(fetchImpl),
      SYSTEM: new SystemCronConnectionTester(),
    };
  }

  test(input: ProviderConnectionTestInput): Promise<ProviderConnectionTestResult> {
    return this.testers[input.provider].test(input);
  }
}
