import React from 'react';
import { Box,Container,Flex,Text,Grid,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Divider} from '@chakra-ui/react'
import HaberlerListeBox from '@/components/box/haberlerlistebox';
import { FaArrowRightLong } from "react-icons/fa6";
import 'keen-slider/keen-slider.min.css'
import { useMediaQuery } from '@chakra-ui/react';

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import FaaliyetlerSlayt from "@/components/FaaliyetlerSlayt";
import Image from 'next/image'

const getPost = cache(async (detayid) => {
    let fetchid = "67223022012d3f025450d1ee";
    return await customFetch({type:'list',id:fetchid});
});

export async function generateMetadata() {
    const posts = await getPost({detayid:"faaliyetler"}); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data[0];

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}


export default async function Faaliyetler() {

  const posts = await getPost({detayid:"faaliyetler"}); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data;
  const sortedData = postdata.sort((a, b) => new Date(b.date) - new Date(a.date));
  

  return (
    <main>
    <Container maxW={1020} p={0}>
    <Flex direction={'column'} p={'4em'} py={'2.5em'} mt={10} gap={3}  >
        <Heading as='h1' size='xl' noOfLines={1} color={'#04819C'} fontWeight={600} textAlign={'center'}>
        FAALİYETLER
        </Heading>
        <Text color={'#424242'} textAlign={'center'} fontSize={14}>Morbi arcu risus, blandit tincidunt porttitor fringilla, bibendum non ipsum</Text>
        <Flex direction={"row"} justifyContent={'center'}>
        <Breadcrumb separator={'/'} color={'#CBCBCB'} mt={4} fontSize={16} fontWeight={600}>
        <BreadcrumbItem>
            <BreadcrumbLink href='#'>Anasayfa</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem>
            <BreadcrumbLink href='#'>Sayfalar</BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbItem color={'#04819C'}>
            <BreadcrumbLink href='#'>Faaliyetler</BreadcrumbLink>
        </BreadcrumbItem>
        </Breadcrumb>
        </Flex>
    </Flex>
    

    <FaaliyetlerSlayt data={postdata} />
    <Grid className="haberlerliste" templateColumns='repeat(3, 1fr)' gap={6} py={10} >
    {sortedData.map((post, index) => (
        <HaberlerListeBox key={index} bagid={index} baslik={post.title} img={"https://minberiaksa.org/uploads/"+post.picture} url={post.url} desc={post.summary} listtype={"faaliyetler"}/>
    ))}
    </Grid>
    </Container>
    </main>
  )
}
