import { ArchiveUploadedFilesManager } from "../_components/ArchiveUploadedFilesManager";

export const metadata = { title: "ملفات المشاريع التسويقية | الأرشيف" };
export const dynamic = "force-dynamic";

export default function MarketingArchiveFilesPage() {
  return (
    <ArchiveUploadedFilesManager
      category="MARKETING"
      title="ملفات المشاريع التسويقية"
      description="مساحة مخصصة لرفع ملفات PDF وExcel الخاصة بخطط المشاريع، نتائج الحملات، التقارير التسويقية، أو أي ملفات يحتاجها فريق التسويق."
    />
  );
}
