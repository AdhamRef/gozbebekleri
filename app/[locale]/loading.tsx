export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-[#025EB8]/15" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#025EB8] animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">…</p>
      </div>
    </div>
  );
}
