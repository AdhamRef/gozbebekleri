import 'server-only'
 
const dictionaries = {
  tr: () => import('./tr.json').then((module) => module.default),
  en: () => import('./en.json').then((module) => module.default),
}
 
export const getDictionary = async (locale) => dictionaries[locale]()