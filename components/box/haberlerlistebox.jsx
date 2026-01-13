
"use client";
import React from 'react'
import { Image,Box,Text, Flex, Divider } from '@chakra-ui/react'
import Link from 'next/link'
import { BsArrowRight, BsClockFill,BsFillTelephoneFill } from "react-icons/bs";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import {FaEnvelope,FaLocationArrow,FaMap} from "react-icons/fa";

export default function HaberlerListeBox({bagid,baslik,img,desc,url,listtype,post}) {
  let languageCode = useLanguageBelirtec();
  let messages = useLanguage();
  let linktipi, classadi;
  if(listtype == ""){
    linktipi="/";
    classadi = "haberlerarticle";
  }else if(listtype == "faaliyetler"){
    linktipi="/";
    classadi = "haberlerarticle";
  }else if(listtype == "fotogaleri"){
    linktipi="/fotogaleri/";
    classadi = "fotogaleriarticle";
  }else if(listtype == "videogaleri"){
    linktipi="/videogaleri/";
    classadi = "videogaleriarticle";
  }else if(listtype == "kudus"){
    linktipi="/kudus/detay/";
    classadi = "haberlerarticle";
  }else{
    linktipi="/";
    classadi = "haberlerarticle";
  }
  img = "https://minberiaksa.org/uploads/"+img;
  if(listtype == "temsilciliklerimiz"){

    let multiparams = post.multiparams;
    let telefonnumarasi = multiparams.find(param => param.type.key === "67546861bf3402185e27d1e2").value;
    let epostaadresi = multiparams.find(param => param.type.key === "67546868bf3402185e27d1e3").value;
    let acikadres = multiparams.find(param => param.type.key === "67546871bf3402185e27d1e4").value;
    let konumgmaps = multiparams.find(param => param.type.key === "6754687abf3402185e27d1e5").value;
    
    return (
      <Box className={classadi} border={'1px solid #eee'} borderRadius={15} borderTopRightRadius={0} borderBottomLeftRadius={0} bg={'#fff'}>
        <Link href={languageCode+linktipi+url} locale={languageCode}><Text my={{base:0,lg:4}} px={{base:2,lg:2}} mt={5} mb={[0,0]} pb={0} pl={5} fontSize={16} fontWeight={600} noOfLines={2} textTransform={'uppercase'}>{baslik}</Text></Link>
        <Flex direction="row" justifyContent={"space-between"} p={5}>
          <Flex direction="row" flex={1} alignItems={'center'} gap={3}>
            <BsFillTelephoneFill size={22} />
            <Flex direction={"column"}>
            <Text fontWeight={600}>Telefon Numarası</Text>
            <Text>{telefonnumarasi}</Text>
            </Flex>
          </Flex>
          <Flex direction="row" flex={1} alignItems={'center'} gap={3}>
            <FaEnvelope size={22} />
            <Flex direction={"column"}>
            <Text fontWeight={600}>E-Posta</Text>
            <Text>{epostaadresi}</Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex direction="row" justifyContent={"space-between"} p={5}>
          <Flex direction="row" flex={1} alignItems={'center'} gap={3}>
            <FaMap size={22} />
            <Flex direction={"column"}>
            <Text fontWeight={600}>Konum</Text>
            <Text><Link href={konumgmaps}>Konumu görmek için tıklayın</Link></Text>
            </Flex>
          </Flex>
          <Flex direction="row" flex={1} alignItems={'center'} gap={3}>
            <FaLocationArrow style={{width:45}} size={22} />
            <Flex direction={"column"}>
            <Text fontWeight={600}>Adres</Text>
            <Text>{acikadres}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Box>
    )
  }else{
  return (
    <Box flex={1} key={post.id} borderRadius={5} _odd={{
      '.categorybadge': {bg:'#ae3e30'},
      '.datebadge': {bg:'#ff8576',color:'#fff'}
    }} _even={{
      '.categorybadge': {bg:'#DA9534'},
      '.datebadge': {bg:'#FEE7C6'}
    }} >
        <Link href={languageCode+linktipi+url}><Image objectFit='cover' width={'100%'} height={240} src={img} borderRadius={20}/></Link>
        <Flex direction={"row"} my={5} gap={0}>
            <Flex direction={'column'} className='datebadge' bg={'#B1FFE3'} p={2} borderRadius={10} borderTopRightRadius={0}>
                <Text fontSize={16} textAlign={'center'} fontWeight={600}>14</Text>
                <Text fontSize={14} textAlign={'center'} fontWeight={600}>MRT</Text>
            </Flex>
            <Flex direction={'column'} alignItems={'flex-start'}>
                <Text className='categorybadge' width={'auto'} color={"#FFF"} fontWeight={200} fontSize={12} bg={'#29C68D'} p={1} px={2} flexShrink={0}>Seminerler</Text>
                <Link href={languageCode+linktipi+url}><Text className="post-title" style={{fontSize:15,fontWeight:600}} p={1} px={2} noOfLines={1}>{baslik}</Text></Link>
            </Flex>
        </Flex>
    </Box>
  )
  }
}
