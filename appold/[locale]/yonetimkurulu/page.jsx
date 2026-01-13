import React from 'react'
import { Box,Image,Container,Text,Flex,Grid,GridItem,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Table,Thead,Tbody,Tfoot,Tr,Th,Td,TableCaption,TableContainer} from '@chakra-ui/react'
import Link from "next/link"
import Head from "next/head";
import { AiOutlineHome } from "react-icons/ai";
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import Breadcrumbs from "@/components/breadcrumbs";

const getPost = cache(async () => {
    return await customFetch({ type: 'subcatlist', id: '672230e0012d3f025450d1fc' });
});

export async function generateMetadata({ params }) {
    const posts = await getPost(); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    return {
        title: poststatus ? postdata.categoryparent.title : "Varsayılan Başlık",
        description: poststatus ? postdata.categoryparent.title : "Varsayılan Açıklama",
    };
}

export default async function page() {
    const posts = await getPost();
    let postdata = posts.data;
    const liste = async (katid) => {
        let posts2 = await customFetch({ type: 'list', id: katid });
        let post2data = posts2.data;

        return(
            <Flex direction={"column"} gap={5} >
                <Heading color={'#04819C'} fontSize={22}>{post2data[0].category.title}</Heading>
                <Grid className='kurulgridlist' templateRows={'auto'} templateColumns={{base:'repeat(2,1fr)',lg:'repeat(3,1fr)'}} gap={10}>
                {post2data.map((post,index) => (
                    <GridItem className={"item"} key={index} colSpan={post.summary === "Başkan" ? { base: 2, lg: 3 } : 1}>
                        <Flex direction={'column'} justifyContent={'center'} alignItems={"center"}>
                            <Image src={'https://minberiaksa.org/uploads/'+post.picture} borderRadius={15} w={257} />
                            <Text p={2} px={{base:4,lg:8}} borderRadius={8} bgColor={'#04819C'} fontSize={12} color={'white'} mt={'-15px'}>{post.summary}</Text>
                            <Text fontSize={18} fontWeight={600} mt={3} textAlign={'center'}>{post.title}</Text>
                        </Flex>
                    </GridItem>
                ))}
                </Grid>
            </Flex>
        )
    }

  return (
    <main>
    <Flex bgImage={'/detaybaslikbg.jpg'} direction={'column'} py={'8em'}>
    <Container maxW={1200} p={0}>
    <Flex direction={'row'} gap={5}>
        <AiOutlineHome size={28} color={'#FFC471'} style={{marginTop:4}}/>
        <Flex direction={'column'} gap={0}>
        <Heading as='h1' fontSize={28} noOfLines={1} color={'white'} fontWeight={600} textAlign={'left'}>{postdata[0].categoryparent.title}</Heading>
        <Box width={'100px'} height={1} borderRadius={10} bg={'#ffffffd4'} my={3} />
        <Flex direction={"row"}>
            <Breadcrumbs line={{kategori:postdata[0].categoryparent.title}} color={'#fff'} />
        </Flex>
        </Flex>
    </Flex>
    </Container>
    </Flex>
    <Container maxW={1200} p={0}>
    <Flex direction={["column","row"]} gap={5} py={10}>
        <Box width={"100%"} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
            
            

            <Flex direction={"column"} gap={5} mt={8}>
                <Heading color={'#C98624'} fontSize={28} textAlign={'center'}>Denetim Kurulu</Heading>
                <Grid templateRows={'auto'} templateColumns={{base:'repeat(2,1fr)',lg:'repeat(3,1fr)'}} gap={10}>
                    <GridItem>
                        <Flex direction={'column'} justifyContent={'center'} alignItems={"center"}>
                            <Image src={'/kurul1.jpg'} borderRadius={55} w={320} boxShadow={'md'} />
                            <Text p={2} px={{base:4,lg:8}} borderRadius={8} mt={2} fontWeight={600} fontSize={12} color={'#C98624'}>KURUL BAŞKANI</Text>
                            <Text fontSize={16} fontWeight={600} mt={3} textAlign={'center'}>FUAT KUTLU</Text>
                        </Flex>
                    </GridItem>
                    <GridItem>
                        <Flex direction={'column'} justifyContent={'center'} alignItems={"center"}>
                            <Image src={'/kurul2.jpg'} borderRadius={55} w={320} boxShadow={'md'} />
                            <Text p={2} px={{base:4,lg:8}} borderRadius={8} mt={2} fontWeight={600} fontSize={12} color={'#C98624'}>GENEL SEKRETER</Text>
                            <Text fontSize={16} fontWeight={600} mt={3} textAlign={'center'}>FATMA KAYA</Text>
                        </Flex>
                    </GridItem>
                    <GridItem>
                        <Flex direction={'column'} justifyContent={'center'} alignItems={"center"}>
                            <Image src={'/kurul3.jpg'} borderRadius={55} w={320} boxShadow={'md'} />
                            <Text p={2} px={{base:4,lg:8}} borderRadius={8} mt={2} fontWeight={600} fontSize={12} color={'#C98624'}>SEKRETER</Text>
                            <Text fontSize={16} fontWeight={600} mt={3} textAlign={'center'}>MELİKE BAŞER</Text>
                        </Flex>
                    </GridItem>
                    <GridItem>
                        <Flex direction={'column'} justifyContent={'center'} alignItems={"center"}>
                            <Image src={'/kurul3.jpg'} borderRadius={55} w={320} boxShadow={'md'} />
                            <Text p={2} px={{base:4,lg:8}} borderRadius={8} mt={2} fontWeight={600} fontSize={12} color={'#C98624'}>ÜYE</Text>
                            <Text fontSize={16} fontWeight={600} mt={3} textAlign={'center'}>HANİFE YILDIRIM</Text>
                        </Flex>
                    </GridItem>
                </Grid>
            </Flex>

            <Flex direction={"column"} gap={5} mt={8}>
                <Heading color={'#C98624'} fontSize={28} textAlign={'center'}>Proje Birimi</Heading>
                <TableContainer>
                    <Table variant='simple' bgColor={'#F5F5F5'}>
                        <Thead>
                        <Tr>
                            <Th>Adı Soyadı</Th>
                            <Th>Görevi</Th>
                        </Tr>
                        </Thead>
                        <Tbody>
                        <Tr>
                            <Td>Fehmi AYDIN</Td>
                            <Td>Proje Birim Başkanı</Td>
                        </Tr>
                        <Tr>
                            <Td>Emre BAŞER</Td>
                            <Td>Başkan Yardımcısı</Td>
                        </Tr>
                        <Tr>
                            <Td>Orhan BİLGİÇ</Td>
                            <Td>Üye</Td>
                        </Tr>
                        <Tr>
                            <Td>S.Mahir KILIÇ</Td>
                            <Td>Üye</Td>
                        </Tr>
                        </Tbody>
                    </Table>
                </TableContainer>
            </Flex>
        </Box>
    </Flex>
    
      
    </Container>
    </main>
  )
}
