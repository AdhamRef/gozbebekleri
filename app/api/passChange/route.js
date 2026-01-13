import { NextResponse } from 'next/server'
//import jwt from 'jsonwebtoken';
import axios from 'axios';
import { cookies } from 'next/headers'


export async function POST(req,res) {
    // Request body'yi JSON olarak parse et
   
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;
    
    //const tokencookie = req.cookies.get('auth-token')?.value;
    const tokencookie = req.cookies.get('auth-token')?.value;
        
    const data = await req.json();
    let tokenq = data.token;
    let pass = data.pass;
    let nerden = data.nerden;
    if(tokenq == "1"){
        tokenq = tokencookie;
    }

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
                type: "passChange",
                token: tokenq,
                pass:pass,
                langkey: languagekey
             }),
        });
        const datare = await response.json();
        return NextResponse.json(datare);
        /*
        if (datare.data.status) {
            return new NextResponse(JSON.stringify({ status: true }), {
                status: 200,
                //headers: { 'Set-Cookie': 'token='+response.data.data[0].token + ' HttpOnly; Max-Age=${60 * 60}; Path=/; SameSite=None; Secure'},
            });
        }else{
            return new NextResponse(JSON.stringify({ status: false }), {
                status: 401,
            });
        }*/
    }catch(error){
        console.log("Error: " + error);
    }
}