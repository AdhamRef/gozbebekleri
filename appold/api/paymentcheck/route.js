import { NextResponse } from 'next/server';

export async function POST(req,res) {

    let postbody = { 
    };

    const data = await req.json();
    let checkouttoken = data.checkouttoken;
    postbody['checkouttoken'] = checkouttoken;

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
    
    try {
        // Verileri almak için API isteği
        
        const response = await fetch('https://minberiaksa.org:1880/paymentCheck?checkouttoken='+checkouttoken+'&type=2',{
            cache: 'no-store',
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({ 
                langkey: languagekey,
            })
           // body: JSON.stringify(postbody),
        });
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching data:", error);
        // Hata durumunda 500 yanıtı döndürün
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}