import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'

export default function NotFound() {
  return (
    <main>
    <Container maxW={1020} p={0} minH={450} display={'flex'} flexDirection={'column'} justifyContent={'center'}>
      <Text textAlign={'center'} fontSize={28} fontWeight={600}>
        Aradığınız Sayfa Bulunamadı!
      </Text>
      <Text textAlign={'center'} fontSize={14} fontWeight={500} mt={'1em'}>
        Aradığınız sayfaya ulaşmak için sayfa sonundaki menüleri inceleyebilir ya da sitede arama yapabilirsiniz.
      </Text>
    </Container>
    </main>
  )
}
