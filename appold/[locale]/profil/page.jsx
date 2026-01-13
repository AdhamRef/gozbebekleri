import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,InputGroup,InputLeftElement,Button,Heading,Avatar,Divider,Table,Thead,Tbody,Tfoot,Tr,Th,Td,TableCaption,TableContainer,} from '@chakra-ui/react'
import Link from "next/link"
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill  } from "react-icons/bs";
import SolMenu from "@/components/profil/menu";
import { useSelector, useDispatch } from 'react-redux';
import { CiShoppingBasket } from "react-icons/ci";
import {customFetch} from "@/main/utilities/customFetch";
import {cache} from 'react';
import { cookies } from 'next/headers'
import SepetDetayModal from "@/components/profil/SepetDetayModal";
import { headers } from "next/headers";
import { redirect } from 'next/navigation';
import {language} from "@/main/utilities/languageS";

const getPost = async ({tokencookieval}) => {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    let response_ham = await fetch('https://minberiaksa.org/api/checklogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Verinin JSON formatında olduğunu belirt
        },
        body: JSON.stringify({
          token: tokencookieval, // Göndermek istediğiniz veriyi JSON formatına çevirip body'ye ekleyin
          nerden: "profil", // Göndermek istediğiniz veriyi JSON formatına çevirip body'ye ekleyin
        }),
      });
    let posts = await response_ham.json();
    return posts;
}

export default async function Profil() {
    const heads = headers();
    const pathname = heads.get("x-pathname"); 
    let lang= language(pathname);

    let dil;
    if(pathname != "ar" && pathname != "en"){
        dil = "";
    }else{
        dil = pathname;
    }

    const cookieStore = cookies();
    //const tokencookie = req.cookies.get('auth-token')?.value;
    const tokencookie = cookieStore.get('auth-token');
    if(tokencookie==undefined){
        redirect(dil+'/login');    
    }
    let tokencookieval = tokencookie.value;
    let datap = await getPost({tokencookieval});
    let statics = datap.data[0].statics;
    let donates = datap.data[0].donatesList;
    let parabirimi = "₺";

    
  
  return (
    <main style={{paddingTop:"3em",paddingBottom:"4em"}}>
    <Container maxW={1020} p={0}>
    <Flex direction={"row-reverse"} gap={5} wrap={"wrap"}>
        <Box width={["100%","68%"]} bg={"#FFF"} p={8} boxShadow={'lg'} borderRadius={"burakradi"}>
            <Box>
                <Flex direction={"row"} gap={2} alignItems={'center'}>
                    <CiShoppingBasket size={24} color={'#4B4B4B'} />
                    <Text fontSize={16} fontWeight={600}>{lang.accountsummary}</Text>
                </Flex>
                <Grid direction={"row"} gap={3} my={5} wrap={'wrap'} templateColumns={'repeat(3,1fr)'}>
                    <Flex direction={"column"} gap={2} alignItems={'center'} py={5} px={2} borderWidth={1} borderStyle={'solid'} borderColor={'#E8E8E8'} borderRadius={8}>
                        <Text fontSize={13} fontWeight={600}>{lang.mydonates}</Text>
                        <Text fontSize={16} fontWeight={700} color={'#08849a'}>{parabirimi}{statics.donates}</Text>
                    </Flex>
                    <Flex direction={"column"} gap={2} alignItems={'center'} py={5} px={2} borderWidth={1} borderStyle={'solid'} borderColor={'#E8E8E8'} borderRadius={8}>
                        <Text fontSize={13} fontWeight={600}>{lang.myregulardonates}</Text>
                        <Text fontSize={16} fontWeight={700} color={'#08849a'}>{parabirimi}{statics.regulardonates}</Text>
                    </Flex>
                    <Flex direction={"column"} gap={2} alignItems={'center'} py={5} px={2} borderWidth={1} borderStyle={'solid'} borderColor={'#E8E8E8'} borderRadius={8}>
                        <Text fontSize={13} fontWeight={600}>{lang.myadhadonates}</Text>
                        <Text fontSize={16} fontWeight={700} color={'#08849a'}>{statics.qurbani}</Text>
                    </Flex>
                    <Flex direction={"column"} gap={2} alignItems={'center'} py={5} px={2} borderWidth={1} borderStyle={'solid'} borderColor={'#E8E8E8'} borderRadius={8}>
                        <Text fontSize={13} fontWeight={600}>{lang.mysponsorship}</Text>
                        <Text fontSize={16} fontWeight={700} color={'#08849a'}>{statics.sponsorship} Adet Sponsorluk</Text>
                    </Flex>
                    <Flex direction={"column"} gap={2} alignItems={'center'} py={5} px={2} borderWidth={1} borderStyle={'solid'} borderColor={'#E8E8E8'} borderRadius={8}>
                        <Text fontSize={13} fontWeight={600}>{lang.mytotaldonates}</Text>
                        <Text fontSize={16} fontWeight={700} color={'#08849a'}>{parabirimi}{statics.totaldonates} </Text>
                    </Flex>
                </Grid>
            </Box>

            <Flex direction={"column"} gap={5} mt={10}>
                <Flex direction={"row"} gap={2} alignItems={'center'}>
                    <CiShoppingBasket size={24} color={'#4B4B4B'} />
                    <Text fontSize={16} fontWeight={600}>{lang.mylastdonates}</Text>
                </Flex>
                <TableContainer>
                <Table variant='simple' bgColor={'#fcfcfc'} borderColor={'#DFDFDF'} borderRadius={15}>
                    
                    <Thead>
                    <Tr>
                        <Th>{lang.donatestable_name}</Th>
                        <Th>{lang.donatestable_date}</Th>
                        <Th>{lang.donatestable_total}</Th>
                        <Th>{lang.donatestable_status}</Th>
                        <Th>{lang.donatestable_action}</Th>
                    </Tr>
                    </Thead>
                    <Tbody>
                    {donates.map((post,index) => (
                    <Tr key={index}>
                        <Td>{post.firsttitle}</Td>
                        <Td>{post.date}</Td>
                        <Td>{post.price} {parabirimi}</Td>
                        <Td>{post.status == "Başarılı" ? <Text color='green'>Başarılı</Text> : <Text color='red'>Başarısız</Text>}</Td>
                        <Td><SepetDetayModal token={post.token} /></Td>
                    </Tr>
                    ))}
                    
                    </Tbody>
                    <Tfoot>
                    <Tr>
                        <Th>{lang.donatestable_name}</Th>
                        <Th>{lang.donatestable_date}</Th>
                        <Th>{lang.donatestable_total}</Th>
                        <Th>{lang.donatestable_status}</Th>
                        <Th>{lang.donatestable_action}</Th>
                    </Tr>
                    </Tfoot>
                </Table>
                </TableContainer>
            </Flex>
        </Box>
        <SolMenu/>
    </Flex>
    
      
    </Container>
    </main>
  )
}
