import React from 'react'
import { Box,Container,Flex,Heading,} from '@chakra-ui/react'

import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import Breadcrumbs from "@/components/breadcrumbs";
import HesapNumaraComp from "@/components/hesapnumaralarimiz/HesapNumaraComp";
import { AiOutlineHome } from "react-icons/ai";

const getPost = cache(async () => {
    return await customFetch({ type: 'list', id: '672cd866d4edfd5b85672b25' });
});

export async function generateMetadata({ params }) {
    const posts = await getPost(); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}

export default async function Hesapage() {
    const posts = await getPost();
    let postdata = posts.data;
    const kopyala = () => {}

    /*
   */
    return (
    <main>
    <Flex bgImage={'/detaybaslikbg.jpg'} direction={'column'} py={'4em'}>
    <Container maxW={1200} p={0}>
    <Flex direction={'row'} gap={5}>
        <AiOutlineHome size={28} color={'#FFC471'} style={{marginTop:4}}/>
        <Flex direction={'column'} gap={0}>
        <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>HESAP NUMARALARIMIZ</Heading>
        <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
        <Flex direction={"row"}>
        <Breadcrumbs line={{kategori:postdata[0].category.title}} />
        </Flex>
        </Flex>
    </Flex>
    </Container>
    </Flex>
    <Container maxW={1200} p={0} px={{base:3,lg:0}}>
    <HesapNumaraComp data={postdata} />
    </Container>
    </main>
  )
}
