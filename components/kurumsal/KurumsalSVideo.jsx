"use client";
import React from 'react'
import {Flex,Text,Button,useDisclosure} from "@chakra-ui/react";
import { RxVideo } from "react-icons/rx";
import VideoModal from "@/src/app/components/VideoModal";

export default function KurumsalSVideo({videoKodu,metin}) {
    const {isOpen, onOpen, onClose} = useDisclosure();
  return (
    <>
    <Flex width={{base:'100%',lg:'55%'}} onClick={onOpen} cursor={'pointer'} direction={'column'} gap={3} p={5} px={7} borderRadius={15} bgImage={'/videotanitim.jpg'} bgRepeat={'no-repeat'} justifyContent={'center'} alignItems={'center'} height={{base:300,lg:600}}>
        <Flex direction={'column'} gap={5} alignItems={'center'}>
            <RxVideo size={48} color={'#fff'}/>
            <Text color={'#fff'} fontSize={20} fontWeight={600}>Tanıtım Videosu</Text>
        </Flex>
        <Text color={'#fff'}>İzlemek için Tıklayınız</Text>
    </Flex>
    <VideoModal videoKodu={videoKodu} isOpen={isOpen} onClose={onClose} />
    </>
  )
}
