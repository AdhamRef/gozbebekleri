import fs from "node:fs";
import path from "node:path";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value); }
function replaceOnce(source, search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(search, replacement);
}
function replaceRegex(source, regex, replacement, label) {
  const matches = source.match(regex);
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches?.length ?? 0}`);
  return source.replace(regex, replacement);
}

function convertCampaignNew() {
  const file = "app/(dashboard)/dashboard/campaigns/new/page.tsx";
  let s = read(file);
  s = replaceOnce(s, "import axios from 'axios';", `import axios from 'axios';\nimport {\n  deleteUnsavedDashboardMedia,\n  markDashboardAssetPersisted,\n  uploadDashboardMedia,\n} from '@/lib/media/client';`, "campaign-new import");
  s = replaceOnce(s, "      await axios.post('/api/campaigns', requestData);\n      toast.success('تم إنشاء المشروع بنجاح');", `      await axios.post('/api/campaigns', requestData);\n      const persistedMedia = [\n        ...values.images,\n        values.image_en, values.image_fr, values.image_tr, values.image_id,\n        values.image_pt, values.image_es, values.image_de,\n      ].filter((url): url is string => Boolean(url));\n      persistedMedia.forEach(markDashboardAssetPersisted);\n      toast.success('تم إنشاء المشروع بنجاح');`, "campaign-new persist");
  s = replaceOnce(s, `      const formData = new FormData();\n      formData.append('file', file);\n      const response = await axios.post('/api/upload', formData);\n      form.setValue(\`image_\${locale}\` as LocaleImageKey, response.data?.url ?? '', {`, `      const asset = await uploadDashboardMedia(file, 'campaigns');\n      form.setValue(\`image_\${locale}\` as LocaleImageKey, asset.url, {`, "campaign-new locale upload");
  s = replaceRegex(s, /  const removeLocaleImage = \(locale: 'en' \| 'fr' \| 'tr' \| 'id' \| 'pt' \| 'es' \| 'de'\) => \{[\s\S]*?\n  \};\n\n  const renderLocaleMedia/, `  const removeLocaleImage = async (locale: 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es' | 'de') => {\n    const key = \`image_\${locale}\` as LocaleImageKey;\n    const current = form.getValues(key);\n    if (current) await deleteUnsavedDashboardMedia(current, 'campaigns').catch(() => false);\n    form.setValue(key, '', { shouldDirty: true });\n  };\n\n  const renderLocaleMedia`, "campaign-new locale remove");
  s = replaceRegex(s, /    const uploadPromises = Array\.from\(files\)\.map\(async \(file\) => \{[\s\S]*?\n    \}\);/, `    const uploadPromises = Array.from(files).map(async (file) => {\n      const asset = await uploadDashboardMedia(file, 'campaigns');\n      return asset.url;\n    });`, "campaign-new uploads");
  s = replaceRegex(s, /  const removeImage = async \(index: number\) => \{[\s\S]*?\n  \};\n\n  const reorderImages/, `  const removeImage = async (index: number) => {\n    const currentImages = form.getValues('images');\n    const imageUrl = currentImages[index];\n    if (imageUrl) await deleteUnsavedDashboardMedia(imageUrl, 'campaigns').catch(() => false);\n    form.setValue('images', currentImages.filter((_, i) => i !== index));\n    toast.success('تم حذف الصورة بنجاح');\n  };\n\n  const reorderImages`, "campaign-new image remove");
  write(file, s);
}

