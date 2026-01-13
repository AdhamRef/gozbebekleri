"use client";
// Use usePathname for catching route name.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '../app/[locale]/Header';
import Footer from '../app/[locale]/Footer';
import HeaderSepetOdeme from './HeaderSepetOdeme';
import FooterSepetOdeme from './FooterSepetOdeme';
import Cookie from 'js-cookie';
import Image from 'next/image';

import { useDispatch, useSelector} from 'react-redux';
import { oturumGuncelle } from '@/redux/slices/oturumSlice';
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";

const AuthContext = createContext(null);

export const LayoutProvider = ({langdata,settings,children }) => {

    const pathname = usePathname();
    let languageCode = useLanguageBelirtec();
    const dispatch = useDispatch();
    let messages = useLanguage();
    if(languageCode=="/en"){
        dispatch(oturumGuncelle({parabirimi:"1"}));
    }
    if(languageCode=="/ar"){
        dispatch(oturumGuncelle({parabirimi:"2"}));
    }
    if(languageCode!="/en" && languageCode!="/ar"){
        dispatch(oturumGuncelle({parabirimi:"0"}));
    }

    let parabirimi = settings.parabirimi;
    let parabirimLabel = 
    parabirimi == 0 ? "₺" : 
    parabirimi == 1 ? "$" : 
    parabirimi == 2 ? "€" : "₺";

    if(settings.bakimmod == "1"){
        return(
        <main style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',margin:'40px 0px'}}>
            <Image src={"http://crm.tussesleri.com/uploads/"+settings.logo} width={180} height={220} />
            <h1 style={{fontSize:32,fontWeight:600}}>Şuanda Sitemiz Güncellenmektedir</h1>
            <p>Lütfen daha sonra tekrar deneyiniz.</p>
        </main>
        )
    }else if(settings.banstatus){
        return(
        <main style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',margin:'40px 0px',gap:15}}>
            <div style={{width:'700px',background:'#fff',padding:'4em',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRadius:10,gap:15,boxShadow:'0px 0px 17px -7px rgba(0,0,0,0.24)'}}>
            <Image src={"https://minberiaksa.org/uploads/"+settings.logo} width={340} height={120} style={{padding:'15px',borderRadius:15,background:'#fff'}} />
            <h1 style={{fontSize:28,fontWeight:600}}>{messages.ipbantitle}</h1>
            {languageCode!="/en" && languageCode!="/ar" && <p>{messages.ipbantext1} <a href={"mailto:"+settings.email} style={{color:'#33829f',fontWeight:600}}>{settings.email}</a> {messages.ipbantext2} </p>}
            {languageCode=="/en" && <p>{messages.ipbantext1} {messages.ipbantext2} <a href={"mailto:"+settings.email} style={{color:'#33829f',fontWeight:600}}>{settings.email}</a></p>}
            {languageCode=="/ar" && <p>{messages.ipbantext1} {messages.ipbantext2} <a href={"mailto:"+settings.email} style={{color:'#33829f',fontWeight:600}}>{settings.email}</a></p>}
            <p>IP: {settings.ipaddress}</p>
            </div>
        </main>
        )
    }else{
        return (
            <>
            <AuthContext.Provider value={{ settings,langdata,parabirimi,parabirimLabel }}>
                {pathname !== "/sepet" && pathname !== "/odeme" && pathname !== "/sonuc" && pathname !== "/basarili" && pathname !== "/basarisiz" ? <Header setting={settings} /> : <Header setting={settings}/>}
                {children}
                {pathname !== "/sepet" && pathname !== "/odeme" && pathname !== "/sonuc" && pathname !== "/basarili" && pathname !== "/basarisiz" ? <Footer setting={settings}/> : <FooterSepetOdeme settings={settings}/>}
            </AuthContext.Provider>
            </>
        )
    }
};

  
export function useAuth() {
  return useContext(AuthContext);
}