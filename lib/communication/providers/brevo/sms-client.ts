/** Retired transport. Kept only so historical imports cannot send SMS. */
import type { ActiveRuntimeConfig, BrevoSmsRuntimeValues } from "../../runtime-config";
import type { BrevoSmsInput, BrevoSendResult } from "./types";
export type BrevoSmsRuntimeConfig = ActiveRuntimeConfig<BrevoSmsRuntimeValues>;
export async function isBrevoSmsConfigured(_runtime?: BrevoSmsRuntimeConfig): Promise<boolean> { return false; }
export async function sendBrevoSms(_input: BrevoSmsInput, _runtime?: BrevoSmsRuntimeConfig): Promise<BrevoSendResult> {
  return { ok: false, reason: "CHANNEL_REMOVED" };
}
