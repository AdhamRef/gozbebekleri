import React from 'react'
import { Box,Image,Container,Flex,Grid,GridItem,Heading} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { cache } from "react";
import FotoGaleriListe from "@/components/FotoGaleriListe";

const getPost = cache(async ({detayid}) => {
    const slugToken = await customFetch({type:'slug',text:detayid});
    let token = slugToken.data.keyID;
    return await customFetch({ type: 'detail', id: token });
});

export async function generateMetadata({ params }) {
    const posts = await getPost({ detayid: params.id }); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    let title = postdata.seotitle ? postdata.seotitle : postdata.title;
    let summary = postdata.seodesc ? postdata.seodesc : postdata.summary;
    let image = "https://minberiaksa.org/uploads/"+postdata.picture;
    const currentUrl = ""+params.detayid;
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

export default async function page({params}) {
    const posts = await getPost({ detayid: params.id });
    let poststatus = posts.status;
    let postdata = posts.data[0];
    
  return (
    <main>
    <Container maxW={1020} p={0}>
    <Flex direction={'column'} bgColor={'#FFF'} borderRadius={25} p={'2em'} py={'2.5em'} mt={10} style={{boxShadow:'0px 0px 10px -1px rgba(0,0,0,0.19)'}} >
        <Heading as='h1' fontSize='22' noOfLines={1} color={'#04819C'} fontWeight={600}>
        {postdata.title}
        </Heading>
        <Flex direction={"row"}>
        <Breadcrumbs line={{kategori:postdata.category.title,sayfa:postdata.title}} />
        </Flex>
    </Flex>
    <Flex direction={"column"} gap={5} py={10}>
        <Box width={"100%"} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
            <Flex direction={"column"} gap={5} >
                <div className="temizleme" dangerouslySetInnerHTML={{__html:postdata.detail}} />
                <FotoGaleriListe photodata={postdata.picture} />
            </Flex>
        </Box>
    </Flex>

    
      
    </Container>
    </main>
  )
}
