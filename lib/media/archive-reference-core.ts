export type ArchiveMetadataRow = { id: string; metadata: unknown };

export type ArchiveReferencePageReader = (args: {
  cursor?: string;
  take: number;
}) => Promise<ArchiveMetadataRow[]>;

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function hasArchiveBlobReference(input: {
  currentId: string;
  pathname: string;
  readPage: ArchiveReferencePageReader;
  pageSize?: number;
}): Promise<boolean> {
  const pageSize = input.pageSize ?? 250;
  let cursor: string | undefined;
  while (true) {
    const rows = await input.readPage({ cursor, take: pageSize });
    for (const row of rows) {
      if (row.id === input.currentId) continue;
      if (metadataObject(row.metadata).blobPathname === input.pathname) return true;
    }
    if (rows.length < pageSize) return false;
    cursor = rows.at(-1)?.id;
    if (!cursor) return false;
  }
}
