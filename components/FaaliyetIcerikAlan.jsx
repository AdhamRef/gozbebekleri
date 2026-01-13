"use client";
import React,{useState} from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react'
import { CiCalendarDate,CiClock2,CiShare2 } from "react-icons/ci";
import { FaFacebookF,FaLinkedinIn,FaTwitter} from "react-icons/fa";
import Breadcrumbs from "@/components/breadcrumbs";

export default function FaaliyetIcerikAlan({data}) {
    const [fontAyari,setFontAyari] = useState(14);
    let title = data.title;
    let img = data.picture;
    function openShareWindow(social) {
        let currentUrl = window.location.href;
        let socialurl;
        if(social == "twitter"){
            socialurl = "https://twitter.com/intent/tweet?url="+currentUrl+"&text="+title;
        }
        if(social == "facebook"){
            socialurl = "https://www.facebook.com/sharer/sharer.php?u="+currentUrl;
        }
        if(social == "linkedin"){
            socialurl = "https://www.linkedin.com/sharing/share-offsite/?url="+currentUrl;
        }
        window.open(
            socialurl,
            "_blank",
            "width=600,height=400,top=" + (window.innerHeight / 2 - 200) + ",left=" + (window.innerWidth / 2 - 200)
        );
    }

    if(img == ""){
        img = "http://crm.tussesleri.com/uploads/varsayilan.jpg";
    }else{
        img = "http://crm.tussesleri.com/uploads/"+img
    }
  return (
    <>
    <Flex mt={10}>
        <Image src={img} minW={'100%'} minH={'450px'} h={'400px'} borderRadius={25} objectFit={'cover'}/>
    </Flex>
    <Flex w={'80%'} margin={'auto'} direction={'column'} bgColor={'#04819C'} borderRadius={25} p={'4em'} py={'2.5em'} mt={'-10em'} gap={7} zIndex={5} position={'relative'} style={{boxShadow:'0px 0px 10px -1px rgba(0,0,0,0.19)'}} >
        <Text bg={'#fff'} borderRadius={25} p={1} px={10} alignSelf={'center'} textAlign={'center'} color={'#04819C'} fontWeight={600} fontSize={12}>{data.category.title}</Text>
        <Heading as='h1' size='xl' color={'#FFF'} fontWeight={600} textAlign={'center'}>
        {data.title}
        </Heading>
        <Flex direction={"row"} justifyContent={'center'}>
        <Breadcrumbs line={{kategori:data.category.title,sayfa:data.title}} />
        </Flex>
        <Flex direction={'row'} gap={10} justifyContent={'center'}>
            <Flex direction={'row'} gap={2} alignItems={'center'} color={'#56C0D7'}>
                <CiCalendarDate size={20} />
                <Text fontWeight={600} fontSize={14}>15 Haziran 2023</Text>
            </Flex>
            <Flex direction={'row'} gap={2} alignItems={'center'} color={'#56C0D7'}>
                <CiClock2 size={20} />
                <Text fontWeight={500} fontSize={14}>17:45</Text>
            </Flex>
            <Flex direction={'row'} gap={2} alignItems={'center'} color={'#FFFFFF'}>
                <CiShare2 size={20} />
                <Button w={25} h={25} minW={'inherit'} p={2} py={2} bg={'#12758A'} color={'#fff'} borderRadius={6} onClick={() => openShareWindow('facebook')}><FaFacebookF size={12}/></Button>
                <Button w={25} h={25} minW={'inherit'} p={2} py={2} bg={'#12758A'} color={'#fff'} borderRadius={6} onClick={() => openShareWindow('twitter')}><FaTwitter size={12}/></Button>
                <Button w={25} h={25} minW={'inherit'} p={2} py={2} bg={'#12758A'} color={'#fff'} borderRadius={6} onClick={() => openShareWindow('linkedin')}><FaLinkedinIn size={12}/></Button>
            </Flex>
            <Flex direction={'row'} gap={2} alignItems={'center'} color={'#FFFFFF'}>
                <Button w={25} h={25} minWidth={'inherit'} p={2} bg={'#12758A'} color={'#fff'} borderRadius={6} fontSize={10} onClick={() => setFontAyari(fontAyari-1)}>A-</Button>
                <Button w={25} h={25} minWidth={'inherit'} p={2} bg={'#12758A'} color={'#fff'} borderRadius={6} fontSize={10} onClick={() => setFontAyari(fontAyari+1)}>A+</Button>
            </Flex>
        </Flex>
    </Flex>
    <Flex direction={["column","row"]} gap={5} py={10}>
        <Box width={'100%'} borderRadius={25}>
            <Flex direction={"column"} gap={5} >
                <Heading>{data.title}</Heading>
                <div className='detaymetin' style={{fontSize:fontAyari+'px'}} dangerouslySetInnerHTML={{__html:data.detail}}/>
            </Flex>
        </Box>
    </Flex>
    </>
  )
}
