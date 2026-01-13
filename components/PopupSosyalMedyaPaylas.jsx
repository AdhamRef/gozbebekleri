"use client";
import React from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,Button,useDisclosure,Box,Flex,Heading,Text } from '@chakra-ui/react'
import { BsFillShareFill } from "react-icons/bs";
import { FaFacebookF,FaTwitter,FaLinkedinIn,FaWhatsapp,FaTelegram } from "react-icons/fa";
import Link from "next/link";
export default function PopupSosyalMedyaPaylas({baslik,url}) {
  const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
  const { isOpen, onOpen, onClose } = useDisclosure()
  function openShareWindow(social) {
        url = "https://burakdernegi.org/" + "d/" + url;
        let socialurl;
        if(social == "twitter"){
            socialurl = "https://twitter.com/intent/tweet?url="+url+"&text="+baslik;
        }
        if(social == "facebook"){
            socialurl = "https://www.facebook.com/sharer/sharer.php?u="+url;
        }
        if(social == "linkedin"){
            socialurl = "https://www.linkedin.com/sharing/share-offsite/?url="+url;
        }
        if(social == "whatsapp"){
          socialurl = "whatsapp://send?text="+baslik+" | "+url;
        }
        if(social == "telegram"){
          socialurl = "https://telegram.me/share/url?url="+url+"&text="+baslik;
        }
        window.open(
            socialurl,
            "_blank",
            "width=600,height=400,top=" + (window.innerHeight / 2 - 200) + ",left=" + (window.innerWidth / 2 - 200)
        );
    }

  return (
    <>
      <Button h={38} bg={'#706B6B'} color={'white'} boxShadow={'inner'} size="md" px="5" fontSize={22} onClick={onOpen}><BsFillShareFill color='white' /></Button> 
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody>
          <Heading size={'lg'} mt={3}>Hemen Paylaş!</Heading>
          <Text my={3}>Sizde bu bağışı paylaşarak daha fazla kişiye ulaşmasını sağlayabilirsiniz!</Text>
          <Flex gap={1} direction={"row"} py={3}>
            <Box bg={'#3b5998'} py={4} px={4} onClick={() => openShareWindow('facebook')}>
               <FaFacebookF color={'white'} size={18} /> 
            </Box>
            <Box bg={'#1da1f2'} py={4} px={4} onClick={() => openShareWindow('twitter')}>
               <FaTwitter color={'white'} size={18} /> 
            </Box>
            <Box bg={'#0a66c2'} py={4} px={4} onClick={() => openShareWindow('linkedin')}>
               <FaLinkedinIn color={'white'} size={18} /> 
            </Box>
            <Box bg={'#25d366'} py={4} px={4} onClick={() => openShareWindow('whatsapp')}>
               <FaWhatsapp color={'white'} size={18} /> 
            </Box>
            <Box bg={'#0088cc'} py={4} px={4} onClick={() => openShareWindow('telegram')}>
               <FaTelegram color={'white'} size={18} /> 
            </Box>
          </Flex>
          </ModalBody>

          
        </ModalContent>
      </Modal>
    </>
  )
}
