import React from 'react'
import {FaArrowRight } from "react-icons/fa6";
import {Heading,Flex,Button} from '@chakra-ui/react'
import ProjelerVitrinList from '@/components/anasayfa/ProjelerVitrinList';

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";
import Link from "next/link";

const getPost = cache(async () => {
  return await customFetch({type:'donates'});
});

export default async function ProjelerVitrin() {

  const posts = await getPost(); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data;
  //const filterdata = postdata.filter(item => item.type == 4);
  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);
  let dil;
  if(pathname != "ar" && pathname != "en"){
    dil = "";
  }else{
    dil = pathname;
  }

  let fonlanacakProjelerData = await customFetch({ type: 'detail', id: "67694cb034a8f5a63bd5045b" });
  let fonlanacakProjelerBaslik = fonlanacakProjelerData.data[0].title;
  let fonlanacakProjelerKucukBaslik = fonlanacakProjelerData.data[0].summary;

  return (
   <Flex direction={'column'}>
    <Flex direction={'row'} justifyContent={'space-between'} alignItems={'center'} mb={10}>
        <Flex direction={"column"} gap={5}>
          <Heading size={'md'} noOfLines={1} color={'#044958'}>
            {fonlanacakProjelerKucukBaslik}
          </Heading>
          <Heading fontSize={'30px'} color={'#04819C'}>
            {fonlanacakProjelerBaslik}
          </Heading>
        </Flex>
        <Button as={Link} href={dil+"/bagislar"} hideBelow='md' colorScheme='blue' p={8} bg={'#04819C'} rightIcon={<FaArrowRight size={18} style={{marginLeft:10,}} className='arrowiconrtl'/>} >{lang['anasayfa'].allprojects}</Button>
    </Flex>
    <ProjelerVitrinList data={postdata} />
  </Flex>
  )
}
