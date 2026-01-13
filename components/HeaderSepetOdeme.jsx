import React from 'react'
import {Container,Button, Image, Flex, Text, } from '@chakra-ui/react'
import { BsArrowLeftCircle } from "react-icons/bs";
import { useRouter } from 'next/navigation'  // Usage: Page router
export default function HeaderSepetOdeme() {
  const router = useRouter()
  return (
    <header style={{background:'#fff',}}>
      <Container maxW="970px" py="2" px={[5,0]}>
            <Flex direction="row" justify="space-between" align="center">
            <Button variant={"none"} p={0} fontSize={[12,14]} fontWeight={"600"} leftIcon={<BsArrowLeftCircle />} onClick={() => router.back()}>GERİ DÖN</Button>                   
            <Image boxSize='60px' src="https://eldenele.org.tr//upload/Dokuman/opt-logo-547GSD70VRY76MA0R2CT.png"  />
            <Text fontSize={[12,14]} textTransform={"uppercase"} fontWeight={"600"} color={"green"}>Cüneyt Anlayışlı</Text>                   
            </Flex>
        </Container>
    </header>
  )
}
