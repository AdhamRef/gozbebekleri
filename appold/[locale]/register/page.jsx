"use client";
import React, { useState } from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Checkbox,Center,Tabs, TabList, TabPanels, Tab, TabPanel, useToast} from '@chakra-ui/react'
import { BsFillTelephoneFill,BsFillLockFill,BsEnvelopeFill,BsFillPersonFill   } from "react-icons/bs";
import Link from 'next/link'
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import {oturumGuncelle} from '@/redux/slices/oturumSlice';
import { HiArrowSmallRight } from "react-icons/hi2";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
export default function LogIn() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const Router = useRouter();
    const [telefon,setTelefon] = useState("");
    const [parola,setParola] = useState("123");

    const [isimsoyisim,setIsimSoyisim] = useState();
    const [email,setEmail] = useState();
    const [kayittelefon,setKayitTelefon] = useState();
    const [kayitparola,setKayitParola] = useState();
    const [formHatalari,setFormHatalari] = useState({});
   
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

    const NumaraGuncelle = (number,stateadi) => {
        stateadi(number);
        const name = "kayittelefon";
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

    const kayitol = async() => {
        if(isimsoyisim && email && kayittelefon && kayitparola){
                const response_ham = await fetch("/api/register", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept-Language': dilfetch,
                    },
                    body: JSON.stringify({
                        name: isimsoyisim,
                        tckimlik: "12345678911",
                        gsm: kayittelefon,
                        phone: kayittelefon,
                        gender: "",
                        job: "",
                        birthdate: "",
                        country: "",
                        province: "",
                        district: "",
                        neighbourhood: "",
                        street: "",
                        addressdetail: "",
                        email: email,
                        pass: kayitparola,
                    }),
                });
                const response = await response_ham.json(); // response_ham'dan JSON verisini al

                if(response.status){
                    toast({
                    title: 'Üyeliğiniz Başarıyla Oluşturuldu',
                    description: "Başarıyla üyeliğiniz oluşturuldu, yönlendiriliyorsunuz...",
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    });
                    Router.push('/login');
                }else{
                    toast({
                    title: 'Üyelik kaydınız oluştulurken sorunla karşılaşıldı',
                    description: "Lütfen bilgileri doğrulayarak tekrar deneyiniz.",
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    });
                }
        }else{
            toast({
            title: 'Kayıt Başarısız Oldu',
            description: "Lütfen tüm bilgileri doğru girerek tekrar deneyiniz.",
            status: 'error',
            duration: 5000,
            isClosable: true,
            })
        }
    }
  return (
    <Container maxW={1020} py={8} px={0}>
    <Flex direction={{base:"column-reverse",lg:"row"}}>
    <Flex position={"relative"} flex={1} borderLeftRadius={25} overflow={'hidden'} m={{base:'20px',lg:0}} borderRadius={{base:25}}>
        <Box bgImg={'/girisbanner.jpg'} bgSize={'cover'} width={'100%'} height={'100%'} display={"flex"} direction={'column'} alignItems={'flex-end'}> 
            <Box position={'absolute'} w={"100%"} h={"100%"} bg={'#0e85996b'} />
            <Flex direction={'column'} gap={3} zIndex={10} color={'#FFF'} p={10} px={'4em'}>
                <Text fontSize={24} fontWeight={600}>ZATEN ÜYEMİSİNİZ?</Text>
                <Text fontSize={14} fontWeight={500}>Expert in financial modeling and data analysis, I have a proven track record in delivering</Text>
                <Link href={dil+"/login"}><Button colorScheme='burakmavisi' color={'#fff'} maxW={'50%'} rightIcon={<HiArrowSmallRight size={20} />} justifyContent={'space-between'} py={6} px={6}>GİRİŞ YAP</Button></Link>
            </Flex>
        </Box>
    </Flex>
    <Flex direction={"column"} alignItems={"center"} flex={1}>
        <Tabs w={'100%'} h={'100%'} borderRightRadius={25} style={{borderWidth:1,borderColor:"#eee",overflow:'hidden'}} variant='none'>
        <TabPanels bg={'#fff'} p={5} >
            <TabPanel>
            <Box>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>İsim & Soyisim:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsFillPersonFill color='#ccc' />
                    </InputLeftElement>
                    <Input name="isimsoyisim" height={50} placeholder='İsim & Soyisim' onBlur={handleBlur} isInvalid={!!formHatalari.isimsoyisim} value={isimsoyisim} onChange={e => InputGuncelle(e,setIsimSoyisim)} style={{paddingLeft:40}} />
                </InputGroup>
                {!!formHatalari.isimsoyisim ? <Text color={"red"} fontSize={14} mt={2}>Lütfen isim soyisim giriniz</Text> : <></> }
            </Box>  

            <Box mt={6}>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>E-Posta Adresi:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsEnvelopeFill color='#ccc' />
                    </InputLeftElement>
                    <Input name="email" height={50} placeholder='E-Mail Adresiniz' onBlur={handleBlur} isInvalid={!!formHatalari.email} value={email} onChange={e => InputGuncelle(e,setEmail)} style={{paddingLeft:40}} />
                </InputGroup>
                {!!formHatalari.email ? <Text color={"red"} fontSize={14} mt={2}>Lütfen e-posta adresi giriniz</Text> : <></> }

            </Box>  

            <Box mt={6} position={'relative'} zIndex={999}>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>Telefon Numaranız:</Text>
                <InputGroup>
                    <PhoneInput
                        country={'tr'}
                        value={kayittelefon}
                        onChange={(number) => NumaraGuncelle(number,setKayitTelefon)}
                        onBlur={handleBlur}
                        inputStyle={{width:'100%',height:50,borderColor:'#eee'}}
                        buttonStyle={{borderColor:'#eee'}}
                        countryCodeEditable={false}

                    />
                </InputGroup>
                {!!formHatalari.kayittelefon ? <Text color={"red"} fontSize={14} mt={2}>Lütfen telefon numarası giriniz</Text> : <></> }

            </Box>  

            <Box mt={6}>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>Parolanız:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsFillLockFill  color='#ccc' />
                    </InputLeftElement>
                    <Input name="kayitparola" height={50} placeholder='Parolanız' onBlur={handleBlur} isInvalid={!!formHatalari.kayitparola} value={kayitparola} onChange={e => InputGuncelle(e,setKayitParola)} style={{paddingLeft:40}} />
                </InputGroup>
                {!!formHatalari.kayitparola ? <Text color={"red"} fontSize={14} mt={2}>Lütfen parola giriniz</Text> : <></> }
            </Box>
            
            
            <Box mt={6}>
                <Checkbox size='lg' colorScheme='green'><Text fontSize={15} color={"#646464"}>Bilgilendirme smslerini almak istiyorum</Text></Checkbox>
            </Box>

            <Box mt={6}>
                <Button colorScheme='green' w={"100%"} onClick={ () => kayitol() }>Kaydol</Button>
            </Box>

            
            </TabPanel>
        </TabPanels>
        </Tabs>
    </Flex>
    </Flex>
    </Container>
  )
}
