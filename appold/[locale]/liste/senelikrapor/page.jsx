import React from 'react'
import { Box,Image,Container,Flex,Text,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Accordion,AccordionItem,AccordionButton,AccordionPanel,AccordionIcon,} from '@chakra-ui/react'
import Link from "next/link"
import Head from "next/head";
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSquareFull } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { IoIosArrowDroprightCircle } from "react-icons/io";
import { IoIosArrowDropright } from "react-icons/io";
import Breadcrumbs from "@/components/breadcrumbs";
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

const getPost = cache(async ({params}) => {
    let fetchid = "6722310a012d3f025450d200";
    return await customFetch({type:'list',id:fetchid});
});

export async function generateMetadata() {
    const posts = await getPost({detayid:"senelikrapor"}); 
    let poststatus = posts.status;
    let postdata = posts.data[0];

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}

export default async function page() {
    const posts = await getPost({detayid:"senelikrapor"});
    let poststatus = posts.status;
    let postdata = posts.data;
    const sortedData = postdata.sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
    <main>
    <Container maxW={1020} p={0} px={{base:3,lg:0}}>
    <Flex direction={'column'} bgColor={'#FFF'} borderRadius={25} p={'2em'} py={'2.5em'} mt={10} boxShadow={'xs'} >
        <Heading as='h1' fontSize={22} noOfLines={1} color={'#04819C'} fontWeight={600}>
        {postdata[0].category.title}
        </Heading>
        <Flex direction={"row"}>
        <Breadcrumbs line={{kategori:postdata[0].category.title}} />
        </Flex>
    </Flex>
    <Flex direction={"column"} gap={5} py={10}>
        <Box width={'100%'} >
        <Accordion defaultIndex={[0]} className='accordionKategori'>
            {sortedData.map((post,index) => (
            <AccordionItem key={index} bg={"#FFFFFF"} boxShadow={'lg'} py={5} px={3} borderRadius={25} mb={5} borderWidth={0}>
            <h2>
                <AccordionButton color={'#696969'} fontSize={20} fontWeight={600}>
                    <IoIosArrowDropright style={{marginRight:5,transition:'all .5s'}} size={24} />
                    <Box as='span' flex='1' textAlign='left'>{post.title}</Box>
                </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                <div dangerouslySetInnerHTML={{__html:post.detail}} />
                </AccordionPanel>
            </AccordionItem>

            ))}
            
            </Accordion>
        </Box>

        
        </Flex>

        
    </Container>
    </main>
    )
}
