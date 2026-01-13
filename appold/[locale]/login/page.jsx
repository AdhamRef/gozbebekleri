"use client";
import React, { useEffect, useState } from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Checkbox,Center,Tabs, TabList, TabPanels, Tab, TabPanel, useToast} from '@chakra-ui/react'
import { BsFillTelephoneFill,BsFillLockFill,BsEnvelopeFill,BsFillPersonFill   } from "react-icons/bs";
import Link from 'next/link'
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import {oturumGuncelle} from '@/redux/slices/oturumSlice';
import { HiArrowSmallRight } from "react-icons/hi2";
import { sepetArtir } from '@/redux/slices/sepetSlice';
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";

export default function LogIn() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const Router = useRouter();
    const [telefon,setTelefon] = useState();
    const [parola,setParola] = useState();

    const [isimsoyisim,setIsimSoyisim] = useState();
    const [email,setEmail] = useState();
    const [kayittelefon,setKayitTelefon] = useState();
    const [kayitparola,setKayitParola] = useState();
    const [formHatalari,setFormHatalari] = useState({});
    let messages = useLanguage();
    

    let dil = useLanguageBelirtec();
    let dilfetch = dil;
    if(dilfetch==""){
        dilfetch = "tr";
    }
    const dispatch = useDispatch(); // REDUX

    const toast = useToast()

    const InputGuncelle = (e,stateadi) => {
        const { name, value } = e.target;
        stateadi(value);
        if (formHatalari[name]) {
            setFormHatalari((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
        }
    };

    const girisyap =  async () => {
        
        if(email && parola){
            try {
                const response_ham = await fetch("/api/login", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept-Language': dilfetch,
                    },
                    body: JSON.stringify({
                        email: email,
                        pass: parola,
                    }),
                });
            
                if (response_ham.ok) {
                    const response = await response_ham.json(); // response_ham'dan JSON verisini al
                    if (response.status) {
                        toast({
                            title: messages.loginsuccess,
                            description: messages.loginsuccess_desc,
                            status: 'success',
                            duration: 5000,
                            isClosable: true,
                        });
                        let name2 = response.data[0].name;
                        let mtoken2 = response.data[0].token;
                        let mail2 = response.data[0].email;
                        let gsm2 = response.data[0].gsm;

                        dispatch(oturumGuncelle({name:name2,mail:mail2,gsm:gsm2,mtoken:mtoken2,oturumdurumu:true}));
                        localStorage.setItem('isimsoyisim', name2);
                        localStorage.setItem('email', mail2);
                        localStorage.setItem('gsm', gsm2);
                        Router.push(dil+'/profil');

                    } else {
                        toast({
                            title: messages.loginfailed,
                            description: messages.loginfailed_desc1,
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                        });
                    }
                } else {
                    // response_ham.ok false ise buraya gelir
                    toast({
                        title: messages.loginfailed_servererr,
                        description: messages.loginfailed_desc2,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            
            } catch (error) {
                console.error('Error:', error);
                toast({
                    title: messages.loginfailed,
                    description: messages.loginfailed_desc2,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }

        }else{
            toast({
            title: 'Giriş Başarısız Oldu',
            description: "Lütfen bilgileri doğrulayarak tekrar deneyiniz.",
            status: 'error',
            duration: 5000,
            isClosable: true,
            })
        }
    }

    useEffect(() => {
        const logincheck = async () => {
            try {
                const response_ham = await fetch("https://minberiaksa.org/api/checklogin", {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                    token: "1",
                    }),
                });
                const response = await response_ham.json(); // response_ham'dan JSON verisini al 
                console.log(response);
                if (response.status) {
                    Router.push(dil+'/profil');
                }
            } catch (error) {
            console.error('Error:', error);
            }
        }
        logincheck();
    }, [])
    

   
  return (
    <Container maxW={1020} py={8} px={0}>
    <Flex direction={{base:"column-reverse",lg:"row"}}>
    <Flex position={"relative"} flex={1}  overflow={'hidden'} m={{base:'20px',lg:0}} borderRadius={{base:25,lg:'25px 0px 0px 25px'}} borderLeftRadius={25}>
        <Box bgImg={'/girisbanner.jpg'} bgSize={'cover'} width={'100%'} height={{base:350,lg:550}} display={"flex"} direction={'column'} alignItems={'flex-end'}> 
            <Box position={'absolute'} w={"100%"} h={"100%"} bg={'#0e85996b'} />
            <Flex direction={'column'} gap={3} zIndex={10} color={'#FFF'} p={10} px={'4em'}>
                <Text fontSize={24} fontWeight={600}>{messages.notalreadymember}</Text>
                <Text fontSize={14} fontWeight={500}>{messages.notalreadymember_desc}</Text>
                <Link href={dil+"/register"}><Button colorScheme='burakmavisi' color={'#fff'} maxW={'50%'} rightIcon={<HiArrowSmallRight size={20} />} justifyContent={'space-between'} py={6} px={6}>{messages.getregister}</Button></Link>
            </Flex>
        </Box>
    </Flex>
    <Flex direction={"column"} alignItems={"center"} flex={1}>
        <Tabs w={'100%'} h={'100%'} borderRightRadius={25} style={{borderWidth:1,borderColor:"#eee",overflow:'hidden'}} variant='none'>
        <TabPanels bg={'#fff'} p={5} height={'100%'}>
            <TabPanel>
            <Text fontSize={20} color={'#04819C'} fontWeight={600} mb={5}>{messages.login}</Text>
            <Box>
                <Text mb='8px' fontSize={15} color={"#646464"} fontWeight={500}>{messages.emailaddress}</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsFillTelephoneFill color='#ccc' />
                    </InputLeftElement>
                    <Input name="email" height={50} placeholder={messages.emailaddress} onBlur={handleBlur} isInvalid={!!formHatalari.email} value={email} onChange={e => InputGuncelle(e,setEmail)} style={{paddingLeft:40}} />
                </InputGroup>
                {!!formHatalari.email ? <Text color={"red"} fontSize={14} mt={2}>Lütfen e-mail adresi giriniz</Text> : <></> }

            </Box>  

            <Box mt={6}>
                <Text mb='8px' fontSize={15} color={"#646464"} fontWeight={500}>{messages.password}:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsFillLockFill  color='#ccc' />
                    </InputLeftElement>
                    <Input name="parola" height={50} placeholder={messages.password} onBlur={handleBlur} isInvalid={!!formHatalari.parola} value={parola} onChange={e => InputGuncelle(e,setParola)}  style={{paddingLeft:40}} />
                </InputGroup>
                {!!formHatalari.parola ? <Text color={"red"} fontSize={14} mt={2}>Lütfen parolanızı giriniz</Text> : <></> }

            </Box>
            
            <Box mt={6}>
                <Checkbox size='lg' colorScheme='green'><Text fontSize={15} color={"#646464"}>{messages.rememberme}</Text></Checkbox>
            </Box>

            <Box mt={6}>
                <Button colorScheme='burakmavisi' w={"100%"} py={7} onClick={ () => girisyap() } rightIcon={<Image  src='/loginclick.svg' style={{width:17,height:20,position:'absolute',right:15,top:15}} />}>{messages.clickforlogin}</Button>
            </Box>

            <Box mt={6}>
                <Center><Link href={dil+"sifremi-unuttum"}><Text fontSize={14} fontWeight={600} color={"#646464"}>
                    {messages.forgotpassword}
                </Text></Link></Center>
            </Box>

            </TabPanel>
        </TabPanels>
        </Tabs>
    </Flex>
    </Flex>
    </Container>
  )
}
