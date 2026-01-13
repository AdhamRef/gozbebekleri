import React from 'react'
import {Container,Button,Box,Image, Flex, Text, } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'  // Usage: Page router
import { BsFacebook,BsTwitterX,BsYoutube,BsArrowLeftCircle,BsFillTelephoneFill   } from "react-icons/bs";

export default function FooterSepetOdeme({settings}) {
  const router = useRouter()
  return (
    <header style={{background:'#FBFBFB',}}>
      <Container maxW="970px" py="3" px={[5,0]}>
            <Flex direction="row" justify="space-between" align="center">
            <Flex direction={'row'} gap={3} alignItems={'center'}>
              <Image boxSize='90px' objectFit='contain' src={"https://minberiaksa.org/uploads/"+settings.logo}  />
              <Text style={{fontSize:14,color:'#AAAAAA',fontWeight:600,}}>{settings.title}</Text>
            </Flex>           
            <Flex direction={"column"} gap={2}>
              <Text fontSize={12} fontWeight={"600"} color={"#ccc"} textAlign={'right'}>{settings.telefon}</Text>    
              <Text fontSize={12} fontWeight={"600"} color={"#ccc"} textAlign={'right'}>{settings.email}</Text>   
            </Flex>    
            </Flex>
        </Container>
    </header>
  )
}
