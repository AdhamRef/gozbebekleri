import { NextResponse } from 'next/server'
//import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function POST(req,res) {
    // Request body'yi JSON olarak parse et
   
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;
    const tokencookie = req.cookies.get('auth-token')?.value;

    const headers = req.headers;
    const language = headers.get('accept-language') || 'tr';
    const ip = headers.get('x-forwarded-for');
    const ipaddress = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
    const userAgent = headers.get('user-agent');
    
    const data = await req.json();
    let paymenttoken = data.paymenttoken;
    let membertoken = data.membertoken;
    let membertype = data.membertype;
    let currency = data.currency;
   
    let postbody = { 
        domaintoken: domainKey,
        apikey: apiKey,
        apisecret: apiSecret,
        langkey: "66e70135c6982203440d1aa5",
        currency: currency
    };

    postbody['type'] = "payment";
    postbody['events'] = "list";
    postbody['eventtype'] = "basket";

    if(paymenttoken != ""){
        postbody['paymenttoken'] = paymenttoken;
    }
    if(tokencookie != undefined){
        postbody['membertoken'] = tokencookie;
        postbody['membertype'] = '0';
    }else{
        postbody['membertoken'] = membertoken;
        postbody['membertype'] = '1';
    }
       
    if(language != "ar" && language != "en"){
        postbody['langkey'] = "66e70135c6982203440d1aa5";
    }
    if(language == "en"){
        postbody['langkey'] = "66e70143c6982203440d1aa7";

    }
    if(language == "ar"){
        postbody['langkey'] = "675703aabf3402185e27d955";
    }

    postbody['ipaddress'] = ipaddress;
    postbody['userAgent'] = userAgent;
   

    try{

        /*const response = await axios.post('https://minberiaksa.org:1880/napi', {
            domaintoken: domainKey,
            apikey: apiKey,
            apisecret: apiSecret,
            type: "payment",
            token: "123123asd123asd444",
            events: "add",
            eventtype: "basket",
            logstoken: "a123123asdasd222",
            msg: "MCAYENİ",
            modulekey: "65610091d18e699bb4ef2756",
            key: "664f56e0f2f861f69265fe40",
            name: name,
            price: price,
            quantity: "1",
            currency: "1",
            todaycurrency: "usd",
            date: "2024-06-19",
            datetime: "2024-06-19T17:05:20.742Z",
            personname: name,
            personemail: email,
            personphone: phone,
            status: "active",
            paymenttoken: paymenttoken,
            membertoken: membertoken,
            baskettoken: baskettoken,
        });
        console.log("Response: " + response);*/

        const response = await fetch('https://minberiaksa.org:1880/napi',{
            cache: 'no-store',
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify(postbody),
        });
        const data = await response.json();
        return NextResponse.json(data);
    }catch(error){
        console.log("Error: " + error);
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
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