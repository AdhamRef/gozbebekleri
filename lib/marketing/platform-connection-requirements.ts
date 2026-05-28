/**
 * Per-platform configuration requirements + readiness scoring for the
 * Marketing Platform Connections page.
 *
 * This file is intentionally UI/API reusable. It defines the marketer-facing
 * checklist, Arabic guidance, and the readiness score used by the connections
 * dashboard, create/update APIs, test endpoints, and future sync jobs.
 */

export type PlatformCategory = "ADS" | "ANALYTICS" | "MESSAGING" | "EMAIL" | "CUSTOM";
export type PlatformKey =
  | "META"
  | "GOOGLE_ADS"
  | "TIKTOK"
  | "X"
  | "GA4"
  | "TWILIO"
  | "EMAIL_PROVIDER"
  | "WHATSAPP_PROVIDER"
  | "SMS_PROVIDER"
  | "CUSTOM";

export type ConnectionStatus =
  | "ACTIVE"
  | "DISABLED"
  | "MISSING_CONFIG"
  | "AUTH_ERROR"
  | "PERMISSION_ERROR"
  | "SYNC_ERROR"
  | "NOT_IMPLEMENTED";

export interface RequirementField {
  field: string;
  labelAr: string;
  secret: boolean;
  guidanceAr: string;
}

export interface PlatformRequirements {
  platform: PlatformKey;
  category: PlatformCategory;
  labelAr: string;
  required: RequirementField[];
  optional: RequirementField[];
  setupGuideAr: string;
}

const META_GUIDE: PlatformRequirements = {
  platform: "META",
  category: "ADS",
  labelAr: "Meta Ads",
  required: [
    {
      field: "accountId",
      labelAr: "Ad Account ID",
      secret: false,
      guidanceAr: "ناقص Ad Account ID. ستجده في Meta Ads Manager بصيغة act_XXXXXXXX.",
    },
    {
      field: "accessToken",
      labelAr: "Access Token",
      secret: true,
      guidanceAr: "ناقص Access Token. يمكنك الحصول عليه من Meta Business Settings > Users > System Users > Generate Token.",
    },
    {
      field: "pixelId|datasetId",
      labelAr: "Pixel ID أو Dataset ID",
      secret: false,
      guidanceAr: "ناقص Pixel ID أو Dataset ID. ستجده في Events Manager داخل Meta.",
    },
  ],
  optional: [
    {
      field: "businessId",
      labelAr: "Business ID",
      secret: false,
      guidanceAr: "Business ID اختياري لكنه مفيد لإدارة الصلاحيات.",
    },
    {
      field: "appSecret",
      labelAr: "Meta App Secret",
      secret: true,
      guidanceAr: "مطلوب إذا كان Meta App يفرض appsecret_proof. استخدم App Secret الحقيقي من Meta Developers لنفس التطبيق الذي صدر منه Access Token. لا تستخدم Test Event Code هنا.",
    },
  ],
  setupGuideAr: "اربط حساب إعلانات Meta + Pixel/Dataset لتجهيز مزامنة الحملات. إذا ظهر خطأ appsecret_proof فأضف Meta App Secret الصحيح لنفس التطبيق.",
};

const GOOGLE_ADS_GUIDE: PlatformRequirements = {
  platform: "GOOGLE_ADS",
  category: "ADS",
  labelAr: "Google Ads",
  required: [
    {
      field: "accountId",
      labelAr: "Customer ID",
      secret: false,
      guidanceAr: "ناقص Customer ID. ستجده في أعلى حساب Google Ads.",
    },
    {
      field: "developerToken",
      labelAr: "Developer Token",
      secret: true,
      guidanceAr: "ناقص Developer Token. ستجده في Google Ads > Tools & Settings > API Center.",
    },
    {
      field: "appId",
      labelAr: "OAuth Client ID",
      secret: false,
      guidanceAr: "ناقص OAuth Client ID. أنشئه من Google Cloud Console > Credentials.",
    },
    {
      field: "clientSecret",
      labelAr: "OAuth Client Secret",
      secret: true,
      guidanceAr: "ناقص OAuth Client Secret. أنشئه من Google Cloud Console > Credentials.",
    },
    {
      field: "refreshToken",
      labelAr: "Refresh Token",
      secret: true,
      guidanceAr: "ناقص Refresh Token. يجب إكمال OAuth وربط حساب Google Ads.",
    },
  ],
  optional: [
    {
      field: "managerAccountId",
      labelAr: "Manager Customer ID",
      secret: false,
      guidanceAr: "Manager Customer ID مطلوب فقط إذا كان الحساب مُدار من MCC.",
    },
    {
      field: "conversionId",
      labelAr: "Conversion ID (AW-XXXXXXX)",
      secret: false,
      guidanceAr: "Conversion ID اختياري — مطلوب لاحقًا لربط Enhanced Conversions.",
    },
    {
      field: "conversionLabel",
      labelAr: "Conversion Label",
      secret: false,
      guidanceAr: "Conversion Label اختياري — مرافق لـ Conversion ID.",
    },
  ],
  setupGuideAr: "اربط Google Ads + OAuth + Developer Token لمزامنة الحملات والإنفاق لاحقًا.",
};

