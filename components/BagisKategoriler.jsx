import React from 'react';
import { Grid,Box,Text,Flex,Image} from '@chakra-ui/react'
import { PiMosque } from "react-icons/pi";
import BagisKategoriAlaniComp from '@/components/BagisKategoriAlaniComp';

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import { headers } from "next/headers";
import {language} from "@/main/utilities/languageS";

const getPost = cache(async () => {
  return await customFetch({type:'donatecat'});
});

export default async function BagisKategoriler() {
  const posts = await getPost(); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data;

  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);

  return (
    <Flex direction={'column'} alignItems={'center'} gap={{base:5,lg:0}}>
        <BagisKategoriAlaniComp data={postdata}/>
    </Flex>
  )
}
