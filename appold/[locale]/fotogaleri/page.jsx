import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react'
import HaberlerListeBox from '@/components/box/haberlerlistebox';
import Breadcrumbs from "@/components/breadcrumbs";
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";

const getPost = cache(async () => {
    let fetchid = "6753226ebf3402185e27ce32";
    return await customFetch({type:'list',id:fetchid});
});

export async function generateMetadata() {
    const posts = await getPost(); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data[0];

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}


export default async function Fotogaleri() {

  const posts = await getPost(); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data;
  const sortedData = postdata.sort((a, b) => new Date(b.date) - new Date(a.date));


  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);
  

  return (
    <main>
    <Container maxW={1020} p={0}  px={{base:3,lg:0}}>
    <Flex direction={'column'} bgColor={'#FFF'} borderRadius={25} p={'2em'} py={'2.5em'} mt={10} style={{boxShadow:'0px 0px 10px -1px rgba(0,0,0,0.19)'}} >
        <Heading as='h1' fontSize='22' noOfLines={1} color={'#04819C'} fontWeight={600}>
        {lang.photogallery}
        </Heading>
        <Flex direction={"row"}>
        <Breadcrumbs line={{kategori:lang.photogallery}} />
        </Flex>
    </Flex>
    
    <Grid className="haberlerliste" templateColumns='repeat(3, 1fr)' gap={6} py={10} >
    {sortedData.map((post, index) => (
        <HaberlerListeBox key={index} bagid={index} baslik={post.title} img={"https://minberiaksa.org/uploads/"+post.picture[0]} url={post.url} desc={post.summary} listtype={"fotogaleri"}/>
    ))}
    </Grid>
    </Container>
    </main>
  )
}
