import React from 'react'
import { Container,Heading,Grid,GridItem,Flex,Box,Text,Image,Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react'
import { FaArrowRightLong } from "react-icons/fa6";
import "../styles/styles.css";
import Breadcrumbs from "@/components/breadcrumbs";
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";

import BagisKatTabs from '@/components/bagislar/BagisKatTabs';
import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";
import { AiOutlineHome } from "react-icons/ai";

export default async function page({token}) {

  const donatecat = await customFetch({type:'donatecat'});
  let donatecatpost = donatecat.data;
  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);

  let secilenkategori = token;
  return (
    <Flex direction={'column'}>
      <Flex direction={'column'} position={'relative'} zIndex={12} py={{base:'1em',lg:'2em'}} alignItems={'center'}>
        <Box width={'100%'} height={'100%'} backgroundColor={{base:'#c9862487',lg:'transparent'}} bgImg={{base:'none',lg:"url('/minarebaslikbg.png')"}} bgPos={{base:'left',lg:'right center'}} bgSize={'cover'} position={'absolute'} zIndex={10} top="0" left={0}></Box>
        <Box width={'100%'} height={'100%'} bgImg={"url('/kudusbaslikbg.jpg')"} bgPos={'right center'} bgSize={'cover'} position={'absolute'} zIndex={9} top="0" left={0}></Box>
        <Container maxW={1200} p={0} px={{base:3,md:0}} position={'relative'} zIndex={19}>
        <Flex direction={'row'} gap={5}>
          <AiOutlineHome className='mobilehide' size={'40px'} color={'#FFC471'} style={{marginTop:4}}/>
          <Flex direction={'column'} gap={0}>
          <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>PROJELER</Heading>
          <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
          <Flex direction={"row"}>
            <Breadcrumbs line={{kategori:lang.projects}} />
          </Flex>
        </Flex>
        </Flex>
       </Container>
      </Flex>
      
      <Container maxW={1200} p={0} px={{base:3,md:0}}>
        <Flex direction={'column'}>
          <BagisKatTabs secilenkat={secilenkategori} donatecats={donatecatpost} />
        </Flex>
      </Container>
    </Flex>
  )
}
