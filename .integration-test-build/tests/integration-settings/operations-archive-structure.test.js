"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const nav_config_1 = require("../../lib/dashboard/nav-config");
const read = (path) => (0, node_fs_1.readFileSync)(path, "utf8");
(0, node_test_1.default)("operations navigation exposes exactly five approved pages", () => {
    const operations = nav_config_1.DASHBOARD_NAV_GROUPS.find((group) => group.group === "التشغيل");
    strict_1.default.ok(operations);
    strict_1.default.deepEqual(operations.items.filter((item) => item.key === "operations").map((item) => item.href), [
        "/dashboard/operations/tasks",
        "/dashboard/operations/content",
        "/dashboard/operations/calendar",
        "/dashboard/operations/publishing",
        "/dashboard/operations/donor-reactivation",
    ]);
});
(0, node_test_1.default)("operations and archive are protected before nested page reads", () => {
    for (const path of [
        "app/(dashboard)/dashboard/operations/layout.tsx",
        "app/(dashboard)/dashboard/archive/layout.tsx",
    ]) {
        const source = read(path);
        strict_1.default.match(source, /getServerSession/);
        strict_1.default.match(source, /resolveDashboardPageAccess/);
        strict_1.default.match(source, /redirect\(access\.redirectTo\)/);
    }
});
(0, node_test_1.default)("legacy operations pages redirect to canonical destinations", () => {
    const redirects = {
        "app/(dashboard)/dashboard/operations/page.tsx": "/dashboard/operations/tasks",
        "app/(dashboard)/dashboard/operations/command-center/page.tsx": "/dashboard/operations/tasks",
        "app/(dashboard)/dashboard/operations/workflow/page.tsx": "/dashboard/operations/tasks?view=workflow",
        "app/(dashboard)/dashboard/operations/production/page.tsx": "/dashboard/operations/content?view=production",
        "app/(dashboard)/dashboard/operations/scheduler/page.tsx": "/dashboard/operations/calendar?view=schedule",
        "app/(dashboard)/dashboard/operations/messaging/page.tsx": "/dashboard/operations/communication",
        "app/(dashboard)/dashboard/operations/marketing-performance/page.tsx": "/dashboard/marketing/performance",
        "app/(dashboard)/dashboard/operations/archive/page.tsx": "/dashboard/archive/assets",
    };
    for (const [path, destination] of Object.entries(redirects)) {
        const source = read(path);
        strict_1.default.match(source, /from "next\/navigation"/);
        strict_1.default.ok(source.includes(`redirect("${destination}")`), `${path} must redirect to ${destination}`);
    }
});
(0, node_test_1.default)("archive root and duplicate upload routes redirect to canonical pages", () => {
    const redirects = {
        "app/(dashboard)/dashboard/archive/page.tsx": "/dashboard/archive/collections",
        "app/(dashboard)/dashboard/archive/marketing-files/page.tsx": "/dashboard/archive/assets?category=MARKETING",
        "app/(dashboard)/dashboard/archive/documents/page.tsx": "/dashboard/archive/assets?category=DOCUMENTS",
    };
    for (const [path, destination] of Object.entries(redirects)) {
        strict_1.default.ok(read(path).includes(`redirect("${destination}")`));
    }
});
(0, node_test_1.default)("donor reactivation masks contact data by default", () => {
    const source = read("app/(dashboard)/dashboard/operations/donor-reactivation/page.tsx");
    strict_1.default.match(source, /function maskEmail/);
    strict_1.default.match(source, /function maskPhone/);
    strict_1.default.match(source, /maskEmail\(candidate\.donorEmail\)/);
    strict_1.default.match(source, /maskPhone\(candidate\.donorPhone\)/);
    strict_1.default.doesNotMatch(source, /\{candidate\.donorEmail \?\?/);
    strict_1.default.doesNotMatch(source, /\{candidate\.donorPhone \?\?/);
});
