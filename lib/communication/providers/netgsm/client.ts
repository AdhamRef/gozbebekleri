/** Retired transport. Kept only so historical imports cannot send SMS. */
import type { ActiveRuntimeConfig, NetgsmRuntimeValues } from "../../runtime-config";
import type { NetgsmSmsInput, NetgsmSendResult } from "./types";
export { isTurkishNumber } from "./types";
export type NetgsmRuntimeConfig = ActiveRuntimeConfig<NetgsmRuntimeValues>;
export async function isNetgsmConfigured(_runtime?: NetgsmRuntimeConfig): Promise<boolean> { return false; }
export async function sendNetgsmSms(_input: NetgsmSmsInput, _countryCode?: string | null, _runtime?: NetgsmRuntimeConfig): Promise<NetgsmSendResult> {
  return { ok: false, reason: "CHANNEL_REMOVED" };
}
