import React from 'react'
import { Box,Image,Container,Flex,Text,Center,Select,Input,Textarea,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Button} from '@chakra-ui/react'
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSquareFull } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { CiBank } from "react-icons/ci";
import { MdAddShoppingCart } from "react-icons/md";

import AylikBagisForm from '@/components/AylikBagisForm';
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import { notFound } from 'next/navigation';

const getPost = cache(async ({kategori}) => {
    const slugToken = await customFetch({type:'slug',text:kategori});
    if(!slugToken.status){notFound()}
    let token = slugToken.data.keyID;
    return await customFetch({ type: 'list', id: token });
});

/*
export async function generateMetadata({params}) {
    const posts = await getPost({kategori: params.kategori }); // detayid'i doğrudan geçiriyoruz
    let poststatus = posts.status;
    let postdata = poststatus ? posts.data[0] : "";

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}*/
export default async function Aylikbagis() {

    const posts = await getPost({kategori:"aylik-bagis-2"}); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data;
    if (!poststatus) {
        postdata = [{
            category: { title: "Varsayılan Başlık" },
            title: "Varsayılan Başlık",
        }];
    }

    const posts_articles = await getPost({kategori:"duzenli-bagisin-faydalari-nelerdir"}); // Veriyi al
    let poststatus_articles = posts_articles.status;
    let postdata_articles = posts_articles.data;
    
  return (
    <main>
    <Flex direction={'column'} p={{base:10,lg:'8em'}} pt={{base:'14em',lg:'14em'}} bgImage={'/aylikbagisbg.jpg'} bgSize={'cover'} mt={{base:'-12em',lg:'-10em'}} height={{base:'auto',lg:'900px'}}>
        <Center style={{margin:'auto'}}><Image src={'/aylikbagisbaslik.png'} width={{base:'100%',lg:'75%'}} height={'auto'} /></Center>
    </Flex>
    <Container maxW={1020} p={0}  px={{base:3,lg:0}}>
    <Flex direction={["column"]} gap={5} py={10}>
        <AylikBagisForm />
        <Flex direction={"column"} gap={10} mt={10}>
            <Flex direction={"column"}>
                    <Heading as="h1" size={'xl'} textAlign={'center'}>{postdata[0].title}</Heading>
                    <Text fontSize={22} fontWeight={500} textAlign={'center'} mt={3}>{postdata[0].summary}</Text>
            </Flex>
            <Flex direction={{base:'column',lg:"row"}} alignItems={'center'}>
                <Image src={"https://burakdernegi.org/uploads/"+postdata[0].picture[0]} width={350} flex="1" />
                <div style={{fontSize:18,fontWeight:400,lineHeight:'175%',flex:1}} dangerouslySetInnerHTML={{__html:postdata[0].detail}} />
            </Flex>
        </Flex>
    </Flex>
    </Container>
    <Flex bgImage={'/aylikbagisaltbg.png'} direction={["column"]} gap={5} py={'3em'}>
    <Container maxW={1020} p={0}  px={{base:3,lg:0}}>
        <Flex direction={"column"} gap={10} mt={10}  >
            <Flex direction={"column"}>
                    <Heading as="h2" size={'xl'} textAlign={'center'}>{postdata[1].title}</Heading>
            </Flex>
            <Flex direction={"row"} alignItems={'center'}>
                <Image src={"https://burakdernegi.org/uploads/"+postdata[1].picture[0]} width={'100%'} flex="1" />
            </Flex>
        </Flex>
        <Flex direction={'column'} gap={5} mt={'5em'}>
            <Flex direction={"column"}>
                    <Heading as="h2" size={'xl'} textAlign={'center'}>{postdata[1].title}</Heading>
            </Flex>
            <Flex direction={{base:'column',lg:'row'}} gap={5} mt={10}>
            {postdata_articles && postdata_articles.map((postr,index) => {
                let img = postr.picture[0];
                return (
                <Flex key={index} direction={"column"} className='duzenlibagisinfaydalari' p={10} flex={1} bg={'#fff'} boxShadow={'md'} borderRadius={15} position={'relative'}>
                    <Box style={{position:'absolute',left:0,top:0,width:'100%',height:'100%', backgroundImage:'url(https://burakdernegi.org/uploads/'+img+')',backgroundSize:'contain',backgroundPosition:'center', backgroundRepeat:'no-repeat'}} />
                    <Text fontSize={28}>{postr.summary}</Text>
                    <Text fontSize={18} fontWeight={500}>{postr.title}</Text>
                </Flex>
            )})}
            </Flex>

        </Flex>
        
    </Container>
    </Flex>
    </main>
  )
}