const TIKTOK_GUIDE: PlatformRequirements = {
  platform: "TIKTOK",
  category: "ADS",
  labelAr: "TikTok Ads",
  required: [
    {
      field: "advertiserId",
      labelAr: "Advertiser ID",
      secret: false,
      guidanceAr: "ناقص Advertiser ID. ستجده في TikTok Ads Manager أو Business Center.",
    },
    {
      field: "accessToken",
      labelAr: "Access Token",
      secret: true,
      guidanceAr: "ناقص Access Token. يجب إنشاء تطبيق أو Authorization من TikTok Marketing API.",
    },
    {
      field: "pixelId",
      labelAr: "Pixel Code",
      secret: false,
      guidanceAr: "ناقص Pixel Code. أنشئه من Events Manager في TikTok Ads.",
    },
  ],
  optional: [
    {
      field: "appId",
      labelAr: "App ID",
      secret: false,
      guidanceAr: "App ID اختياري — لتطبيق TikTok Marketing API عند الحاجة.",
    },
    {
      field: "appSecret",
      labelAr: "App Secret",
      secret: true,
      guidanceAr: "App Secret اختياري لتطبيق TikTok Marketing API عند الحاجة.",
    },
  ],
  setupGuideAr: "اربط TikTok Ads + Pixel Code لتجهيز مزامنة الحملات وEvents API لاحقًا.",
};

const X_GUIDE: PlatformRequirements = {
  platform: "X",
  category: "ADS",
  labelAr: "X / Twitter Ads",
  required: [
    {
      field: "accountId",
      labelAr: "Ad Account ID",
      secret: false,
      guidanceAr: "ناقص Ad Account ID. ستجده في X Ads Manager > Account Settings.",
    },
    {
      field: "accessToken",
      labelAr: "Access Token",
      secret: true,
      guidanceAr: "قد تحتاج إلى تفعيل Ads API access من X Developer Portal للحصول على Access Token.",
    },
  ],
  optional: [
    { field: "pixelId", labelAr: "Pixel ID", secret: false, guidanceAr: "Pixel ID اختياري — لتفعيل التحويلات لاحقًا." },
    { field: "conversionId", labelAr: "Conversion Event ID", secret: false, guidanceAr: "Conversion Event ID اختياري لقياس التبرعات." },
    { field: "refreshToken", labelAr: "Refresh Token", secret: true, guidanceAr: "Refresh Token اختياري — لتمديد صلاحية الـ Access Token." },
    { field: "appId", labelAr: "App Key", secret: false, guidanceAr: "App Key اختياري — جزء من تطبيق X Developer." },
    { field: "appSecret", labelAr: "App Secret", secret: true, guidanceAr: "App Secret اختياري — جزء من تطبيق X Developer." },
  ],
  setupGuideAr: "تفعيل Ads API access من X Developer Portal مطلوب قبل ربط الحساب.",
};

const GA4_GUIDE: PlatformRequirements = {
  platform: "GA4",
  category: "ANALYTICS",
  labelAr: "Google Analytics 4",
  required: [
    { field: "propertyId", labelAr: "Property ID", secret: false, guidanceAr: "ناقص Property ID. ستجده في GA4 Admin > Property Settings." },
    { field: "streamId", labelAr: "Stream ID", secret: false, guidanceAr: "ناقص Stream ID. ستجده في GA4 Data Streams." },
    { field: "apiSecret", labelAr: "Measurement Protocol API Secret", secret: true, guidanceAr: "ناقص API Secret. أنشئه من GA4 > Data Streams > Measurement Protocol API secrets." },
  ],
  optional: [
    { field: "appId", labelAr: "Measurement ID", secret: false, guidanceAr: "Measurement ID اختياري لكنه مفيد للمطابقة مع البكسل." },
  ],
  setupGuideAr: "اربط GA4 Data API / Measurement Protocol لتحليل الزيارات والتحويلات.",
};

