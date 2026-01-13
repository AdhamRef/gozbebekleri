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
    const referer = headers.get('referer');

    /*
    const ip = headers.get('x-forwarded-for');
    const ipv4 = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
    console.log("IP ADRES VE TARYAICI NEDİR?????????????????????????????????");
    console.info(req);
    console.warn(headers);
    console.warn(ip);
    console.warn(ipv4);
    console.log("Kendi gönderdiğim ip ve tarayıcı");
    console.warn(ipse);
    console.warn(tarayici);*/

    postbody['key'] = data.key;
    postbody['url'] = data.url;
    postbody['staticstype'] = data.staticstype;
    postbody['modulkey'] = data.modulkey;
    postbody['name'] = data.name;

    postbody['type'] = "statics";
    
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
    postbody['referer'] = referer;

    try {
        // Verileri almak için API isteği
        const response = await fetch('https://minberiaksa.org:1880/napi',{
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify(postbody),
           
        });
        const data = await response.json();
        
        // Veriyi JSON olarak döndürün
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        // Hata durumunda 500 yanıtı döndürün
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}