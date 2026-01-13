"use client";
import React from 'react'
import { Image,Box,Text } from '@chakra-ui/react'
import BagisKutuButtonComponent from '../app/[locale]/BagisKutuButtonComponent';
import Link from 'next/link'



export default function BagisKutuComp({bagid,baslik,img}) {
  return (
    <Box className="BagisKutu">
    <Link href="/d/katarakt-yardimi"><Image objectFit='cover' src={img} alt='Dan Abramov' /></Link>
    <Box className="bilgi">
        <Link href="/d/katarakt-yardimi"><Text className="baslik">{baslik}</Text>
        <Text className="ozet" noOfLines={2}>
        Kudüs&apos;	ün % 00&apos;	ine hizmet veren Makasıd Vakıf Hastanesi&apos;	ne tıbbi malzeme, ilaç ve nakdi yardım desteklerimizi sürdürüyoruz. Son günlerde düzenlediğimiz kampanya ile bağışçılarımızın gönderdiği emanetleri tıbbi malzeme almak suretiyle hastaneye teslim ettik.
        </Text></Link>
        <BagisKutuButtonComponent bagisid={bagid} />
    </Box>
    </Box>
  )
}