const TWILIO_GUIDE: PlatformRequirements = {
  platform: "TWILIO",
  category: "MESSAGING",
  labelAr: "Twilio",
  required: [
    { field: "accountId", labelAr: "Account SID", secret: false, guidanceAr: "ناقص Account SID من Twilio Console." },
    { field: "authToken", labelAr: "Auth Token", secret: true, guidanceAr: "ناقص Auth Token من Twilio Console." },
  ],
  optional: [
    { field: "messagingServiceSid", labelAr: "Messaging Service SID", secret: false, guidanceAr: "مفيد لإرسال SMS/WhatsApp عبر Messaging Service." },
    { field: "whatsappSender", labelAr: "WhatsApp Sender", secret: false, guidanceAr: "مثال: whatsapp:+14155238886" },
    { field: "smsSender", labelAr: "SMS Sender", secret: false, guidanceAr: "رقم SMS أو Sender ID." },
  ],
  setupGuideAr: "اربط Twilio لتتبع حملات الرسائل والواتساب لاحقًا.",
};

const EMAIL_GUIDE: PlatformRequirements = {
  platform: "EMAIL_PROVIDER",
  category: "EMAIL",
  labelAr: "موفر البريد الإلكتروني",
  required: [
    { field: "accountId", labelAr: "Account ID", secret: false, guidanceAr: "معرّف الحساب لدى موفر البريد الإلكتروني." },
    { field: "apiSecret", labelAr: "API Key / Secret", secret: true, guidanceAr: "مفتاح API الخاص بموفر البريد الإلكتروني." },
  ],
  optional: [
    { field: "emailSender", labelAr: "Default Sender Email", secret: false, guidanceAr: "بريد الإرسال الافتراضي." },
  ],
  setupGuideAr: "اربط موفر البريد لتحليل حملات البريد الإلكتروني لاحقًا.",
};

const WHATSAPP_GUIDE: PlatformRequirements = {
  platform: "WHATSAPP_PROVIDER",
  category: "MESSAGING",
  labelAr: "موفر WhatsApp",
  required: [
    { field: "accountId", labelAr: "Business / Account ID", secret: false, guidanceAr: "معرّف حساب WhatsApp Business أو الموفر." },
    { field: "accessToken", labelAr: "Access Token", secret: true, guidanceAr: "مفتاح الوصول الخاص بموفر WhatsApp." },
  ],
  optional: [
    { field: "whatsappSender", labelAr: "WhatsApp Sender", secret: false, guidanceAr: "رقم أو قناة الإرسال." },
  ],
  setupGuideAr: "اربط موفر WhatsApp لتحليل حملات الرسائل لاحقًا.",
};

const SMS_GUIDE: PlatformRequirements = {
  platform: "SMS_PROVIDER",
  category: "MESSAGING",
  labelAr: "موفر SMS",
  required: [
    { field: "accountId", labelAr: "Account ID", secret: false, guidanceAr: "معرّف الحساب لدى موفر SMS." },
    { field: "apiSecret", labelAr: "API Key / Secret", secret: true, guidanceAr: "مفتاح API الخاص بموفر SMS." },
  ],
  optional: [
    { field: "smsSender", labelAr: "SMS Sender", secret: false, guidanceAr: "اسم أو رقم المرسل." },
  ],
  setupGuideAr: "اربط موفر SMS لتحليل حملات الرسائل لاحقًا.",
};

const CUSTOM_GUIDE: PlatformRequirements = {
  platform: "CUSTOM",
  category: "CUSTOM",
  labelAr: "موفر مخصص",
  required: [
    { field: "name", labelAr: "اسم الاتصال", secret: false, guidanceAr: "اكتب اسمًا واضحًا للاتصال المخصص." },
  ],
  optional: [
    { field: "accountId", labelAr: "Account ID", secret: false, guidanceAr: "معرّف اختياري للموفر." },
    { field: "apiSecret", labelAr: "API Secret", secret: true, guidanceAr: "مفتاح سري اختياري للموفر." },
  ],
  setupGuideAr: "استخدم الاتصال المخصص لتوثيق أي مصدر تسويق غير مدعوم بعد.",
};

export const ALL_PLATFORM_REQUIREMENTS: Record<PlatformKey, PlatformRequirements> = {
  META: META_GUIDE,
  GOOGLE_ADS: GOOGLE_ADS_GUIDE,
  TIKTOK: TIKTOK_GUIDE,
  X: X_GUIDE,
  GA4: GA4_GUIDE,
  TWILIO: TWILIO_GUIDE,
  EMAIL_PROVIDER: EMAIL_GUIDE,
  WHATSAPP_PROVIDER: WHATSAPP_GUIDE,
  SMS_PROVIDER: SMS_GUIDE,
  CUSTOM: CUSTOM_GUIDE,
};

export function getPlatformRequirements(platform: PlatformKey): PlatformRequirements {
  return ALL_PLATFORM_REQUIREMENTS[platform] ?? CUSTOM_GUIDE;
}
