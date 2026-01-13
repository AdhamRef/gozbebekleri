
import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading,Skeleton,SkeletonText,Spinner,Breadcrumb,BreadcrumbItem,BreadcrumbLink } from '@chakra-ui/react'
//import BagisDetayBagisEklemeComponent from "../../components/BagisDetayBagisEklemeComp";
import BagisKutuButtonComponent from '@/BagisKutuButtonComponent';
import { CiShoppingTag, CiCalendarDate } from "react-icons/ci";
import BagisDonenKutu from '@/main/BagisDonenKutuComponent';
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import Breadcrumbs from "@/components/breadcrumbs";
import { notFound } from 'next/navigation';

export default async function BagisDetay({data}) {
  const donatepost = data;
  let postdata = donatepost.data[0];
  let postimage = "https://minberiaksa.org/uploads/"+postdata.picture;
  const renkler = {
    parabirimi: "#FFFFFF",
    fiyat: '#DAF1F4',
    fiyattext: '#01404E',
    fiyathover: '#01404E',
    fiyattexthover: '#FFFFFF',
    input: '#DBF8FC',
    inputplaceholder: '#719DA7',
  };

  const formatReadableDate = (isoDate) => {
    const date = new Date(isoDate);
    
    // "28 Ekim 2024, 11:45" formatına dönüştür
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <main>
    <Container maxW={1200} p={0}>
      <Flex direction={"column"} wrap="wrap">
      <Flex w={'100%'} direction={{base:'column',lg:'row'}} overflow={'hidden'} borderRadius={25} mt={{base:0,lg:10}}>
        <Box w={{base:'100%',lg:'80%'}} padding={{base:3,lg:0}}>
          <Image src={postimage} width={{base:'100%',lg:'100%'}} objectFit={'contain'} borderRadius={25}/>
        </Box>
        <Flex direction={'column'} p={{base:5,lg:'4em'}} py={{base:1,lg:'2.5em'}}>
          <Heading as='h1' size='lg' color={'#AA422F'} fontWeight={600} textAlign={'start'}>
            {postdata.name}
          </Heading>
          <Flex direction={"row"}>
            <Breadcrumbs line={{kategori:postdata.category.title}} />
          </Flex>
          <Box w={'100%'} mt={5}>
            <BagisKutuButtonComponent goruntuleme={"detay"} bagisid={postdata.token} bagisfiyat={postdata.tutar} bagistipi={postdata.kind} bagisItem={postdata}/>
          </Box>
        </Flex>
      </Flex>

      <Box className='projedetaykapsayici' boxShadow={'lg'} mt={'3em'} p={8} mb={5} borderRadius={15}>
        <Box className='projedetay'>
          <Box style={{fontWeight:500,}}>
            <Text fontSize={24} color={'#AA422F'} fontWeight={600}>{postdata.name}</Text>
            <div className="icerikalan" dangerouslySetInnerHTML={{__html:postdata.detail}} />
          </Box>
        </Box>

        <Box py={5} borderTopWidth={1} borderColor={'#E1E1E1'} px={{base:3,lg:0}}>
        {postdata.tags && (
            <Flex direction={"row"} gap={"3"} wrap={"wrap"}>
              {postdata.tags.split(',').map((tag, index) => (
                <Flex 
                  key={index} // Benzersiz bir key ekledik
                  direction={"row"} 
                  alignItems={"center"} 
                  gap={1}
                >
                  <CiShoppingTag size={16} color={"#8C8C8C"} />
                  <Text color={"#8C8C8C"} fontSize={12}>
                    {tag.trim()} {/* trim() ile fazladan boşlukları temizledik */}
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}
          <Flex direction={"row"} mt={2} alignItems={'center'} gap={2}>
            <CiCalendarDate size={20} color={'#8C8C8C'} />
            <Text fontSize={14} color={'#8C8C8C'}>{formatReadableDate(postdata.startdate)}</Text>
          </Flex>
        </Box>
      </Box>
      </Flex>
    </Container>
    </main>
  )
}