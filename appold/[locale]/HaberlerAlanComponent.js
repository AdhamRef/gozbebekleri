import React from 'react';
import { Box,Text,Image,Flex,Heading} from '@chakra-ui/react'
import { SlPicture } from "react-icons/sl";
import { TfiVideoClapper } from "react-icons/tfi";
import HaberlerItemsComponent from '@/components/anasayfa/HaberlerItemsComponent';
import Link from 'next/link';
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";
import TanitimProjeleri from "@/components/TanitimProjeleri"
const getPost = cache(async (detayid) => {
    let fetchid = "67223022012d3f025450d1ee";
    return await customFetch({type:'list',id:fetchid});
});

const getPost_istatistikler = cache(async () => {
  let fetchid = "673dc6d1ada526e2a5841e3e";
  return await customFetch({type:'list',id:fetchid});
});

const getPost_tanitimlar = cache(async () => {
  return await customFetch({type:'detail',id:"67226460012d3f025450d256"});
});

export default async function HaberlerAlanComponent(){
  const posts = await getPost({detayid:"faaliyetler"}); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data;

  const posts_istatistikler = await getPost_istatistikler(); // Veriyi al
  let postdata_istatistikler = posts_istatistikler.data;

  const posts_tanitimlar = await getPost_tanitimlar(); // Veriyi al
  let postdata_tanitimlar = posts_tanitimlar.data;

  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);

  let dil;
  if(pathname != "ar" && pathname != "en"){
    dil = "";
  }else{
    dil = pathname;
  }
  const Iconlar = (img,baslik,desc,index) => {
    return(
      <Flex key={index} w={'50%'} direction={{base:'column',lg:'row'}} gap={5} mb={5} alignItems={'center'}>
        <Image src={"https://minberiaksa.org/uploads/"+img} width={70} height={70} />
        <Flex direction={"column"}>
          <Text fontSize={28} fontWeight={600}>{baslik}</Text>
          <Text fontSize={18} fontWeight={500} whiteSpace={'pre-line'}>{desc}</Text>
        </Flex>
      </Flex>
    )
  }
  let data2 = [
      {
          id: 1,
          title:"It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. ",
      },
      {
          id: 2,
          title:"The point of using Lorem Ipsum is that it has a more-or-less normal",
      },
      {
          id: 3,
          title:"publishing packages and web page editors now use",
      }
  ];

  return (
    <Flex direction={{lg:'row',md:"column",base:"column"}} gap={{base:0,lg:10}}>
    <Flex direction={'column'} minWidth={'60%'}>
      <HaberlerItemsComponent data={postdata}/>
      {postdata_istatistikler.length > 1 && 
      <Flex direction={'row'} gap={10} mt={10}>
        <Text fontSize={38} fontWeight={600} color={'#BB7714'} style={{ writingMode: "vertical-rl" }} transform={'rotate(180deg)'} textAlign={'center'}>{lang.statistics}</Text>
        <Flex direction={'row'} flexWrap={'wrap'}>
        {postdata_istatistikler.map((post,index) => (
          Iconlar(post.picture,post.summary,post.title,index)
        ))}
        </Flex>
      </Flex>
      }
    </Flex>
    <Flex width={{base:'98%',lg:"50%"}} gap={5} direction={{lg:'column',md:"row"}} justifyContent={{base:'space-between'}}>
      <TanitimProjeleri data={postdata_tanitimlar}/>
    </Flex>
    </Flex>
  );
};