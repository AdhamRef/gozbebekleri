import React from 'react'
import { Container,Heading,Grid,GridItem,Flex,Box,Text,Image,Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react'
import { FaArrowRightLong } from "react-icons/fa6";
import "@/styles/styles.css";

import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";

import BagisKatTabs from '@/components/bagislar/BagisKatTabs';

export default async function page({params}) {

  const donatecat = await customFetch({type:'donatecat'});
  let donatecatpost = donatecat.data;

  let secilenkategori = params.katid;
  
  return (
      <Flex>
      <Flex direction={'column'} bgImg={"url('/minarebaslikbg.png')"} bgPos={'right center'} bgSize={'cover'} bgColor={'#04819C'} borderRadius={25} >
        <Container maxW={1200} p={0} px={{base:1,md:0}}>
        <Heading as='h1' fontSize={18} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>
          PROJELER
        </Heading>
        <Flex direction={"row"}>
        
        <Breadcrumb separator={<FaArrowRightLong color='#56C0D7' />} color={'#56C0D7'} mt={4} fontSize={12}>
          <BreadcrumbItem>
            <BreadcrumbLink href='#'>Anasayfa</BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href='#'>Projeler</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
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
