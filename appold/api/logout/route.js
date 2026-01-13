import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Yeni bir NextResponse oluşturun
        const response = NextResponse.json({ message: 'Success' }, { status: 200 });

        // Çerez ekleyin
        response.cookies.set('token', '');

        return response;
    } catch (error) {
        console.error('Login API Error:', error);

        // Hata durumunda JSON yanıtı döndürün
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}