function convertCampaignEdit() {
  const file = "app/(dashboard)/dashboard/campaigns/edit/[id]/page.tsx";
  let s = read(file);
  s = replaceOnce(s, "import axios from 'axios';", `import axios from 'axios';\nimport {\n  cleanupManagedDashboardMediaAfterSave,\n  deleteUnsavedDashboardMedia,\n  markDashboardAssetPersisted,\n  uploadDashboardMedia,\n} from '@/lib/media/client';`, "campaign-edit import");
  s = replaceOnce(s, `  const shareLabelsRef = useRef<ShareLabelsSectionRef>(null);`, `  const shareLabelsRef = useRef<ShareLabelsSectionRef>(null);\n  const removedCampaignMediaRef = useRef<Set<string>>(new Set());\n  const removedUpdateMediaRef = useRef<Set<string>>(new Set());\n\n  const detachMedia = async (url: string | null | undefined, bucket: React.MutableRefObject<Set<string>>) => {\n    if (!url) return;\n    const deletedUnsaved = await deleteUnsavedDashboardMedia(url, 'campaigns').catch(() => false);\n    if (!deletedUnsaved) bucket.current.add(url);\n  };\n\n  const cleanupAfterSave = async (bucket: React.MutableRefObject<Set<string>>) => {\n    const urls = [...bucket.current];\n    bucket.current.clear();\n    await Promise.all(urls.map((url) => cleanupManagedDashboardMediaAfterSave(url, 'campaigns').catch(() => false)));\n  };`, "campaign-edit cleanup refs");
  s = replaceOnce(s, `      await axios.put(\`/api/campaigns/\${params.id}\`, requestData);\n      toast.success('تم تحديث المشروع بنجاح');`, `      await axios.put(\`/api/campaigns/\${params.id}\`, requestData);\n      const persistedMedia = [\n        ...values.images,\n        values.image_en, values.image_fr, values.image_tr, values.image_id,\n        values.image_pt, values.image_es, values.image_de,\n      ].filter((url): url is string => Boolean(url));\n      persistedMedia.forEach(markDashboardAssetPersisted);\n      await cleanupAfterSave(removedCampaignMediaRef);\n      toast.success('تم تحديث المشروع بنجاح');`, "campaign-edit save cleanup");
  s = replaceOnce(s, `      const formData = new FormData();\n      formData.append('file', file);\n      const response = await axios.post('/api/upload', formData);\n      form.setValue(\`image_\${locale}\` as LocaleImageKey, response.data?.url ?? '', {`, `      const key = \`image_\${locale}\` as LocaleImageKey;\n      const previous = form.getValues(key);\n      const asset = await uploadDashboardMedia(file, 'campaigns');\n      if (previous) await detachMedia(previous, removedCampaignMediaRef);\n      form.setValue(key, asset.url, {`, "campaign-edit locale upload");
  s = replaceRegex(s, /  const removeLocaleImage = \(locale: 'en' \| 'fr' \| 'tr' \| 'id' \| 'pt' \| 'es' \| 'de'\) => \{[\s\S]*?\n  \};\n\n  const renderLocaleMedia/, `  const removeLocaleImage = async (locale: 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es' | 'de') => {\n    const key = \`image_\${locale}\` as LocaleImageKey;\n    const current = form.getValues(key);\n    if (current) await detachMedia(current, removedCampaignMediaRef);\n    form.setValue(key, '', { shouldDirty: true });\n  };\n\n  const renderLocaleMedia`, "campaign-edit locale remove");
  s = replaceRegex(s, /    const uploadPromises = Array\.from\(files\)\.map\(async \(file\) => \{[\s\S]*?\n    \}\);/, `    const uploadPromises = Array.from(files).map(async (file) => {\n      const asset = await uploadDashboardMedia(file, 'campaigns');\n      return asset.url;\n    });`, "campaign-edit uploads");
  s = replaceRegex(s, /  const removeImage = async \(index: number\) => \{[\s\S]*?\n  \};\n\n  const reorderImages/, `  const removeImage = async (index: number) => {\n    const currentImages = form.getValues('images');\n    const imageUrl = currentImages[index];\n    if (imageUrl) await detachMedia(imageUrl, removedCampaignMediaRef);\n    form.setValue('images', currentImages.filter((_, i) => i !== index));\n    toast.success('تم فصل الصورة؛ سيكتمل التنظيف بعد حفظ المشروع');\n  };\n\n  const reorderImages`, "campaign-edit image remove");
  s = replaceOnce(s, `    const formData = new FormData();\n    formData.append('file', file);\n\n    try {\n      const response = await axios.post('/api/upload', formData);\n      setUpdateImage(response.data.url);`, `    try {\n      const asset = await uploadDashboardMedia(file, 'campaigns');\n      if (updateImage) await detachMedia(updateImage, removedUpdateMediaRef);\n      setUpdateImage(asset.url);`, "campaign-edit update upload");
  s = replaceRegex(s, /  const removeUpdateImage = async \(\) => \{[\s\S]*?\n  \};\n\n  const handleAddUpdate/, `  const removeUpdateImage = async () => {\n    if (updateImage) await detachMedia(updateImage, removedUpdateMediaRef);\n    setUpdateImage('');\n    toast.success('تم فصل الصورة؛ سيكتمل التنظيف بعد حفظ التحديث');\n  };\n\n  const handleAddUpdate`, "campaign-edit update remove");
  s = replaceOnce(s, `      setUpdates(prev => [response.data, ...prev]);`, `      if (updateImage) markDashboardAssetPersisted(updateImage);\n      await cleanupAfterSave(removedUpdateMediaRef);\n      setUpdates(prev => [response.data, ...prev]);`, "campaign-add-update cleanup");
  s = replaceOnce(s, `      setUpdates(updates.map(update => update.id === id ? response.data : update));`, `      if (updateImage) markDashboardAssetPersisted(updateImage);\n      await cleanupAfterSave(removedUpdateMediaRef);\n      setUpdates(updates.map(update => update.id === id ? response.data : update));`, "campaign-edit-update cleanup");
  write(file, s);
}

