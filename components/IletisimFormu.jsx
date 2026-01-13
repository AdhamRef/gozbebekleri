"use client";
import React, {useState,useEffect}from 'react'
import { Box,Image,Container,Flex,Text,Divider,Center,Input,Button,Heading,Accordion,AccordionItem,AccordionButton,AccordionPanel,AccordionIcon,} from '@chakra-ui/react'
import {useLanguageBelirtec,useLanguage} from "@/main/utilities/language";
import { IoIosArrowDropright } from "react-icons/io";
import Swal from 'sweetalert2'

export default function IletisimFormu() {
    const [adSoyad,setAdSoyad] = useState();
    const [email,setEmail] = useState();
    const [telefon,setTelefon] = useState();
    const [mesaj,setMesaj] = useState();
    let messages = useLanguage();

   const Gonder = () => {
    const gfetch = async () => {
      
        const inputValues = {};
        inputValues['adinizsoyadiniz'] = adSoyad;
        inputValues['email'] = email;
        inputValues['telefonnumaraniz'] = telefon;
        inputValues['mesajiniz'] = mesaj;
        inputValues['formID'] = "676ef061c016fec7cf136eeb";
        
        try {
            const response = await fetch("/api/formsadd", {
            method: "POST",
            body: JSON.stringify(inputValues),
            });
            if (response.ok) {
                let responsejson = await response.json();
                if (responsejson.status) {
                    Swal.fire({
                    icon: "success",
                    html: "<strong>"+messages.formsubmitsuccessfull+"</strong>",
                    padding: "0px 0px 20px 0px",
                    showConfirmButton: false,
                    width: "350px",
                    allowOutsideClick: () => {
                        Swal.close();
                        return false; // Explicitly return false to handle `allowOutsideClick`.
                    }
                    });
                    setEbultenMail("");
                } else {
                    Swal.fire({
                    icon: "error",
                    html: "<strong>"+messages.formsubmitfailed+"</strong>",
                    padding: "0px 0px 20px 0px",
                    showConfirmButton: false,
                    width: "350px",
                    allowOutsideClick: () => {
                        Swal.close();
                        return false;
                    }
                    });
                }
            } else {
            console.log("Form gönderiminde bir hata oluştu.");
            }
        } catch (error) {
            console.error("Hata:", error);
        }
    }

    gfetch();
}

  return (
    <Flex w={'50%'} direction={'column'} gap={5} bg={'#FFE6C1'} py={10} px={10}>
        <Box mb={5}><Text fontSize={18} fontWeight={600} color={'#C98624'} textTransform={'uppercase'}>{messages['form'].contactform}</Text></Box>
        <Flex direction={"column"} gap={2}>
        <Text fontSize={13} color={'#838383'} fontWeight={500}>{messages['form'].namesurname}:</Text>
        <Input bgColor={'#F4F4F4'} size='md' value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} required/>
        </Flex>

        <Flex direction={"column"} gap={2}>
        <Text fontSize={13} color={'#838383'} fontWeight={500}>{messages['form'].phonenumber}:</Text>
        <Input type="number" bgColor={'#F4F4F4'} size='md' value={telefon} onChange={(e) => setTelefon(e.target.value)} required/>
        </Flex>

        <Flex direction={"column"} gap={2}>
        <Text fontSize={13} color={'#838383'} fontWeight={500}>{messages['form'].emailaddress}:</Text>
        <Input type="email" bgColor={'#F4F4F4'} size='md' value={email} onChange={(e) => setEmail(e.target.value)} required/>
        </Flex>

        <Flex direction={"column"} gap={2}>
        <Text fontSize={13} color={'#838383'} fontWeight={500}>{messages['form'].yourmessage}:</Text>
        <Input bgColor={'#F4F4F4'} size='md' value={mesaj} onChange={(e) => setMesaj(e.target.value)} required/>
        </Flex>
        <Button rightIcon={<IoIosArrowDropright size={28}/>} ml={'auto'} px={8} py={7} color={'#fff'} variant='solid' fontWeight={500} fontSize={13} bg={"#AA422F"} onClick={() => Gonder()}>
        {messages['form'].submit}
        </Button>
    </Flex>
  )
}
