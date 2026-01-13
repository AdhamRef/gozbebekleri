import messages from '@/i18n/messages.json';
export function language(lg) {
    let dil = lg;
    if(dil != "ar" && dil != "en"){
        dil = "tr";
    }
    return messages[dil];
}