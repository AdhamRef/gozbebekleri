import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildDonationExport, type DonationExportRow } from "../../lib/dashboard/donation-export";
import { settledProfileUsdValue } from "../../lib/minbar/profile-donation-stats";
import { reportDonationPeriodWhere } from "../../lib/dashboard/report-donation-filter";

/**
 * All examples are synthetic. This exercises actual XLSX/CSV serialization,
 * not merely source-text matches or mocked Excel totals.
 */
const created = (value: string) => new Date(value);
const donor = { id: "synthetic-donor", name: "Fixture donor", email: "fixture@example.invalid", phone: null, countryCode: "TR" };
function row(id: string, status: string, creation: string, settlement: string | null, amount: number,
  currency: string, support: number, fees: number, usd: number | null,
  subscriptionId: string | null = null, frequency: "DAILY" | "FRIDAY" | "MONTHLY" | null = null): DonationExportRow {
  return {
    id, status, createdAt: created(creation), paidAt: settlement ? created(settlement) : null,
    donor, donorCountryCode: "TR", locale: "ar", currency, amount,
    amountUSD: usd, teamSupport: support, fees, totalAmount: amount + support + fees, coverFees: fees > 0,
    type: subscriptionId ? "MONTHLY" : "ONE_TIME", frequency, subscriptionId,
    campaigns: [], categories: [], referral: null, paymentMethod: "CARD", provider: "STRIPE",
    providerOrderId: null, providerErrorMessage: null, comment: null, attribution: null,
  };
}
const fixture = [
  row("usd-one", "PAID", "2026-10-31T20:00:00Z", "2026-11-01T02:00:00Z", 10, "USD", 2, 1, 13),
  row("try-one", "PAID", "2026-11-02T00:00:00Z", "2026-11-02T08:00:00Z", 1000, "TRY", 100, 0, 33),
  row("daily", "PAID", "2026-11-02T09:00:00Z", "2026-11-02T10:00:00Z", 2, "USD", 0, 0, 2, "plan-a", "DAILY"),
  row("friday", "PAID", "2026-11-06T10:00:00Z", "2026-11-06T11:00:00Z", 5, "USD", 1, 0, 6, "plan-b", "FRIDAY"),
  row("monthly", "PAID", "2026-11-04T10:00:00Z", "2026-11-04T11:00:00Z", 20, "USD", 0, 0, 20, "plan-c", "MONTHLY"),
  row("failed", "FAILED", "2026-11-03T10:00:00Z", null, 500, "USD", 0, 0, 500),
  row("unsettled", "PAID", "2026-11-04T10:00:00Z", null, 400, "USD", 0, 0, 400),
  row("oct-settled", "PAID", "2026-10-30T10:00:00Z", "2026-10-31T09:00:00Z", 70, "USD", 0, 0, 70),
];
function inRange(date: Date | null, from: Date, to: Date): boolean {
  return Boolean(date && date >= from && date <= to);
}
test("November donor ledger reconciles actual Excel summary and CSV rows", async () => {
  const start = created("2026-11-01T00:00:00Z");
  const end = created("2026-11-30T23:59:59Z");
  const predicate = reportDonationPeriodWhere({ gte: start, lte: end });
  assert.ok(predicate?.OR);
  const selected = fixture.filter(r => inRange(
    r.status === "PAID" && r.paidAt ? r.paidAt : r.createdAt, start, end,
  ));
  assert.equal(selected.length, 7);
  const collected = selected.filter(r => r.status === "PAID" && Boolean(r.paidAt));
  assert.equal(collected.length, 5);
  const profileSum = selected.reduce((total, r) => total + settledProfileUsdValue({
    paymentStatus: r.status, paidAt: r.paidAt, currency: r.currency,
    totalAmount: r.totalAmount, amountUSD: r.amountUSD,
  }), 0);
  assert.equal(profileSum, 74);
  const xlsx = await buildDonationExport({ format: "xlsx", language: "en", title: "Synthetic reconciliation",
    filters: [], donations: selected });
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(xlsx.body as never);
  assert.equal(book.getWorksheet("Report summary")!.getCell("A7").value, profileSum);
  const csv = await buildDonationExport({ format: "csv", language: "en", title: "Synthetic reconciliation",
    filters: [], donations: selected });
  const csvText = csv.body.toString();
  for (const donation of selected) assert.ok(csvText.includes(donation.id), donation.id);
  assert.ok(!csvText.includes("oct-settled"));
  const rows = csvText.split(/\\r?\\n/).filter(line => selected.some(r => line.includes(r.id)));
  assert.equal(rows.length, 7);
  assert.equal(new Set(collected.map(r => r.subscriptionId).filter(Boolean)).size, 3);
});
