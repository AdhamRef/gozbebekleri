"use client";
import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading,Avatar,Divider,Table,Thead,Tbody,Tfoot,Tr,Th,Td,TableCaption,TableContainer,} from '@chakra-ui/react'
import Link from "next/link"
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill, BsFillCalendarMinusFill,BsClockFill,BsArrowLeftCircle  } from "react-icons/bs";
import { useRouter } from 'next/navigation';
import SolMenu from "@/components/profil/menu";

export default function SiparisDetay() {
    const Router = useRouter();
    const Geri = () => {
        Router.back();
    }
  return (
    <main style={{paddingTop:"3em",paddingBottom:"4em"}}>
    <Container maxW={["100%",1020]} p={0}>
    <Flex direction={"row-reverse"} gap={5} wrap={"wrap"}>
        <Box width={["100%","80%"]} bg={"#FFF"} p={8} style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px",borderRadius:3}}>
            
            <Flex direction={"column"} gap={5} >
                <Flex direction={"row"} gap={2} justify={"flex-start"} alignItems={"center"} alignContent={"center"} >
                    <Button variant={"none"} fontSize={30} p={0} m={0} mt={1} onClick={Geri}><BsArrowLeftCircle /></Button>
                    <Heading  eading>Sepet Detayı</Heading>
                </Flex>
                <Flex direction={"column"} gap={2} mb={5}>
                    <Flex direction={"row"} gap={2} alignItems={"center"} color={"#3f3f3f"}><BsFillCalendarMinusFill color={"#3f3f3f"}/> <Text>13 Şubat 2023</Text></Flex>
                    <Flex direction={"row"} gap={2} alignItems={"center"} color={"#3f3f3f"}><BsClockFill color={"#3f3f3f"}/> <Text>19:38:52</Text></Flex>
                    <Flex direction={"row"} gap={2} alignItems={"center"} color={"#3f3f3f"} fontSize={14}>Notunuz: <Text>Yinelenen bir sayfa içeriğinin okuyucunun dikkatini dağıttığı bilinen bir gerçektir.</Text></Flex>
                </Flex>
                <TableContainer>
                <Table variant='simple'>
                    
                    <Thead>
                    <Tr>
                        <Th>PROJE</Th>
                        <Th>ADET</Th>
                        <Th>TOPLAM</Th>
                    </Tr>
                    </Thead>
                    <Tbody>
                    <Tr>
                        <Td>Deprem Bölgesi Yardımı</Td>
                        <Td>1 Adet</Td>
                        <Td>150.00 TL</Td>
                    </Tr>
                    <Tr>
                        <Td>Katarakt Yardımı</Td>
                        <Td>2 Adet</Td>
                        <Td>750.00 TL</Td>
                    </Tr>
                    <Tr>
                        <Td>Su Kuyusu Yardımı</Td>
                        <Td>3 Adet</Td>
                        <Td>450.00 TL</Td>
                    </Tr>
                    
                    </Tbody>
                    <Tfoot>
                    <Tr>
                        <Th>PROJE</Th>
                        <Th>ADET</Th>
                        <Th>TOPLAM</Th>
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
