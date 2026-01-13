"use client";
import React,{useState,useEffect} from 'react'
import { Box,useToast,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Checkbox,Center,Radio, RadioGroup,Stack} from '@chakra-ui/react'
import { BsFillTelephoneFill,BsFillLockFill,BsEnvelopeFill,BsFillPersonFill   } from "react-icons/bs";

export default function SifremiUnuttum() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const [degisecekAdres, setDegisecekAdres] = useState();
    const [secilenSifreUnutmaTuru, setSecilenSifreUnutmaTuru] = useState("eposta");
    const toast = useToast()


    const SifreBolumuDegistir = (value) => {
        setSecilenSifreUnutmaTuru(value);
        setDegisecekAdres();
    }

    const parolasifirla =  async () => {
        if(degisecekAdres){

            try {
                const response_ham = await fetch("/api/passReminder", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: degisecekAdres,
                        type: "passReminder",
                    }),
                });
            
                if (response_ham.ok) {
                    const response = await response_ham.json(); // response_ham'dan JSON verisini al

                    if (response.status) {
                        toast({
                            title: 'Parola Sıfırlama İsteğiniz Başarıyla Alındı!',
                            description: "E-Mail adresinize gelen maildeki linke tıklayarak yeni parolanızı kullanmaya başlayabilirsiniz.",
                            status: 'success',
                            duration: 5000,
                            isClosable: true,
                        });
                    } else {
                        toast({
                            title: 'Parola Sıfırlama İsteğiniz Alınamadı!',
                            description: "Lütfen doğru e-mail hesabınızı girerek tekrar deneyiniz.",
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                        });
                    }
                } else {
                    // response_ham.ok false ise buraya gelir
                    toast({
                        title: 'Sunucu Hatası',
                        description: 'Bir hata oluştu, lütfen tekrar deneyiniz.',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
            
            } catch (error) {
                console.error('Error:', error);
                toast({
                    title: 'Sunucu Hatası',
                    description: 'Bir hata oluştu, lütfen tekrar deneyiniz.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }else{
            toast({
            title: 'Lütfen bir e-posta adresi giriniz',
            description: "Lütfen doğru e-mail hesabınızı girerek tekrar deneyiniz.",
            status: 'error',
            duration: 5000,
            isClosable: true,
            })
        }
    }
    
  return (
    <Container maxW={1000} py={8}>
    <Flex direction={"column"} alignItems={"center"} >
        <Box style={{width:450,borderWidth:1,borderRadius:10,borderColor:"#eee",backgroundColor:'#fff'}} p={8}>
            <Box>
                <Text fontSize={18} fontWeight={600}>Şifremi Unuttum</Text>
                <Text>Şifrenizi yenilemek için kayıtlı olan telefon veya e-posta adresinizi giriniz.</Text>
            </Box>

            <Box mt={6}>
            <RadioGroup onChange={SifreBolumuDegistir} value={secilenSifreUnutmaTuru}>
                <Stack direction='row'>
                    {/*<Radio colorScheme={"green"} size='lg' value='telefon' mr={5}>Telefon</Radio>*/}
                    <Radio colorScheme={"green"} size='lg' value='eposta'>E-Posta</Radio>
                </Stack>
            </RadioGroup>
            </Box>
            {secilenSifreUnutmaTuru === "telefon" ? (
            <Box  mt={6}>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>Telefon Numaranız:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsFillTelephoneFill color='#ccc' />
                    </InputLeftElement>
                    <Input height={50} placeholder='Telefon Numarası' value={degisecekAdres} style={{paddingLeft:40}} onChange={(e) => setDegisecekAdres(e.target.value)} />
                </InputGroup>
            </Box>  
            ):null}

            {secilenSifreUnutmaTuru === "eposta" ? (
            <Box mt={6}>
                <Text mb='8px' fontSize={13} color={"#646464"} fontWeight={500}>E-Posta Adresi:</Text>
                <InputGroup>
                    <InputLeftElement height={"100%"} pointerEvents='none'>
                    <BsEnvelopeFill color='#ccc' />
                    </InputLeftElement>
                    <Input height={50} placeholder='E-Mail Adresiniz' value={degisecekAdres} style={{paddingLeft:40}}  onChange={(e) => setDegisecekAdres(e.target.value)}  />
                </InputGroup>
            </Box>  
            ): null}

            <Box mt={6}>
                <Button colorScheme='green' w={"100%"} onClick={parolasifirla}>Yeni Parola Gönder</Button>
            </Box>

            
        </Box>
    </Flex>
    </Container>
  )
}
