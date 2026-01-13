import React from 'react';
import { Box,Text,Image,Flex,Heading} from '@chakra-ui/react'
import FotoVideoGaleri from '@/components/FotoVideoGaleri';

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";
import TanitimProjeleri from "@/components/TanitimProjeleri"
const getPostvGaleri = cache(async () => {
    let fetchid = "67532275bf3402185e27ce34";
    return await customFetch({type:'list',id:fetchid});
});

const getPostfGaleri = cache(async () => {
  let fetchid = "6753226ebf3402185e27ce32";
  return await customFetch({type:'list',id:fetchid});
});



export default async function HaberlerAlanComponent(){
  const postsfgaleri = await getPostfGaleri(); // Veriyi al
  let poststatusfgaleri = postsfgaleri.status;
  let postdatafgaleri = postsfgaleri.data;

  const postsvgaleri = await getPostvGaleri(); // Veriyi al
  let poststatusvgaleri = postsvgaleri.status;
  let postdatavgaleri = postsvgaleri.data;

  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);

  let dil;
  if(pathname != "ar" && pathname != "en"){
    dil = "";
  }else{
    dil = pathname;
  }

  return (
    <Flex direction={{lg:'row',md:"column",base:"column"}} gap={{base:0,lg:10}}>
        <FotoVideoGaleri fgaleridata={postdatafgaleri} vgaleridata={postdatavgaleri} />
    </Flex>
  );
};