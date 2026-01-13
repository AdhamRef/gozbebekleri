"use client";
import React from 'react'
import { Flex,Box,Center,Text,useMediaQuery,Button,} from '@chakra-ui/react'
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
export default function KudusAlanAnasayfa({hadisData}) {
  const [isMobile] = useMediaQuery("(max-width: 768px)");

  
    if(isMobile){
        return(
          <Box px={3}>
            <Center><Text fontSize={38} fontWeight={600} mt={'5em'} color={'#fff'}>KUDÜS</Text></Center>
            <Flex direction={"row"} gap={5} alignItems={'flex-end'} justifyContent={'space-between'} wrap={'wrap'}>
              <Box>
              {hadisData.status && <Text color={'#fff'} fontSize={14}>{hadisData.data[0].detail}</Text>}
              </Box>
              <Flex direction={'row'} wrap={'wrap'} gap={3} mt={2}>
                  <Button variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>HABERLER</Button>
                  <Button variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>VİDEOLAR</Button>
                  <Button variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>FOTOĞRAFLAR</Button>
                  <Button variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>KİTAPLAR</Button>
                  <Button variant={'solid'} bg={'#153649'} fontSize={14} color={'#fff'} py={6} px={7}>MAKALELER</Button>
              </Flex>
            </Flex>
        </Box>
        )
      }else{
        return (
          <Box>
          <Center><Text fontSize={38} fontWeight={600} mt={'5em'} color={'#fff'}>KUDÜS</Text></Center>
          <div style={{width:'80%',position:"absolute",top:'60%',left:'10%'}}>
              <div className='kuduscizgi' style={{width:'100%',height:'3px',background:'white',position:'absolute'}}></div>
              <Flex direction={"row"} mt={'-146px'} alignItems={'flex-end'} justifyContent={'space-between'} wrap={'wrap'}>
              {hadisData.status && 
              <div className='kudusbilgi'>
              {hadisData.data[0].detail}
              </div>
              }
              <Flex className='kategorialani' direction={'row'} gap={'70px'} mb={'5px'}>
                  <Link href={dil+'/kudus/haberler'}><div className='ustkategori'>HABERLER <FaArrowRight color={'white'} /></div></Link>
                  <Link href={dil+'/kudus/videolar'}><div className='ustkategori'>VİDEOLAR <FaArrowRight color={'white'} /></div></Link>
                  <Link href={dil+'/kudus/fotograflar'}><div className='ustkategori'>FOTOĞRAFLAR <FaArrowRight color={'white'} /></div></Link>
              </Flex>
              </Flex>
              <Flex direction={"row"} alignItems={'flex-end'} justifyContent={'space-between'}>
                  <Flex className='kategorialani' ml={'auto'} direction={'row'} gap={'70px'} mt={'64px'}>
                    <Link href={dil+'/kudus/kitaplar'}><div className='altkategori'>KİTAPLAR <FaArrowRight color={'white'} /></div></Link>
                    <Link href={dil+'/kudus/makaleler'}><div className='altkategori'>MAKALELER <FaArrowRight color={'white'} /></div></Link>
                  </Flex>
              </Flex>
          </div>
          </Box>
        )
      }
}
