import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache'

export async function GET() {
    revalidateTag('settings')
    return NextResponse.json({ status: true, msg: "başarıyla cache temizlendi" }, { status: 200 });
}