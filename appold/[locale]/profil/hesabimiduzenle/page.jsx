"use client";
import React, {useState,useEffect} from 'react'
import { Box,Image,Container,Flex,Text,Input,FormControl,FormLabel,Button,Heading,Select,useToast} from '@chakra-ui/react'
import Link from "next/link"
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill  } from "react-icons/bs";
import { useRouter } from 'next/navigation';
import SolMenu from "@/components/profil/menu";

export default function HesabimiDuzenle() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const [uyeBilgileri,setUyeBilgileri] = useState({});
    const toast = useToast()

    const InputGuncelle = (e) => {
        const { name, value } = e.targete;
        setUyeBilgileri((prev) => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        const fetchData = async () => {
          try {
            const response_ham = await fetch("/api/checklogin", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token: "1",
              }),
            });
            if (!response_ham.ok) {
              throw new Error('API çağrısı başarısız');
            }
            const response = await response_ham.json();
            let name = response.data[0].name;
            let email = response.data[0].email;
            let gsm = response.data[0].gsm;
            let country = response.data[0].country;
            let gender = "erkek";
            let identifynumber = "123456789";
            let birthdate = "22/12/1991";

            setUyeBilgileri({
                "name":name,
                "email":email,
                "gsm":gsm,
                "country":country,
                "gender":gender,
                "identifynumber":identifynumber,
                "birthdate":birthdate,
            });
          } catch (error) {
            console.error('Error:', error);
          }
        };
      
        fetchData();
      }, []); 

     const UyeGuncelle = () => {
        const fetchData2 = async () => {
            let name = uyeBilgileri.name;
            let email = uyeBilgileri.email;
            let gsm = uyeBilgileri.gsm;
            let country = uyeBilgileri.country;
            let gender = "erkek";
            let identifynumber = "123456789";
            let birthdate = "22/12/1991";

            try {
              const response_ham = await fetch("/api/accountChange", {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: "1",
                  name: name,
                  email: email,
                  gsm: gsm,
                }),
              });
              if (!response_ham.ok) {
                throw new Error('API çağrısı başarısız');
              }
              const response = await response_ham.json();
              if(response.status){
                    toast({
                    title: 'Üyeliğiniz Başarıyla Güncellendi',
                    description: "Başarıyla üyeliğiniz güncellenmiştir",
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                    });
                }else{
                    toast({
                    title: 'Üyeliğiniz güncellenirken sorunla karşılaşıldı',
                    description: "Lütfen daha sonra tekrar deneyiniz.",
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    });
                }
            } catch (error) {
              console.error('Error:', error);
            }
          };


          
          
      }

      return (
    <main style={{paddingTop:"3em",paddingBottom:"4em"}}>
    <Container maxW={{base:'100%',lg:1020}} p={0}>
    <Flex direction={"row-reverse"} wrap={"wrap"} gap={5}>
        <Box width={{base:'100%',lg:"68%"}} bg={"#FFF"} p={8} style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px",borderRadius:3}}>
            
            <Flex direction={"column"} gap={5}>
                <Flex direction="row" gap={5} wrap={"wrap"} alignItems={"center"}>
                    <BsFillPersonFill style={{marginTop:5}} fontSize={28}/>
                    <Heading fontSize={[20,32]} fontWeight={600}>Hesabımı Düzenle</Heading>
                </Flex>
                <FormControl w={['100%','100%']}>
                    <FormLabel>İsim & Soyisim</FormLabel>
                    <Input name="name" type='text' value={uyeBilgileri.name} onChange={e => InputGuncelle(e)}/>
                </FormControl>
                <Flex direction="row" gap={5} wrap={"wrap"}>
                    <FormControl w={['100%','100%']}>
                        <FormLabel>Doğum Yılı</FormLabel>
                        <Input type='text' value={uyeBilgileri.birthdate} />
                    </FormControl>
                    
                </Flex>
                <Flex direction="row" gap={5} wrap={"wrap"}>
                <FormControl w={['100%','100%']}>
                        <FormLabel>E-Mail Adresiniz</FormLabel>
                        <Input name="email" type='email' value={uyeBilgileri.email} onChange={e => InputGuncelle(e)}/>
                </FormControl>
                <FormControl w={['100%','100%']}>
                    <FormLabel>Telefon Numaranız</FormLabel>
                    <Input name="gsm" type='tel' value={uyeBilgileri.gsm} onChange={e => InputGuncelle(e)}/>
                </FormControl>
                </Flex>
                <Button colorScheme={"green"} alignSelf={"flex-end"} px={10} mt={5} onClick={() => UyeGuncelle()}>Kaydet</Button>
                
            </Flex>
        </Box>
        <SolMenu/>
    </Flex>
    
      
    </Container>
    </main>
  )
}
