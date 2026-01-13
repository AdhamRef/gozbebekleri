
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

const getPost = cache(async ({bagisid}) => {
  const slugToken = await customFetch({type:'slug',text:bagisid});
  if(!slugToken.status){notFound()}
  let token = slugToken.data.keyID;
  return await customFetch({ type: 'donatedetail', id: token });
});


export async function generateMetadata({ params }) {
  const posts = await getPost({ bagisid: params.id }); // detayid'i doğrudan geçiriyoruz
  const poststatus = posts.status;
  const postdata = posts.data[0];

  let title = postdata.name ? postdata.name : "Bağış";
  let summary = postdata.name ? postdata.name : "Bağış";
  let image = "https://minberiaksa.org/uploads/"+postdata.picture;
  const currentUrl = "d/"+params.id;
  return {
      title: title,
      description: summary,
      openGraph: {
        title: title,
        description: summary,
        images: image,
        url: currentUrl,
      },
  };
}


export default async function BagisDetay({params}) {
  const donatepost = await getPost({ bagisid: params.id });
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
    <Container maxW={1200}  p={0}>
      <Flex direction={"column"} wrap="wrap">
      <Flex w={'100%'} direction={{base:'column-reverse',lg:'row'}} overflow={'hidden'} borderRadius={25} mt={10}>
        <Box w={'100%'} bgImage={"url("+postimage+")"} bgPos={'center'} bgSize={'cover'} borderRadius={25}>
          <Image opacity={0} src={postimage} width={{base:'100%',lg:'60%'}}  height={400}/>
        </Box>
        <Flex direction={'column'} p={{base:5,lg:'4em'}} py={'2.5em'}>
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
    <Box mt={8} pt={'2em'} pb={'4em'}>
      <Container maxW='1200' p={0} px={{base:3,lg:0}}>
        <BagisDonenKutu/>
      </Container>
    </Box>
    </main>
  )
}