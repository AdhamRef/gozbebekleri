import React from 'react'
import { Box,Image,Container,Flex,Text,Center,Grid,Heading,useMediaQuery} from '@chakra-ui/react'
import { HiOutlineHome } from "react-icons/hi";
import AsideOtherPages from "@/components/AsideOtherPages";

import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import KudusBaslikAlan from "@/components/KudusBaslikAlan";

const getPost = cache(async () => {
  return await customFetch({ type: 'list', id: '67223064012d3f025450d1f0' });
});

const getHadis = cache(async () => {
  return await customFetch({ type: 'detail', id: '676d562734a8f5a63bd50fe2' });
});

export async function generateMetadata({ params }) {
    const posts = await getPost(); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    return {
        title: poststatus ? postdata.category.title : "Varsayılan Başlık",
        description: poststatus ? postdata.category.title : "Varsayılan Açıklama",
    };
}

export default async function page() {
  const posts = await getPost();
  const hadisposts = await getHadis(); // detayid'i doğrudan geçiriyoruz
  let postdata = posts.data;

  return (
    <main>
    <KudusBaslikAlan baslik={"Kudüs"} hadis={hadisposts} />
    <Container maxW={1020} p={0}>
    <Flex direction={{base:"column",lg:"row"}} gap={5} py={10}>
        <Box width={{base:"100%",lg:"60%"}}>
        <div className="timeline">
          <ul>

            {postdata.map((post,index) => {
              let clname;
              index % 2 === 0 ? clname= "sagtimeline" : clname= "soltimeline"
              return (
              <li key={index} className={clname}>
                <div className="content">
                  <div style={{padding:15}}>
                      <h3>{post.title}</h3>
                      <div dangerouslySetInnerHTML={{__html:post.detail}} />
                  </div>
                  <div className='iconarea'>
                      <HiOutlineHome size={32} color={'#153649'} style={{borderWidth:2,borderColor:'#000',borderStyle:'solid',borderRadius:25,padding:3,}}/>
                  </div>
                </div>
              </li>
            )})}
            
            <div style={{ clear: "both" }}></div>
          </ul>
        </div>
        </Box>

        <Box width={{base:"100%",lg:"50%"}} mt={{base:0,lg:'-70px'}} zIndex={5} px={{base:10}}>
          <AsideOtherPages listtype="subcatlist" katid={postdata[0].category.key} type="kudus"/>
        </Box>
    </Flex>

    </Container>
    </main>
  )
}
