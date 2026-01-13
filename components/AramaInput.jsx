'use client';
import React,{useState} from 'react'
import { useRouter } from 'next/navigation'
import { Button,IconButton,Flex,Text,Input,Modal,ModalOverlay,ModalContent,ModalHeader,ModalFooter,ModalBody,ModalCloseButton} from '@chakra-ui/react'
import { CiSearch } from "react-icons/ci";
import {useLanguageBelirtec,useLanguage} from "@/main/utilities/language";

export default function AramaInput({isOpen,onClose}) {
    const router = useRouter();
    const [aramaInput,setAramaInput] = useState();
    const gonder = () => {
        router.push('/arama/'+aramaInput);
        onClose();
    }
    let messages = useLanguage();

    return (
    <Modal isCentered size={'xl'} isOpen={isOpen} onClose={onClose}>
        <ModalOverlay
        bg='blackAlpha.300'
        backdropFilter='blur(10px) hue-rotate(0deg)'
        />
        <ModalContent bg={'transparent'} boxShadow={'none'}>
            <ModalBody bg={'transparent'} style={{padding:'0px'}}>
            <Flex direction={'row'} alignItems={'center'} gap={3}>
            <Input boxShadow={'md'} _active={{borderWidth:0}} _focus={{borderWidth:0}} _focusVisible={{borderWidth:0}} borderWidth={0} bg={'#ffffff96'} height={'60px'} padding={'10px'} placeholder={messages.enterforthesearch} onChange={(event) => setAramaInput(event.target.value)} />
            <IconButton boxShadow={'md'} padding={'10px'} px={'15px'} height={'60px'} bg={'#ffffff96'} aria-label='Search database' onClick={() => gonder()} icon={<CiSearch size={26}/>} />
            </Flex>
            </ModalBody>
        </ModalContent>
    </Modal>
    )
}
