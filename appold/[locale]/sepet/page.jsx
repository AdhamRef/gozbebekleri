import React from 'react'
import { Box,Image,Container,Flex,Text,Button,useToast,Tag,TagLabel,TagLeftIcon, } from '@chakra-ui/react'
import OdemeAdimlariWizard from "@/components/OdemeAdimlariWizard";
import SepetItems from "@/components/sepet/sepetItems";
import {language} from "@/main/utilities/languageS";
import { headers } from "next/headers";
  export default function Sepet(){
    const heads = headers();
    const pathname = heads.get("x-pathname"); 
    let lang= language(pathname);


  return (
    <div>
    <Container maxW={1000} py={8}>
        <Flex direction={"column"} >
            <OdemeAdimlariWizard adim={1} />

            <Flex direction={"column"} alignItems={"center"}  bg={'white'} p={{base:5,lg:10}} boxShadow={'lg'} borderRadius={'burakradi'}>
            <Flex style={{width:"100%",}} pb={5} direction="row" justify={"space-between"} >
                <Flex style={{}} direction={"row"} alignItems={"center"} gap={3}>
                    <Image src={'/carticon.svg'} width={30} style={{filter:'invert(0%) sepia(83%) saturate(1252%) hue-rotate(-53deg) brightness(99%) contrast(119%)'}} />
                    <Text mt={0.5} fontSize={28} fontWeight={600} className='sepettextgradient'>{lang.cart}</Text>
                </Flex>
                {/*Sepetlerd.length > 0 ? <Flex style={{cursor:"pointer"}} mt={2} direction={"row"} alignItems={"center"} gap={2}>
                    <Text mt={0} fontSize={15} fontWeight={400} color={"#ccc"}>Sepeti Temizle</Text>
                    <BsFillTrashFill fontSize={15} color={"#ccc"} />
                </Flex>
                : null */}
            </Flex>
            <SepetItems />
            </Flex>
        </Flex>
    </Container>
    </div>
  )
}

