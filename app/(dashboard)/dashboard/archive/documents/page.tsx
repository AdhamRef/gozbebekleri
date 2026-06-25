import { ArchiveUploadedFilesManager } from "../_components/ArchiveUploadedFilesManager";

export const metadata = { title: "أرشفة المستندات | الأرشيف" };
export const dynamic = "force-dynamic";

export default function ArchiveDocumentsPage() {
  return (
    <ArchiveUploadedFilesManager
      category="DOCUMENTS"
      title="أرشفة المستندات"
      description="مساحة مخصصة لرفع وحفظ العقود، أوراق المؤسسة، التراخيص، الاتفاقيات، والمستندات الرسمية بصيغة PDF أو Excel."
    />
  );
}
