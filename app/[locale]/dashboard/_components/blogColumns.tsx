"use client";

import { Button } from "@/components/ui/button";
import { Post, PostCategory } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Blocks, Eye, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface BlogsWithChapters extends Post {
  PostCategory: PostCategory;
}

export const blogColumns: ColumnDef<BlogsWithChapters>[] = [
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          الصورة
          <ArrowUpDown className="mx-2 h-[14px] w-[14px]" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <Image
          src={
            row.original.imageAR ||
            "https://division.iium.edu.my/amad/wp-content/uploads/sites/2/2023/07/placeholder-282.png"
          }
          alt={row.original.titleAR || "صورة المقال"}
          width={110}
          height={110}
          quality={95}
          className="rounded-md object-cover"
          placeholder="blur" // Optionally add blur-up effect
          blurDataURL="data:image/svg+xml;base64,...your-blur-data-url..." // Replace with a base64-encoded placeholder
          priority // Ensures the image is loaded quickly
        />
      );
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          عنوان
          <ArrowUpDown className="mr-2 h-[14px] w-[14px]" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const titleAR = row.original.titleAR;
      return <div>{titleAR || "_"}</div>;
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          التصنيف
          <ArrowUpDown className="mr-2 h-[14px] w-[14px]" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const category = row.original.postCategory;
      return <div>{category?.nameAR || "_"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const { id } = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="h-4 w-8 p-0 cursor-pointer flex items-center justify-center">
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Link
                className="flex w-full justify-end items-center text-black"
                href={`/blog/${id}`}
              >
                عرض
                <Eye className="h-4 w-4 ml-2" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                className="flex w-full justify-end items-center text-black"
                href={`/blog/category/${row.original.category_id}`}
              >
               عرض التصنيف
                <Blocks className="h-4 w-4 ml-2" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link
                className="flex w-full justify-end items-center text-black"
                href={`/dashboard/blog/create/${id}`}
              >
                تعديل
                <Pencil className="h-4 w-4 ml-2" />
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
