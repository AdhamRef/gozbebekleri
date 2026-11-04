import SYSTEM_MESSAGES from "@/lib/ported-systems/messages.json";
import { SYSTEM_BRAND_NAME, SYSTEM_ORIGIN } from "@/lib/ported-systems/brand";
import messages_ar from "./messages/ar.json";
import messages_de from "./messages/de.json";
import messages_en from "./messages/en.json";
import messages_es from "./messages/es.json";
import messages_fr from "./messages/fr.json";
import messages_id from "./messages/id.json";
import messages_pt from "./messages/pt.json";
import messages_tr from "./messages/tr.json";
export type MessageObject = Record<string, unknown>;
const current: Record<string, MessageObject> = { ar:messages_ar,de:messages_de,en:messages_en,es:messages_es,fr:messages_fr,id:messages_id,pt:messages_pt,tr:messages_tr };
function merge(base: MessageObject, override: MessageObject): MessageObject {
 const out={...base};
 for (const [key,value] of Object.entries(override)) {
  const previous=out[key];
  out[key]=previous && value && typeof previous==="object" && typeof value==="object" && !Array.isArray(previous) && !Array.isArray(value) ? merge(previous as MessageObject,value as MessageObject) : value;
 }
 return out;
}
function brand(value: unknown): unknown {
 if(typeof value==="string") return value.replaceAll("{{institution.name}}",SYSTEM_BRAND_NAME).replaceAll("{{institution.url}}",SYSTEM_ORIGIN);
 if(Array.isArray(value))return value.map(brand);
 if(value && typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,brand(item)]));
 return value;
}
export const DEFAULT_MESSAGE_LOCALE = "ar";
export function messagesFor(locale:string): MessageObject {
 const system=(SYSTEM_MESSAGES as Record<string,MessageObject>)[locale] || SYSTEM_MESSAGES.en;
 return brand(merge(system,current[locale] || current.en || {})) as MessageObject;
}
export const SHELL_NAMESPACES = ["common","navigation","system","validation"] as const;
export const LEGACY_NAMESPACES = [] as const;
export function pickNamespaces(locale:string,namespaces:readonly string[]):MessageObject {
 const all=messagesFor(locale);
 return Object.fromEntries(namespaces.filter(ns=>all[ns]!==undefined).map(ns=>[ns,all[ns]]));
}
