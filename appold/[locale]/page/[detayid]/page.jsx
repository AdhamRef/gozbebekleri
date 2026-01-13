import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { AiOutlineHome } from "react-icons/ai";
import { cache } from "react";
import { notFound } from 'next/navigation';
const getPost = cache(async ({detayid}) => {
    const slugToken = await customFetch({type:'slug',text:detayid});
    if(!slugToken.status){notFound()}
    let token = slugToken.data.keyID;
    return await customFetch({ type: 'detail', id: token });
});

export async function generateMetadata({ params }) {
    const posts = await getPost({ detayid: params.detayid }); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    let title = postdata.seotitle ? postdata.seotitle : postdata.title;
    let summary = postdata.seodesc ? postdata.seodesc : postdata.summary;
    let image = "https://minberiaksa.org/uploads/"+postdata.picture;
    const currentUrl = ""+params.detayid;
    return {
        title: title,
        description: summary,
        openGraph: {
          title: title,
          description: summary,
          images: image,
          url: currentUrl,
        },
    };
}

export default async function page({params}) {
    const posts = await getPost({ detayid: params.detayid });
    let poststatus = posts.status;
    let postdata = posts.data[0];
    
  return (
    <main>
    <Flex bgImage={'/detaybaslikbg.jpg'} direction={'column'} py={'8em'}>
    <Container maxW={1020} p={0}>
    <Flex direction={'row'} gap={5}>
        <AiOutlineHome size={28} color={'#FFC471'} style={{marginTop:4}}/>
        <Flex direction={'column'} gap={0}>
        <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>{postdata.title}</Heading>
        <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
        <Flex direction={"row"}>
            <Breadcrumbs line={{kategori:postdata.category.title,sayfa:postdata.title}} color={'#fff'} />
        </Flex>
        </Flex>
    </Flex>
    </Container>
    </Flex>
    <Container maxW={1020} p={0}>
    <Flex direction={{base:"column",lg:"row"}} gap={5} py={10}>
        <Box width={{base:"100%",lg:"30%"}}>
            <AsideOtherPages listtype="list" katid={postdata.category.key} />
        </Box>
        <Box width={{base:"100%",lg:"80%"}} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
            <Flex direction={"column"} gap={5} >
                <Heading>{postdata.title}</Heading>
                <div className="temizleme" dangerouslySetInnerHTML={{__html:postdata.detail}} />
            </Flex>
        </Box>
    </Flex>   
    </Container>

    <Box>
      <Image src={'/ozgurfilistin.jpg'} width={'100%'} height={'auto'}/>
    </Box>
    </main>
  )
}
