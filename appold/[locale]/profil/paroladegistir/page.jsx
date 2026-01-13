"use client";
import React, {useState,useEffect} from 'react'
import { Box,Image,Container,Flex,Text,Input,FormControl,FormLabel,Button,Heading,Select,useToast} from '@chakra-ui/react'
import Link from "next/link"
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill  } from "react-icons/bs";
import { useRouter } from 'next/navigation';
import SolMenu from "@/components/profil/menu";
import {useLanguageBelirtec} from "@/main/utilities/language";

export default function ParolaDegistir() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const toast = useToast();
    const [parola,setParola] = useState();
    const [parola_tekrar,setParola_tekrar] = useState();

    let dil = useLanguageBelirtec();
    let dilfetch = dil;
    if(dilfetch==""){
        dilfetch = "tr";
    }

    const ParolaGuncelle = () => {
        const fetchData2 = async () => {
            let pass = parola;

            if(parola === parola_tekrar){
            try {
              const response_ham = await fetch("/api/passChange", {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept-Language': dilfetch,
                },
                body: JSON.stringify({
                  token: "1",
                  pass: pass,
                }),
              });
              if (!response_ham.ok) {
                throw new Error('API çağrısı başarısız');
              }
              const response = await response_ham.json();
              if(response.status){
                    toast({
                    title: 'Üyeliğinizin Parolası Güncellendi',
                    description: "Başarıyla üyeliğiniz güncellenmiştir",
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    });
                }else{
                    toast({
                    title: 'Üyeliğinizin parolası güncellenirken sorunla karşılaşıldı',
                    description: "Lütfen daha sonra tekrar deneyiniz.",
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    });
                }
            } catch (error) {
              console.error('Error:', error);
            }
          }else{
            toast({
              title: 'Parola tekrarınız aynı değildir',
              description: "Lütfen yeni parolanızı doğru girerek tekrar deneyiniz.",
              status: 'error',
              duration: 5000,
              isClosable: true,
              });
          }
          };
          fetchData2();
      }

  return (
    <main style={{paddingTop:"3em",paddingBottom:"4em"}}>
    <Container maxW={{base:"100%",lg:1020}} p={0}>
    <Flex direction={"row-reverse"} wrap={"wrap"} gap={5}>
        <Box width={{base:"100%",lg:"68%"}} bg={"#FFF"} p={8} style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px",borderRadius:3}}>
            
            <Flex direction={"column"} gap={5} >
                <Flex direction="row" gap={5} alignItems={"center"}>
                <BsFillPersonFill style={{marginTop:5}} fontSize={28}/>
                <Heading fontSize={28} fontWeight={600}>Parolamı Düzenle</Heading>
                </Flex>
                {/*<FormControl>
                    <FormLabel>Mevcut Parolanız</FormLabel>
                    <Input type='password' value="" />
                </FormControl>*/}
                <Flex direction={{base:"column",lg:"row"}} gap={5} mt={6}>
                    <FormControl width={{base:'100%',lg:'50%'}}>
                        <FormLabel>Yeni Parolanız</FormLabel>
                        <Input type='password' value={parola} onChange={(e) => setParola(e.target.value)} />
                    </FormControl>
                    <FormControl width={{base:'100%',lg:'50%'}}>
                        <FormLabel>Yeni Parolanız (Tekrar)</FormLabel>
                        <Input type='password' value={parola_tekrar}  onChange={(e) => setParola_tekrar(e.target.value)} />
                    </FormControl>
                </Flex>
                <Button colorScheme={"green"} alignSelf={"flex-end"} px={10} mt={5} onClick={() => ParolaGuncelle()}>Kaydet</Button>
                
            </Flex>
        </Box>
        <SolMenu/>
    </Flex>
    
      
    </Container>
    </main>
  )
}
