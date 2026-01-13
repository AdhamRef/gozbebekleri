import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { cache } from "react";
import Head from 'next/head';
import '@/dosyalar/css/bootstrap.min.css';
import '@/dosyalar/css/bootstrapform.css';
import Formlar from "@/components/Formlar/formlar";
import { AiOutlineHome } from "react-icons/ai";

const getPost = cache(async ({detayid}) => {
    const slugToken = await customFetch({type:'slug',text:detayid});
    let token = slugToken.data.keyID;
    return token;
});

export async function generateMetadata({ params }) {
    const posts_token = await getPost({ detayid: params.id }); // detayid'i doğrudan geçiriyoruz
    let posts = await customFetch({ type: 'forms'});
    const poststatus = posts.status;
    let posts_data = posts['data'];
    const result = posts_data.find(item => item.token === posts_token);
    const postdata = result;

    return {
        title: poststatus ? postdata.formadi : "Varsayılan Başlık",
        description: poststatus ? postdata.formadi : "Varsayılan Açıklama",
    };
}
export default async function page({params}) {
    const posts_token = await getPost({ detayid: params.id }); // detayid'i doğrudan geçiriyoruz
    let posts = await customFetch({ type: 'forms'});
    const poststatus = posts.status;
    let posts_data = posts['data'];
    const result = posts_data.find(item => item.token === posts_token);
    let postdata = result;
    let formdata = result.formdetay;
    return (
    <>
    <Head>
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auUjK/fz97hZVxan2hwD8D91jjt8dFYh9D6aK7"
        crossOrigin="anonymous"
    />
    <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+P3P4EaG7h09gTTfj0I5qPcKz3xU/"
        crossOrigin="anonymous"
        defer
    ></script>
    </Head>
    <main>
    <Flex bgImage={'/detaybaslikbg.jpg'} direction={'column'} py={'4em'}>
    <Container maxW={1200} p={0}>
    <Flex direction={'row'} gap={5}>
        <AiOutlineHome size={28} color={'#FFC471'} style={{marginTop:4}}/>
        <Flex direction={'column'} gap={0}>
        <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>{postdata.formadi}</Heading>
        <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
        <Flex direction={"row"}>
            <Breadcrumbs line={{sayfa:postdata.formadi}} color={'#fff'} />
        </Flex>
        </Flex>
    </Flex>
    </Container>
    </Flex>
    <Container maxW={1200} p={0}>
    <Formlar postdata={postdata} formdata={formdata} />
    </Container>
    </main>
    </>
  )
}
