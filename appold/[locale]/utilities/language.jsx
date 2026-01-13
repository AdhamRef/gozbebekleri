"use client";
import { usePathname } from 'next/navigation'
import messages from '@/i18n/messages.json';
export function useLanguage(param) {
    const pathname = usePathname(); // Mevcut sayfa yolu
    let segments = pathname.split('/');
    if(segments[1] != "ar" && segments[1] != "en"){
        segments[1] = "tr";
    }
    const lang = segments[1];
    return messages[lang];
}
export function useLanguageBelirtec() {
    const pathname = usePathname(); // Mevcut sayfa yolu
    let segments = pathname.split('/');

    if(segments[1] == "ar"){
        return "/ar";
    } 

    if(segments[1] == "en"){
        return "/en";
    }
        
    if(segments[1] != "en" || segments[1] != "ar"){
        return "";
    }
    
}