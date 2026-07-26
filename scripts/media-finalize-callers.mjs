import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, value) { fs.writeFileSync(path, value); }
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
  const path = "app/(dashboard)/dashboard/campaigns/new/page.tsx";
  let s = read(path);
  s = replaceOnce(s, "import axios from 'axios';", `import axios from 'axios';\nimport {\n  deleteUnsavedDashboardMedia,\n  markDashboardAssetPersisted,\n  uploadDashboardMedia,\n} from '@/lib/media/client';`, "campaign-new import");
  s = replaceOnce(s, "      await axios.post('/api/campaigns', requestData);\n      toast.success('تم إنشاء المشروع بنجاح');", `      await axios.post('/api/campaigns', requestData);\n      const persistedMedia = [\n        ...values.images,\n        values.image_en, values.image_fr, values.image_tr, values.image_id,\n        values.image_pt, values.image_es, values.image_de,\n      ].filter((url): url is string => Boolean(url));\n      persistedMedia.forEach(markDashboardAssetPersisted);\n      toast.success('تم إنشاء المشروع بنجاح');`, "campaign-new persist");
  s = replaceOnce(s, `      const formData = new FormData();\n      formData.append('file', file);\n      const response = await axios.post('/api/upload', formData);\n      form.setValue(\`image_\${locale}\` as LocaleImageKey, response.data?.url ?? '', {`, `      const asset = await uploadDashboardMedia(file, 'campaigns');\n      form.setValue(\`image_\${locale}\` as LocaleImageKey, asset.url, {`, "campaign-new locale upload");
  s = replaceRegex(s, /  const removeLocaleImage = \(locale: 'en' \| 'fr' \| 'tr' \| 'id' \| 'pt' \| 'es' \| 'de'\) => \{[\s\S]*?\n  \};\n\n  const renderLocaleMedia/, `  const removeLocaleImage = async (locale: 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es' | 'de') => {\n    const key = \`image_\${locale}\` as LocaleImageKey;\n    const current = form.getValues(key);\n    if (current) await deleteUnsavedDashboardMedia(current, 'campaigns').catch(() => false);\n    form.setValue(key, '', { shouldDirty: true });\n  };\n\n  const renderLocaleMedia`, "campaign-new locale remove");
  s = replaceRegex(s, /    const uploadPromises = Array\.from\(files\)\.map\(async \(file\) => \{[\s\S]*?\n    \}\);/, `    const uploadPromises = Array.from(files).map(async (file) => {\n      const asset = await uploadDashboardMedia(file, 'campaigns');\n      return asset.url;\n    });`, "campaign-new uploads");
  s = replaceRegex(s, /  const removeImage = async \(index: number\) => \{[\s\S]*?\n  \};\n\n  const reorderImages/, `  const removeImage = async (index: number) => {\n    const currentImages = form.getValues('images');\n    const imageUrl = currentImages[index];\n    if (imageUrl) await deleteUnsavedDashboardMedia(imageUrl, 'campaigns').catch(() => false);\n    form.setValue('images', currentImages.filter((_, i) => i !== index));\n    toast.success('تم حذف الصورة بنجاح');\n  };\n\n  const reorderImages`, "campaign-new image remove");
  write(path, s);
}

function convertBlogEditor() {
  const path = "app/[locale]/blog/_components/BlogEditor.jsx";
  let s = read(path);
  s = replaceOnce(s, `import axios from "axios";`, `import axios from "axios";\nimport {\n  cleanupManagedDashboardMediaAfterSave,\n  deleteUnsavedDashboardMedia,\n  markDashboardAssetPersisted,\n  uploadDashboardMedia,\n} from "@/lib/media/client";`, "blog-editor import");
  s = replaceOnce(s, `  const [uploadingImage, setUploadingImage] = useState(false);`, `  const [uploadingImage, setUploadingImage] = useState(false);\n  const [removedPersistedImage, setRemovedPersistedImage] = useState(null);`, "blog-editor state");
  s = replaceOnce(s, `        response = await axios.post("/api/posts", payload);\n        toast.success`, `        response = await axios.post("/api/posts", payload);\n        if (data.image) markDashboardAssetPersisted(data.image);\n        toast.success`, "blog create persist");
  s = replaceOnce(s, `        response = await axios.patch(\`/api/posts/\${post.id}\`, payload);\n        toast.success`, `        response = await axios.patch(\`/api/posts/\${post.id}\`, payload);\n        if (data.image) markDashboardAssetPersisted(data.image);\n        if (removedPersistedImage) {\n          await cleanupManagedDashboardMediaAfterSave(removedPersistedImage, "blog").catch(() => false);\n          setRemovedPersistedImage(null);\n        }\n        toast.success`, "blog edit cleanup");
  s = replaceOnce(s, `      const formData = new FormData();\n      formData.append("file", file);\n      const response = await axios.post("/api/upload", formData);\n      form.setValue("image", response.data.url || "");`, `      const previous = form.getValues("image");\n      const asset = await uploadDashboardMedia(file, "blog");\n      if (previous) {\n        const deleted = await deleteUnsavedDashboardMedia(previous, "blog").catch(() => false);\n        if (!deleted && previous === (post?.imageAR || post?.image || "")) setRemovedPersistedImage(previous);\n      }\n      form.setValue("image", asset.url);`, "blog upload");
  s = replaceRegex(s, /  const removeImage = async \(\) => \{[\s\S]*?\n  \};\n\n  const onDelete/, `  const removeImage = async () => {\n    const current = form.getValues("image");\n    if (current) {\n      const deleted = await deleteUnsavedDashboardMedia(current, "blog").catch(() => false);\n      if (!deleted && current === (post?.imageAR || post?.image || "")) setRemovedPersistedImage(current);\n    }\n    form.setValue("image", "");\n    toast.success("تم فصل الصورة من المقال؛ سيكتمل التنظيف بعد الحفظ");\n  };\n\n  const onDelete`, "blog remove");
  write(path, s);
}

function convertSimpleBlogUpload(path, importNeedle, oldBlock, newBlock, label) {
  let s = read(path);
  s = replaceOnce(s, importNeedle, `import { uploadDashboardMedia } from "@/lib/media/client";`, `${label} import`);
  s = replaceOnce(s, oldBlock, newBlock, `${label} upload`);
  write(path, s);
}

convertCampaignNew();
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

console.log("Guarded media caller conversion completed");
