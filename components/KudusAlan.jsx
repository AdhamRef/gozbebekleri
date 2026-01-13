"use client";
import React, { useState,useEffect } from 'react'
import { Flex,Box,Center,Text,useMediaQuery,Button,} from '@chakra-ui/react'
import { FaArrowRight } from "react-icons/fa";
import Link from "next/link";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";


export default function KudusAlan() {
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [hadisData,setHadisData] = useState({status:false});
  const [kudusKategoriler,setKudusKategoriler] = useState({status:false});
  let dil = useLanguageBelirtec();
  let messages = useLanguage();
  let dilfetch = dil.replace("/","");
  if(dilfetch==""){
      dilfetch = "tr";
  }

  const HadisData = async () => {
    let fetchid = "676d562734a8f5a63bd50fe2";
    try {
      const response_ham = await fetch("/api/icerikDetay", {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept-Language': dilfetch,
          },
          body: JSON.stringify({type:'contents',id: fetchid })
      });
  
      if (response_ham.ok) {
          const response = await response_ham.json(); // response_ham'dan JSON verisini al
          setHadisData(response);
      }
    }catch (error) {
      console.error('Error:', error);
    }
  }

  const KudusKategorileriData = async () => {
    let fetchid = "67223064012d3f025450d1f0";
    try {
      const response_ham = await fetch("/api/kategoriListe", {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept-Language': dilfetch,
          },
          body: JSON.stringify({type:'contentsCat',id: fetchid })
      });
  
      if (response_ham.ok) {
          const response = await response_ham.json(); // response_ham'dan JSON verisini al
          setKudusKategoriler(response);
      }
    }catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    HadisData();
    KudusKategorileriData();
  }, [])

  useEffect(() => {
  }, [kudusKategoriler])

  if(isMobile){
    return(
      <Box px={3}>
        <Center><Text fontSize={38} fontWeight={600} mt={'5em'} color={'#fff'}>{messages.jerusalem}</Text></Center>
        <Flex direction={"row"} gap={5} alignItems={'flex-end'} justifyContent={'space-between'} wrap={'wrap'}>
          {hadisData.status && 
            <Box>
            <div style={{color:'#fff', fontSize:14}} dangerouslySetInnerHTML={{__html:hadisData.data[0].detail}} />
            </Box>
          }
          {kudusKategoriler.status &&
          <Flex direction={'row'} wrap={'wrap'} gap={3} mt={2}>
              {kudusKategoriler.data.map((post,index) => (
              <Button key={index} as={Link} href={dil+'/kudus/'+post.url} variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>{post.categoryname}</Button>
              ))}
          </Flex>
          }
        </Flex>
    </Box>
    )
  }else{
    return (
      <Box>
      <Center><Text fontSize={38} fontWeight={600} mt={'5em'} color={'#fff'}>{messages.jerusalem}</Text></Center>
      <div style={{width:'80%',position:"absolute",top:'60%',left:'10%'}}>
          <div className='kuduscizgi' style={{width:'100%',height:'3px',background:'white',position:'absolute'}}></div>
          <Flex direction={"row"} mt={'-146px'} alignItems={'flex-end'} justifyContent={'space-between'} wrap={'wrap'} minH={120}>
          {hadisData.status && 
          <div className='kudusbilgi' dangerouslySetInnerHTML={{__html:hadisData.data[0].detail}} />
          }
          {kudusKategoriler.status &&
          <Flex className='kategorialani' direction={'row'} gap={'70px'} mb={'5px'}>
          {kudusKategoriler.data.slice(0,4).map((post,index) => (
            <Link key={index} href={dil+'/kudus/'+post.url}><div className='ustkategori'>{post.categoryname} <FaArrowRight color={'white'} /></div></Link>
          ))}
          </Flex>
          }
          </Flex>
          <Flex direction={"row"} alignItems={'flex-end'} justifyContent={'space-between'}>
          {kudusKategoriler.status &&
              <Flex className='kategorialani' ml={'auto'} direction={'row'} gap={'70px'} mt={'64px'}>
              {kudusKategoriler.data.slice(4,8).map((post,index) => (
                <Link key={index} href={dil+'/kudus/'+post.url}><div className='altkategori'>{post.categoryname} <FaArrowRight color={'white'} /></div></Link>
              ))}
              </Flex>
          }
          </Flex>
      </div>
      </Box>
    )
  }
}
