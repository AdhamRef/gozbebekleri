import React from 'react'
import { Box,Container,Flex,Grid,Heading,Alert,AlertIcon,AlertTitle,AlertDescription,Image,Text} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import HaberlerListeBox from '@/components/box/haberlerlistebox';
import BagisKutuButtonComponent from '../../BagisKutuButtonComponent';
import Link from 'next/link'
import { FaSquare,FaRegFileLines,FaRegHeart} from "react-icons/fa6";
import { headers } from "next/headers";
import {language} from "@/main/utilities/languageS";


const getPost = cache(async ({paramsa}) => {
  const decodedText = decodeURIComponent(paramsa);
  return await customFetch({ type: 'search', text: decodedText});
});

export async function generateMetadata({ params }) {
  return {
      title: "Arama",
      description: "Arama",
  };
}
export default async function page({params}) {
  const posts = await getPost({ paramsa: params.arama });
  let poststatus = posts.status;
  let postdata_contents = posts.contents;
  let postdata_donates = posts.donates;
  const decodedText = decodeURIComponent(params.arama);
  
  const heads = headers();
  const pathname = heads.get("x-pathname"); 
  let lang= language(pathname);
  let dil;
  if(pathname != "ar" && pathname != "en"){
    dil = "";
  }else{
    dil = pathname;
  }
  
return (
  <main>
  <Container maxW={1020} p={0}>
  <Flex direction={'column'} bgColor={'#FFF'} borderRadius={25} p={'2em'} py={'2.5em'} mt={10} boxShadow={'xs'} >
      <Heading as='h1' fontSize='22' noOfLines={1} color={'#04819C'} fontWeight={600}>
      {lang.searchresult} {decodedText} {lang.searchresult2};
      </Heading>
      <Flex direction={"row"}>
      </Flex>
  </Flex>

  {poststatus ?
  <>
  <Flex direction={"column"} gap={5} py={5}>
      <Box width={"100%"} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
          <Flex direction={"row"} gap={2} alignItems={'center'} color={'burakmavisi.50'}>
            <FaRegHeart size={24} />
            <Text fontSize={22} color={'burakmavisi.50'} fontWeight={600}>{lang.contents}</Text>
          </Flex>
          {postdata_contents && postdata_contents.length > 0 &&
          <Grid className="haberlerliste" templateColumns='repeat(3, 1fr)' gap={6} py={5} >
            {postdata_contents.map((post,index) => (
              <HaberlerListeBox key={index} bagid={index} baslik={post.title} img={"https://minberiaksa.org/uploads/"+post.picture} desc={post.summary} url={post.url} />
            ))}
          </Grid>
          }
          {postdata_contents.length < 1 &&
            <Alert status='warning'>
              <AlertIcon />
              <AlertTitle>{lang.searchcontentalert}</AlertTitle>
            </Alert>
          }
      </Box>
  </Flex>

  <Flex direction={"column"} gap={5} py={5}>
      <Box width={"100%"} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
          <Flex direction={"row"} gap={2} alignItems={'center'} color={'burakmavisi.50'}>
            <FaRegHeart size={24} />
            <Text fontSize={22} color={'burakmavisi.50'} fontWeight={600}>{lang.donations}</Text>
          </Flex>
          {postdata_donates && postdata_donates.length > 0 &&
          <Grid className="haberlerliste" templateColumns='repeat(2, 1fr)' gap={6} py={5} >
          {postdata_donates.map((post,index) => {
            let bagisimg = post.picture; 
            if(bagisimg == ""){
                bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
            }else{
                bagisimg = "https://minberiaksa.org/uploads/"+post.picture;
            }
            return(
            <Box className="BagisKutu" key={index} bg={'#f8f8f8'}>
              <Link href={dil+"/d/"+post.url}><Image objectFit='cover' src={bagisimg} height="220" alt={post.name} /></Link>
              <Box className="bilgi">
                  <Link href={dil+"/d/"+post.url}><Flex direction={"row"} alignItems={'center'} gap={2}><FaSquare /><Text className="baslik">{post.name} {post.url}</Text></Flex></Link>
                  <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} />

              </Box>
            </Box>
          )})}
          </Grid>
          }
          {postdata_donates.length < 1 &&
            <Alert status='warning'>
              <AlertIcon />
              <AlertTitle>{lang.searchdonatealert}</AlertTitle>
            </Alert>
          }
      </Box>
  </Flex>
  </>

  : <Alert status='warning' borderRadius={15} my={10}>
      <AlertIcon />
      <AlertTitle>{lang.searchcontentalert}</AlertTitle>
    </Alert>}
  
    
  </Container>
  </main>
)
}