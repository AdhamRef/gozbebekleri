import { NextResponse } from 'next/server';

export async function POST(req,res) {

    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_API_SECRET;
    const domainKey = process.env.NEXT_PUBLIC_DOMAIN_KEY;
    const tokencookie = req.cookies.get('auth-token')?.value;

    const headers = req.headers;
    const language = headers.get('accept-language') || 'tr';
    const ip = headers.get('x-forwarded-for');
    const ipaddress = ip.includes('::ffff:') ? ip.split('::ffff:')[1] : ip;
    const userAgent = headers.get('user-agent');
    
    let postbody = { 
        domaintoken: domainKey,
        apikey: apiKey,
        apisecret: apiSecret,
        langkey: "66e70135c6982203440d1aa5",
    };

    const data = await req.json();
    let paymenttoken = data.paymenttoken;
    let membertoken = data.membertoken;
    let membertype = data.membertype;
    let cardholder = data.cardholder;
    let cardNo = data.cardNo;
    let expDateMonth = data.expDateMonth;
    let expDateYear = data.expDateYear;
    let cvv = data.cvv;
    let step = data.step;
    let personname = data.personname;
    let personemail = data.personemail;
    let personphone = data.personphone;
    let currency = data.currency;
    let paymentmethod = data.paymentmethod;
    let captchavalue = data.captchavalue;

    if(!currency){
        currency="0";
    }

    /*postbody['type'] = "payment";
    postbody['eventtype'] = "checkout";
    postbody['cardholder'] = cardholder;
    postbody['cardNo'] = cardNo;
    postbody['expDateMonth'] = expDateMonth;
    postbody['expDateYear'] = expDateYear;
    postbody['cvv'] = cvv;
    postbody['step'] = 1;
    postbody['personname'] = personname;
    postbody['personemail'] = personemail;
    postbody['personphone'] = personphone;
    postbody['currency'] = currency;
    postbody['paymentmethod'] = paymentmethod;
    postbody['ipaddress'] = ipaddress;
    postbody['userAgent'] = userAgent;*/

    postbody['type'] = "payment";
    postbody['step'] = 1;
    if (currency){postbody['currency'] = currency;}
    if (paymentmethod){postbody['paymentmethod'] = paymentmethod;}
    if (ipaddress){postbody['ipaddress'] = ipaddress;}
    if (userAgent){postbody['userAgent'] = userAgent;}
    if (cardholder){postbody['cardholder'] = cardholder;}
    if (cardNo){postbody['cardNo'] = cardNo;}
    if (expDateMonth){postbody['expDateMonth'] = expDateMonth;}
    if (expDateYear){postbody['expDateYear'] = expDateYear;}
    if (cvv){postbody['cvv'] = cvv;}
    if (personname){postbody['personname'] = personname;}
    if (personemail){postbody['personemail'] = personemail;}
    if (personphone){postbody['personphone'] = personphone;}
    postbody['eventtype'] = "checkout";
    


    if(paymenttoken != undefined){
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
        postbody['currency'] = "0";
    }
    if(language == "en"){
        postbody['langkey'] = "66e70143c6982203440d1aa7";
        postbody['currency'] = "1";
    }
    if(language == "ar"){
        postbody['langkey'] = "675703aabf3402185e27d955";
        postbody['currency'] = "2";
    }
    
    try {
        if(captchavalue==null || captchavalue==""){
            return NextResponse.json({error:'Captcha İşlemi Başarısız!'}, {status: 500});
        }
        // Verileri almak için API isteği
        // CAPTCHA TOKENİ GÖNDERİYORUZ TEST ETMELERİ İÇİN
        const response_captcha = await fetch('https://www.google.com/recaptcha/api/siteverify?secret=6LeqvhYrAAAAAKvStY8K4QIhIbdFh3gBdoRrMz-z&response='+captchavalue,{
            cache: 'no-store',
            headers: {
                'Content-type': 'application/json',
            },
        });
        const data_captcha = await response_captcha.json();
        if(!data_captcha.success){
            return NextResponse.json({error:'Captcha İşlemi Başarısız!'});
        }

        // CAPTCHA TOKENİ GÖNDERİYORUZ TEST ETMELERİ İÇİN

        
        const response = await fetch('https://minberiaksa.org:1880/napi',{
            cache: 'no-store',
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify(postbody),
        });
        const data = await response.text();
        return new NextResponse(data);

        /*return NextResponse.json(postbody);*/
    } catch (error) {
        console.error("Error fetching data:", error);
        // Hata durumunda 500 yanıtı döndürün
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}