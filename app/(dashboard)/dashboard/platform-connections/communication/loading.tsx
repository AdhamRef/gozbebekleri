export default function CommunicationConnectionsLoading() {
  return (
    <main className="space-y-5" dir="rtl" aria-busy="true" aria-label="جاري تحميل إعدادات مزودي التواصل">
      <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
      </div>
      <div className="h-[520px] animate-pulse rounded-xl border border-slate-200 bg-white" />
    </main>
  );
}
