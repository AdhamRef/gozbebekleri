import { NextResponse } from 'next/server'
//import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function POST(req,res) {
    // Request body'yi JSON olarak parse et
   
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;
    
    const data = await req.json();
    const datao = JSON.stringify(data);
    let name = data.name;
    let parola = data.pass;
    let tckimlik = data.tckimlik;
    let gsm = data.gsm;
    let phone = data.phone;
    let gender = data.gender;
    let email = data.email;
    let job = data.job;
    let birthdate = data.birthdate;
    let country = data.country;
    let province = data.province;
    let district = data.district;
    let neighbourhood = data.neighbourhood;
    let street = data.street;
    let addressdetail = data.addressdetail;

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
                type: "customeradd",
                name: name,
                tckimlik: tckimlik,
                gsm: gsm,
                phone: phone,
                gender: gender,
                email: email,
                job: job,
                birthdate: birthdate,
                country: country,
                province: province,
                district: district,
                neighbourhood: neighbourhood,
                street: street,
                addressdetail: addressdetail,
                pass: parola,
                langkey: languagekey
             }),
        });
        const datare = await response.json();
        if (datare.status) {
            return new NextResponse(JSON.stringify({ status: true }), {
                status: 200,
                //headers: { 'Set-Cookie': 'token='+response.data.data[0].token + ' HttpOnly; Max-Age=${60 * 60}; Path=/; SameSite=None; Secure'},
            });
        }else{
            return new NextResponse(JSON.stringify({ status: false }), {
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