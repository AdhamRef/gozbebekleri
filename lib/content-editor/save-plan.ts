import type { ContentKind, TextValues } from './contracts';
export type ReviewedProposalSave = { locale: string; values: TextValues; action: string };

// Build the request from the captured proposal and current drafts in one step.
// Updating React state and immediately saving would read the previous draft.
export function prepareEditorSave(kind: ContentKind, saved: Record<string, TextValues>, drafts: Record<string, TextValues>, activeLocale: string, reviewed: boolean, proposal?: ReviewedProposalSave) {
  const values = proposal ? { ...drafts, [proposal.locale]: { ...drafts[proposal.locale], ...proposal.values } } : drafts;
  const localeChanges = Object.fromEntries(Object.entries(values).flatMap(([code, value]) => {
    const changes = Object.fromEntries(Object.entries(value).filter(([key, text]) =>
      !(code === 'ar' && ['campaigns', 'blog'].includes(kind) && key === 'image') && text !== saved[code]?.[key],
    ));
    return Object.keys(changes).length ? [[code, changes]] : [];
  }));
  const locale = proposal?.locale || (reviewed || localeChanges[activeLocale] ? activeLocale : 'ar');
  return { locale, changes: localeChanges[locale] || {}, localeChanges, reviewed: proposal ? true : reviewed };
}
