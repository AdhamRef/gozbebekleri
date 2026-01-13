import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Accordion,AccordionItem,AccordionButton,AccordionPanel,AccordionIcon,} from '@chakra-ui/react'
import HaberlerListeBox from '@/components/box/haberlerlistebox';
import Breadcrumbs from "@/components/breadcrumbs";
import { IoIosArrowDropright } from "react-icons/io";
import { AiOutlineHome } from "react-icons/ai";
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import { notFound } from 'next/navigation';

export default async function ProjeId({data}) {
    const posts = data; // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data;
    if (!poststatus) {
        postdata = [{
            category: { title: "Varsayılan Başlık" },
            title: "Varsayılan Başlık",
        }];
    }
    let listtype,templatecolumns;
    if(postdata[0].category.key == "6754682fbf3402185e27d1de"){
        listtype = "temsilciliklerimiz";
        templatecolumns = "repeat(2, 1fr)";
    }else if(postdata[0].category.key == "6722310a012d3f025450d200"){
        listtype = "senelikrapor";
        templatecolumns = "repeat(2, 1fr)";
    }else{
        listtype = "haberlerarticle";
        templatecolumns = "repeat(3, 1fr)";
    }

    const sortedData = postdata.sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
        <main>
        <Flex bgColor={'#CE8B2B'} bgImage={{base:'/mobiltitlebg.jpg',lg:'/haberlerlistebaslikbg.jpg'}} bgSize={{base:'cover',lg:'contain'}} bgPos={'right center'} bgRepeat={'no-repeat'} style={{backgroundPositionX:'110%'}} direction={'column'} py={{base:'2em',lg:'4em'}}>
        <Container maxW={1200} p={0}>
        <Flex direction={'row'} gap={5} px={{base:4,lg:0}}>
            <AiOutlineHome className='mobilehide'  size={'40px'} color={'#FFC471'} style={{marginTop:4}}/>
            <Flex direction={'column'} gap={0}>
            <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}> {postdata[0].category.title}</Heading>
            <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
            <Flex direction={"row"}>
                <Breadcrumbs line={{kategori:postdata[0].category.title}} color={'#fff'} />
            </Flex>
            </Flex>
        </Flex>
        </Container>
        </Flex>
        <Container maxW={1200} p={0}>
        <Grid className="haberlerliste" templateColumns={templatecolumns} gap={6} py={10} px={{base:5,lg:0}}>
        {sortedData.map((post, index) => (
            <HaberlerListeBox key={post.id} bagid={post.id} baslik={post.title} img={post.picture} url={post.url} desc={post.desc} listtype={listtype} post={post}/>
        ))}
        </Grid>
        </Container>
        </main>
    )
}