function convertBlogEditor() {
  const file = "app/[locale]/blog/_components/BlogEditor.jsx";
  let s = read(file);
  s = replaceOnce(s, `import axios from "axios";`, `import axios from "axios";\nimport {\n  cleanupManagedDashboardMediaAfterSave,\n  deleteUnsavedDashboardMedia,\n  markDashboardAssetPersisted,\n  uploadDashboardMedia,\n} from "@/lib/media/client";`, "blog-editor import");
  s = replaceOnce(s, `  const [uploadingImage, setUploadingImage] = useState(false);`, `  const [uploadingImage, setUploadingImage] = useState(false);\n  const [removedPersistedImage, setRemovedPersistedImage] = useState(null);`, "blog-editor state");
  s = replaceOnce(s, `        response = await axios.post("/api/posts", payload);\n        toast.success`, `        response = await axios.post("/api/posts", payload);\n        if (data.image) markDashboardAssetPersisted(data.image);\n        toast.success`, "blog create persist");
  s = replaceOnce(s, `        response = await axios.patch(\`/api/posts/\${post.id}\`, payload);\n        toast.success`, `        response = await axios.patch(\`/api/posts/\${post.id}\`, payload);\n        if (data.image) markDashboardAssetPersisted(data.image);\n        if (removedPersistedImage) {\n          await cleanupManagedDashboardMediaAfterSave(removedPersistedImage, "blog").catch(() => false);\n          setRemovedPersistedImage(null);\n        }\n        toast.success`, "blog edit cleanup");
  s = replaceOnce(s, `      const formData = new FormData();\n      formData.append("file", file);\n      const response = await axios.post("/api/upload", formData);\n      form.setValue("image", response.data.url || "");`, `      const previous = form.getValues("image");\n      const asset = await uploadDashboardMedia(file, "blog");\n      if (previous) {\n        const deleted = await deleteUnsavedDashboardMedia(previous, "blog").catch(() => false);\n        if (!deleted && previous === (post?.imageAR || post?.image || "")) setRemovedPersistedImage(previous);\n      }\n      form.setValue("image", asset.url);`, "blog upload");
  s = replaceRegex(s, /  const removeImage = async \(\) => \{[\s\S]*?\n  \};\n\n  const onDelete/, `  const removeImage = async () => {\n    const current = form.getValues("image");\n    if (current) {\n      const deleted = await deleteUnsavedDashboardMedia(current, "blog").catch(() => false);\n      if (!deleted && current === (post?.imageAR || post?.image || "")) setRemovedPersistedImage(current);\n    }\n    form.setValue("image", "");\n    toast.success("تم فصل الصورة من المقال؛ سيكتمل التنظيف بعد الحفظ");\n  };\n\n  const onDelete`, "blog remove");
  write(file, s);
}

function convertSimpleBlogUpload(file, importNeedle, oldBlock, newBlock, label) {
  let s = read(file);
  s = replaceOnce(s, importNeedle, `import { uploadDashboardMedia } from "@/lib/media/client";`, `${label} import`);
  s = replaceOnce(s, oldBlock, newBlock, `${label} upload`);
  write(file, s);
}

function removeBridge() {
  const layout = "app/(dashboard)/dashboard/layout.tsx";
  let s = read(layout);
  s = replaceOnce(s, `import DashboardMediaRequestBridge from "./DashboardMediaRequestBridge";\n`, "", "bridge import");
  s = replaceOnce(s, `      <DashboardMediaRequestBridge />\n`, "", "bridge mount");
  write(layout, s);
  fs.rmSync("app/(dashboard)/dashboard/DashboardMediaRequestBridge.tsx", { force: true });
  fs.rmSync("app/api/internal/media-pr-source/route.ts", { force: true });
}

function activeFiles(root) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...activeFiles(full));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function guardActiveSources() {
  const checks = [
    [/\/api\/upload\?publicId=/, "/api/upload?publicId="],
    [/searchParams\.get\(["']publicId["']\)/, "searchParams.get(publicId)"],
    [/pendingByLegacyPublicId/, "pendingByLegacyPublicId"],
    [/DashboardMediaRequestBridge/, "DashboardMediaRequestBridge"],
    [/media-pr-source/, "media-pr-source"],
    [/axios\.post\(["']\/api\/upload["']\s*,\s*formData/, "unscoped axios upload"],
  ];
  const failures = [];
  for (const file of [...activeFiles("app"), ...activeFiles("components"), ...activeFiles("lib")]) {
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      checks.forEach(([pattern, label]) => {
        if (pattern.test(line)) failures.push(`${file}:${index + 1}: ${label}: ${line.trim()}`);
      });
    });
  }
  if (failures.length) throw new Error(`Active media contract violations:\n${failures.join("\n")}`);
}

convertCampaignNew();
convertCampaignEdit();
convertBlogEditor();
convertSimpleBlogUpload(
  "app/[locale]/blog/_components/wysiwyg/toolbar.tsx",
  `import axios from "axios";`,
  `        const formData = new FormData();\n        formData.append("file", file);\n        const response = await axios.post("/api/upload", formData);\n        const url: string | undefined = response.data?.url;`,
  `        const asset = await uploadDashboardMedia(file, "blog");\n        const url: string | undefined = asset.url;`,
  "toolbar",
);
convertSimpleBlogUpload(
  "app/[locale]/blog/_components/wysiwyg/extensions/slash-command.tsx",
  `import axios from "axios";`,
  `            const formData = new FormData();\n            formData.append("file", file);\n            const response = await axios.post("/api/upload", formData);\n            const url: string | undefined = response.data?.url;`,
  `            const asset = await uploadDashboardMedia(file, "blog");\n            const url: string | undefined = asset.url;`,
  "slash-command",
);
removeBridge();
guardActiveSources();
console.log("Guarded media caller conversion completed");
