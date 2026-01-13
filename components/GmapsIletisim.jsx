"use client";
import React from 'react'
import { Box,Image,Container, } from '@chakra-ui/react'
import { useAuth } from '@/components/LayoutProvider';

export default function GmapsIletisim() {
  const {settings} = useAuth();

  return (
    <Container maxW={"100%"} p={0} mt={20}>
        <Box p={0}>
        <div className='iletisimmaps' style={{width:'100%'}} dangerouslySetInnerHTML={{__html:settings.map}}></div>
        </Box>
    </Container>
  )
}
