"use client";

import { ShieldAlert } from "lucide-react";
import { IntegrationProviderCards } from "./IntegrationProviderCards";
import { ProviderFieldsPanel } from "./ProviderFieldsPanel";
import type { IntegrationUiPermissions, IntegrationUiSnapshot, SchedulerUiStatus } from "./model";
import { useIntegrationSettings } from "./useIntegrationSettings";

export function IntegrationSettingsManager({ initialProviders, permissions, scheduler }: {
  initialProviders: IntegrationUiSnapshot[];
  permissions: IntegrationUiPermissions;
  scheduler: SchedulerUiStatus;
}) {
  const state = useIntegrationSettings(initialProviders);
  const encryptionMissing = !state.providers.filter((item) => item.provider !== "SYSTEM").every((item) => item.encryptionKeyConfigured);

  return (
    <div className="space-y-5">
      {encryptionMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">يجب إضافة مفتاح تشفير إعدادات التكاملات إلى إعدادات السيرفر قبل حفظ البيانات السرية.</p>
              <code className="mt-2 inline-block rounded bg-white px-2 py-1 text-xs">INTEGRATION_SETTINGS_ENCRYPTION_KEY</code>
              <p className="mt-2 text-xs">إعداد أولي يُنفذ مرة واحدة فقط. لا يمكن إدخال المفتاح أو توليده أو عرضه من هذه الصفحة.</p>
            </div>
          </div>
        </div>
      )}

      <IntegrationProviderCards providers={state.providers} active={state.active} onOpen={state.chooseProvider} />
      <ProviderFieldsPanel
        snapshot={state.snapshot}
        permissions={permissions}
        scheduler={scheduler}
        drafts={state.drafts}
        dirty={state.dirty}
        busy={state.busy}
        notice={state.notice}
        lastCandidateTest={state.lastCandidateTest}
        lastActiveTest={state.lastActiveTest}
        brevoWebhookReveal={state.brevoWebhookReveal}
        onDraft={state.updateDraft}
        onSave={state.saveChanges}
        onTestCandidate={state.testCandidate}
        onTestActive={state.testActive}
        onActivate={state.activateCandidate}
        onDiscard={state.discardCandidate}
        onRotateBrevoWebhook={state.rotateBrevoWebhook}
        onDelete={state.deleteField}
        onToggle={state.toggleProvider}
        onNotice={state.setNotice}
      />
    </div>
  );
}
