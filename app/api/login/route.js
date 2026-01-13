import { NextResponse } from 'next/server'
//import jwt from 'jsonwebtoken';
import axios from 'axios';
import { cookies } from 'next/headers'
export async function POST(req,res) {
    // Request body'yi JSON olarak parse et
    const cookieStore = await cookies();
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;
    
    const data = await req.json();
    const datao = JSON.stringify(data);
    let email = data.email;
    let parola = data.pass;
    const headers = req.headers;
    const language = headers.get('accept-language') || 'tr';
    let languagekey;
    if(language != "ar" && language != "en"){
        languagekey = "66e70135c6982203440d1aa5";
    }
    if(language == "en"){
        languagekey = "66e70143c6982203440d1aa7";
    }
    if(language == "ar"){
        languagekey = "675703aabf3402185e27d955";
    }
   
    try{
        const response = await fetch('https://minberiaksa.org:1880/napi',{
            cache: 'no-store',
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({ 
                domaintoken: domainKey,
                apikey: apiKey,
                apisecret: apiSecret,
                type: "customerlogin",
                email: email,
                pass: parola,
                langkey: languagekey
             }),
        });
        const datare = await response.json();
        if (datare.status) {
            let response = NextResponse.json(datare, {
                status: 200,
            });
            let uyetoken = datare.data[0].token;
            cookieStore.set('auth-token',uyetoken, {
                maxAge: 604800,
                path: '/',
            });
            
            return response;
        }else{
            return NextResponse.json(datare, {
                status: 200,
            });
        }
    }catch(error){
        console.log("Error: " + error);
    }
}

export async function GET() {
    try {
        // Giriş işlemi sonrası yanıt dön
        return NextResponse.json({ message: 'Success' }, { status: 200 })
    } catch (error) {
        console.error('Login API Error:', error);
        return NextResponse.json({ message: '"Internal Server Error' }, { status: 500 })
       
    }
}