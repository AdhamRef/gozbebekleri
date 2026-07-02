export type TemplateVariable = {
  key: string;
  label: string;
  sample: string;
  category: "donor" | "donation" | "campaign" | "system";
};

export const communicationTemplateVariables: TemplateVariable[] = [
  { key: "donor_name", label: "اسم المتبرع", sample: "Ahmet Yılmaz", category: "donor" },
  { key: "amount", label: "قيمة التبرع", sample: "500", category: "donation" },
  { key: "currency", label: "العملة", sample: "TRY", category: "donation" },
  { key: "campaign_name", label: "اسم الحملة", sample: "Gazze Acil Yardım", category: "campaign" },
  { key: "donation_id", label: "رقم التبرع", sample: "DN-10245", category: "donation" },
  { key: "receipt_url", label: "رابط الإيصال", sample: "https://example.org/receipt/DN-10245", category: "donation" },
  { key: "payment_retry_url", label: "رابط إعادة الدفع", sample: "https://example.org/retry/DN-10245", category: "donation" },
  { key: "language", label: "اللغة", sample: "tr", category: "system" },
];

export function sampleVariablesMap() {
  return Object.fromEntries(communicationTemplateVariables.map((item) => [item.key, item.sample]));
}

export function knownVariableKeys() {
  return communicationTemplateVariables.map((item) => item.key);
}
