import fs from "node:fs";

const files = new Map([
  ["app/(dashboard)/dashboard/campaigns/new/page.tsx", "campaigns"],
  ["app/(dashboard)/dashboard/campaigns/edit/[id]/page.tsx", "campaigns"],
  ["app/(dashboard)/dashboard/blog/create/_components/BlogLocaleEditor.tsx", "blog"],
  ["app/(dashboard)/dashboard/blog/create/_components/BlogLocaleBufferEditor.tsx", "blog"],
  ["app/[locale]/blog/_components/BlogEditor.jsx", "blog"],
  ["app/[locale]/blog/_components/_components/image-form.tsx", "blog"],
  ["app/[locale]/blog/_components/wysiwyg/toolbar.tsx", "blog"],
  ["app/[locale]/blog/_components/wysiwyg/extensions/slash-command.tsx", "blog"],
  ["app/(dashboard)/dashboard/slides/new/page.tsx", "slides"],
  ["app/(dashboard)/dashboard/slides/edit/[id]/page.tsx", "slides"],
  ["app/(dashboard)/dashboard/categories/new/page.tsx", "categories"],
  ["app/(dashboard)/dashboard/categories/edit/[id]/page.tsx", "categories"],
]);

const helperImport = 'import { uploadDashboardMediaRequest, deleteUnsavedDashboardMedia } from "@/lib/media/client";';

for (const [path, scope] of files) {
  if (!fs.existsSync(path)) continue;
  let source = fs.readFileSync(path, "utf8");
  const original = source;

  source = source.replace(
    /axios\.post\(\s*(["'])\/api\/upload\1\s*,\s*formData\s*\)/g,
    `uploadDashboardMediaRequest(formData, "${scope}")`,
  );

  source = source.replace(
    /const\s+publicId\s*=\s*([A-Za-z_$][\w$]*)\.split\([^;]+;\s*if\s*\(publicId\)\s*\{\s*await\s+axios\.delete\(\s*`\/api\/upload\?publicId=\$\{publicId\}`\s*\);?\s*\}/g,
    `await deleteUnsavedDashboardMedia($1, "${scope}");`,
  );

  source = source.replace(
    /const\s+publicId\s*=\s*([A-Za-z_$][\w$]*)\.split\([^;]+;\s*if\s*\(publicId\)\s*axios\.delete\(\s*`\/api\/upload\?publicId=\$\{publicId\}`\s*\)\.catch\(\(\)\s*=>\s*\{\}\);?/g,
    `deleteUnsavedDashboardMedia($1, "${scope}").catch(() => {});`,
  );

  source = source.replace(
    /axios\.delete\(\s*`\/api\/upload\?publicId=\$\{([A-Za-z_$][\w$]*)\.split\([^}]+\}`\s*\)\.catch\(\(\)\s*=>\s*\{\}\)/g,
    `deleteUnsavedDashboardMedia($1, "${scope}").catch(() => {})`,
  );

  source = source.replace(
    /await\s+axios\.delete\(\s*`\/api\/upload\?publicId=\$\{([A-Za-z_$][\w$]*)\}`\s*\);?/g,
    `await deleteUnsavedDashboardMedia($1, "${scope}");`,
  );

  if (source.includes("/api/upload?publicId")) {
    throw new Error(`Unsafe publicId delete remains in ${path}`);
  }
  if (/axios\.post\(\s*["']\/api\/upload["']/.test(source)) {
    throw new Error(`Unscoped upload remains in ${path}`);
  }

  if (source !== original && !source.includes("@/lib/media/client")) {
    const importEnd = source.indexOf("\n", source.indexOf("import "));
    source = source.slice(0, importEnd + 1) + helperImport + "\n" + source.slice(importEnd + 1);
  }
  if (source !== original) fs.writeFileSync(path, source);
}

fs.rmSync("scripts/secure-media-callers.mjs", { force: true });
fs.rmSync(".github/workflows/secure-media-callers.yml", { force: true });
