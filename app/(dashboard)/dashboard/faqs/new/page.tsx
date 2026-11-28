"use client";

import { FaqForm, emptyFaq } from "../_components/FaqForm";

/**
 * Gozbebekleri keeps its own content editor (workflow, revisions), which has no FAQ kind, so FAQs are
 * created and edited with their plain form. The section layout enforces the siteContent permission.
 */
export default function Page() {
  return <FaqForm mode="create" initial={emptyFaq()} />;
}
