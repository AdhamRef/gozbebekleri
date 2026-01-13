import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Alert,AlertIcon,AlertTitle,AlertDescription,} from '@chakra-ui/react'
import HaberlerListeBox from '@/components/box/haberlerlistebox';

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import KudusBaslikAlan from "@/components/KudusBaslikAlan";
import AsideOtherPages from "@/components/AsideOtherPages";

const getPost = cache(async ({listeid}) => {
    const slugToken = await customFetch({type:'slug',text:listeid});
    let token = slugToken.data.keyID;
    return await customFetch({ type: 'list', id: token });
});

export async function generateMetadata({params}) {
    const posts = await getPost({listeid: params.listeid }); // detayid'i doğrudan geçiriyoruz
    let poststatus = posts.status;
    let postdata = posts.data[0];
    return {
        title: postdata.category.title,
        description: postdata.category.title,
    };
}

export default async function ListeId({params}) {

    const posts = await getPost({listeid:params.listeid}); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data;
  return (
    <main>
    <KudusBaslikAlan baslik={postdata[0].category.title} />
    <Container maxW={1020} p={0}  px={{base:3,lg:0}}>
    <Flex direction={{base:"column",lg:"row"}} gap={5} py={10}>
    <Box width={{base:"100%",lg:"70%"}}>
    {poststatus ? 
    <Grid className="haberlerliste" templateColumns='repeat(2, 1fr)' gap={6} py={10} >
    {postdata.map((post, index) => (
        <HaberlerListeBox key={index} bagid={post.token} baslik={post.title} img={"https://minberiaksa.org/uploads/"+post.picture} url={post.url} listtype={"kudus"} desc={post.summary} />
    ))}
    </Grid>
    :
    <Alert status='warning' my={10}>
        <AlertIcon />
        Bu kategoride içerik bulunamadı, yakın zamanda tekrar ziyaret edebilirsiniz. Teşekkürler.
    </Alert>
    }
    </Box>
    <Box width={{base:"100%",lg:"30%"}} mt={{base:0,lg:'-70px'}} zIndex={5}>
        <AsideOtherPages listtype="subcatlist" katid={"67223064012d3f025450d1f0"} type="kudus"/>
    </Box>
    </Flex>
    </Container>
    </main>
  )
}
