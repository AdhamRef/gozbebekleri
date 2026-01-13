import { NextResponse } from 'next/server';

export async function POST(req,res) {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;

    let postbody = { 
        domaintoken: domainKey,
        apikey: apiKey,
        apisecret: apiSecret,
    };

    const data = await req.json();
    const headers = req.headers;
    const language = headers.get('accept-language') || 'tr';
    const ipaddress = headers.get('ipaddress');
    const userAgent = headers.get('userAgent');

    postbody['type'] = "contents";
    if(data.type){
        postbody['type'] = data.type;
    }

    if(data.id){
        postbody['ID'] = data.id;
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

    try {
        // Verileri almak için API isteği
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
    } catch (error) {
        console.error("Error fetching data:", error);
        // Hata durumunda 500 yanıtı döndürün
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}