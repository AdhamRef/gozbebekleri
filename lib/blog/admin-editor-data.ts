import "server-only";

import getPost from "@/actions/get-post";
import { prisma } from "@/lib/prisma";
import { NOT_IMPACT_BACKING } from "@/lib/campaign/soft-delete-filter";
import { loadDashboardPageData } from "@/lib/dashboard/require-page-permission";
import { createBlogAdminEditorDataLoaders } from "./admin-editor-data-core";

const editorDataLoaders = createBlogAdminEditorDataLoaders({
  loadDashboardPageData,
  getPost,
  loadCategories: () =>
    prisma.postCategory.findMany({
      orderBy: { name: "asc" },
    }),
  loadCampaigns: () =>
    prisma.campaign.findMany({
      where: NOT_IMPACT_BACKING,
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
});

export const loadBlogCreateEditorData =
  editorDataLoaders.loadBlogCreateEditorData;

export const loadBlogEditEditorData =
  editorDataLoaders.loadBlogEditEditorData;
