"use client";
import React from "react";
import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import toast from "react-hot-toast";

type Props = {};

const formSchema = z.object({
  title: z.string().min(1, {
    message: "العنوان مطلوب",
  }),
});

const CreatePage = (props: Props) => {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    try {
      const response = await axios.post("/api/posts", values);
      router.push(`/dashboard/blog/create/${response.data.id}`);
      toast.success("تم اِنشاء المقال");
    } catch {
      toast.error("حدث خطأ");
    }
  }

  return (
    <div className="py-10">
      <div className="md:w-max max-w-5xl mx-auto md:items-center md:justify-center flex flex-col">
        <div className="">
          <h1 className="text-3xl mb-2">قم بتسمية المقال</h1>
          <p className="text-sm text-slate-600">
            ماذا تريد أن تسمي المقال الخاص بك؟ لا تقلق، يمكنك تغيير هذا لاحقًا.
          </p>
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 mt-8 w-full"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان المقال</FormLabel>
                  <FormControl>
                    <Input placeholder="عنوان المقال" {...field} />
                  </FormControl>
                  <FormDescription>
                    ماذا ستقدم من خلال هذا المقال
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className=" flex items-center gap-x-2">
              <Link href="/">
                <Button variant="ghost" type="button">
                  الغاء
                </Button>
              </Link>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                التالي
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreatePage;
