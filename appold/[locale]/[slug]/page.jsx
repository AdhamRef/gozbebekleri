import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { cache } from "react";
import FaaliyetIcerikAlan from "@/components/FaaliyetIcerikAlan";
import { notFound } from 'next/navigation';
import BagisDetay from "@/main/bagis/BagisDetay";
import PageDetay from "@/main/page/PageDetay";
import StandartListe from "@/main/liste/StandartListe";
import BagislarListe from "@/main/bagislar/BagislarListe";

const getPost = cache(async ({detayid}) => {
    const slugToken = await customFetch({type:'slug',text:detayid});
    if(!slugToken.status){notFound()}
    let token = slugToken.data.keyID;
    let type = slugToken.data.type;
    
    let postdata_obj = [];
    postdata_obj['type'] = type;
    if(type==1){
        postdata_obj['data'] = await customFetch({ type: 'detail', id: token });
        return postdata_obj;
    }else if(type==2){
        postdata_obj['data'] = await customFetch({ type: 'list', id: token });
        return postdata_obj;
        
    }else if(type==3){
        postdata_obj['data'] = await customFetch({ type: 'donatedetail', id: token });
        return postdata_obj;
    }else if(type==4){
        postdata_obj['data'] = await customFetch({type:'donatecat'});
        let alldonatecat = postdata_obj['data']['data'];
        postdata_obj['selecteddata'] = Object.values(alldonatecat).filter(obj => obj.token === token);
        postdata_obj['token'] = token;
        return postdata_obj;
    }else{
        notFound()
    }
});

export async function generateMetadata({ params }) {
    const posts = await getPost({ detayid: params.slug }); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts['data'].status;
    if(!poststatus){notFound()}
    const postdata = posts['data'].data[0];
    const type = posts['type'];


    if(type==1){
        let title = postdata.seotitle ? postdata.seotitle : postdata.title;
        let summary = postdata.seodesc ? postdata.seodesc : postdata.summary;
        let image = "https://minberiaksa.org/uploads/"+postdata.picture;
        const currentUrl = ""+params.detayid;
        return {
            title: title,
            description: summary,
            openGraph: {
              title: title,
              description: summary,
              images: image,
              url: currentUrl,
            },
        };
    }else if(type==2){
        return {
            title: poststatus ? postdata.category.title : "Varsayılan Başlık",
            description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
        };
    }else if(type==3){
        let title = postdata.name ? postdata.name : "Bağış";
        let summary = postdata.name ? postdata.name : "Bağış";
        let image = "https://minberiaksa.org/uploads/"+postdata.picture;
        const currentUrl = "bagis/"+params.id;

        // İSTATİSTİKLER İÇİN //
        let url = ""+params.id;
        let token = postdata.token;
        let modulkey = postdata.modulkey;
        let name = postdata.name;
        await customFetch({type:'statics',key:token,url:url,staticstype:1,modulkey:modulkey,name:name});
        // İSTATİSTİKLER İÇİN //
        
        return {
            title: title,
            description: summary,
            openGraph: {
            title: title,
            description: summary,
            images: image,
            url: currentUrl,
            },
        };
    }else if(type==4){
        return {
            title: posts['selecteddata'][0].name,
            description: posts['selecteddata'][0].summary,
        };
    }else{
        notFound()
    }
    
  }


export default async function page({params}) {
    const posts = await getPost({ detayid: params.slug });
    let poststatus = posts['data'].status;
    let postdata = posts['data'];
    let type = posts['type'];

    return (
    <main>
    {type==1 && <PageDetay data={postdata} />}
    {type==2 && <StandartListe slug={params} data={postdata} />}
    {type==3 && <BagisDetay data={postdata} />}
    {type==4 && <BagislarListe token={posts['token']} data={postdata} />}
    </main>
    )
    
}
