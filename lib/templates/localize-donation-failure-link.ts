import { isValidLocale as publicLocale, SUPPORTED_LOCALES as PUBLIC_LOCALES, DEFAULT_LOCALE } from "@/lib/locales";
import { ALL_LOCALES, isKnownLocale } from "@/lib/ported-systems/locales";
import { SYSTEM_HOSTS } from "@/lib/ported-systems/brand";
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
export function localizeDonationFailureLinks(content:string,locale:string):string{
 if(!content||!isKnownLocale(locale))return content;
 const target=publicLocale(locale)?locale:(PUBLIC_LOCALES as readonly string[]).includes("en")?"en":DEFAULT_LOCALE;
 const hosts=[...SYSTEM_HOSTS].map(escape).join("|");
 const expression=new RegExp('(^|[^A-Za-z0-9.:/-])(https?:\\/\\/(?:'+hosts+'))?\\/(?:'+ALL_LOCALES.join("|")+')\\/donation-failed(?=[?#/\\s"\'<>)]|$)',"gi");
 return content.replace(expression,(_match,boundary:string,origin:string|undefined)=>boundary+(origin||"")+"/"+target+"/donation-failed");
}
export function localizeDonationFailureDraft<T extends{body:string;buttons?:Array<{url?:string|null}>}>(draft:T,locale:string):T{
 return{...draft,body:localizeDonationFailureLinks(draft.body,locale),...(draft.buttons?{buttons:draft.buttons.map(button=>({...button,...(typeof button.url==="string"?{url:localizeDonationFailureLinks(button.url,locale)}:{})}))}:{})}as T;
}
