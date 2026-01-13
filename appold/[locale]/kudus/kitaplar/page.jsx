import React from 'react'
import { Box,Image,Container,Flex,Text,Center,Grid,Heading} from '@chakra-ui/react'

import AsideOtherPages from "@/components/AsideOtherPages";
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import Link from "next/link";
import KudusBaslikAlan from "@/components/KudusBaslikAlan";
const getPost = cache(async () => {
  return await customFetch({ type: 'list', id: '67223082012d3f025450d1f2' });
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

export default async function page() {
    const posts = await getPost();
    let postdata = posts.data;
  const kitaplar = [
    {
        id:1,
        title: "Harry Potter And The Sorcerer's Stone",
        image: '/kitap1.jpg'
    },
    {
        id:2,
        title: "Harry Potter And The Sorcerer's Stone",
        image: '/kitap2.jpg'
    },
    {
        id:1,
        title: "Harry Potter And The Sorcerer's Stone",
        image: '/kitap3.jpg'
    },
    {
        id:1,
        title: "Harry Potter And The Sorcerer's Stone",
        image: '/kitap4.jpg'
    },
    {
        id:1,
        title: "Harry Potter And The Sorcerer's Stone",
        image: '/kitap1.jpg'
    },
  ];
  return (
    <main>
    <KudusBaslikAlan baslik={"KİTAPLAR"} />
    <Container maxW={1020} p={0}>
    <Flex direction={{base:"column",lg:"row"}} gap={5} py={10}>
        <Box width={{base:"100%",lg:"70%"}}>
            <Flex direction={"column"} gap={5} px={{base:5,lg:0}}>
                <Heading color={'#3A829B'}>GÜNCEL KİTAPLAR</Heading>
                <Grid templateColumns={{base:'repeat(2,1fr)',lg:'repeat(3,1fr)'}} gap={5}>
                {postdata.map((post, index) => {
                    let documentlink;
                    if(post.documents){
                        documentlink = "https://minberiaksa.org/uploads/"+post.documents;
                    }else{
                        documentlink = "#";
                    }
                    return (
                        <Link key={index} href={documentlink}><Flex direction={'column'} key={index}>
                        <Image src={"https://minberiaksa.org/uploads/"+post.picture} height={'280px'} borderRadius={10} />
                        <Text p={2} px={5} bg={'#eee'} borderRadius={25} alignSelf={'center'} color={'#000'} mt={'-15px'} fontSize={11}>{post.summary}</Text>
                        <Text fontSize={14} fontWeight={500} textAlign={'center'} mt={2}>{post.title}</Text>
                    </Flex></Link>
                )})};
                </Grid>
            </Flex>
        </Box>

        <Box width={{base:"100%",lg:"30%"}} mt={{base:0,lg:'-70px'}} zIndex={5}>
            <AsideOtherPages listtype="subcatlist" katid={"67223064012d3f025450d1f0"} type="kudus"/>
        </Box>
    </Flex>

    {/*<Flex direction={"column"} gap={5} p={0}>
        <Heading color={'#3A829B'}>GÜNCEL KİTAPLAR</Heading>
        <Grid templateColumns={'repeat(5,1fr)'} gap={5}>
        {postdata.map((post, index) => (
            <Flex direction={'column'} key={index}>
                <Image src={"https://minberiaksa.org/uploads/"+post.picture} height={'280px'} borderRadius={10} />
                <Text p={2} px={5} bg={'#eee'} borderRadius={25} alignSelf={'center'} color={'#000'} mt={'-15px'} fontSize={11}>{post.summary}</Text>
                <Text fontSize={14} fontWeight={500} textAlign={'center'} mt={2}>{post.title}</Text>
            </Flex>
        ))};
        </Grid>
    </Flex>*/}
    
      
    </Container>
    </main>
  )
}
