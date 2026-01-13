
import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,InputGroup,InputLeftElement,Button,Heading,Avatar,Divider,Table,Thead,Tbody,Tfoot,Tr,Th,Td,TableCaption,TableContainer,} from '@chakra-ui/react'
import Link from "next/link"
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill  } from "react-icons/bs";
import SolMenu from "@/components/profil/menu";
import { cookies } from 'next/headers'
import { headers } from "next/headers";
import {language} from "@/main/utilities/languageS";
import { CiShoppingBasket } from "react-icons/ci";
import SepetDetayModal from "@/components/profil/SepetDetayModal";

const getPost = async ({tokencookieval}) => {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    let response_ham = await fetch('/api/checklogin', {
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

export default async function HesabimiDuzenle() {
    const cookieStore = cookies();
    const tokencookie = cookieStore.get('auth-token');
    
    let tokencookieval = tokencookie.value;
    let datap = await getPost({tokencookieval});
    let statics = datap.data[0].statics;
    let donates = datap.data[0].donatesList;

    const heads = headers();
    const pathname = heads.get("x-pathname"); 
    let lang= language(pathname);
    let parabirimi = "₺";

  return (
    <main style={{paddingTop:"3em",paddingBottom:"4em"}}>
    <Container maxW={['100%',1020]}>
    <Flex direction={"row-reverse"} wrap={"wrap"} gap={5}>
        <Box width={['100%',"68%"]} bg={"#FFF"} p={8} style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px",borderRadius:3}}>
            <Flex direction={"column"} gap={5} mt={10}>
                <Flex direction={"row"} gap={2} alignItems={'center'}>
                    <CiShoppingBasket size={24} color={'#4B4B4B'} />
                    <Text fontSize={16} fontWeight={600}>{lang.completedprojects}</Text>
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
