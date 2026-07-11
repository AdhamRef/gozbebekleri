"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createRoot, type Root } from "react-dom/client";
import { SeoPanel } from "@/components/dashboard/campaigns/SeoPanel";

const ROOT_ID = "dashboard-project-locale-slug-editor";
const TARGET_SECTION_ID = "dashboard-project-locale-links";
const SEO_ROOT_ID = "dashboard-project-inline-seo-workbench";
const CREATION_REASON_ID = "dashboard-project-creation-failure-reason";
