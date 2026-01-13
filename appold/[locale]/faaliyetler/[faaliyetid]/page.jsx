import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react'
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import FaaliyetIcerikAlan from "@/components/FaaliyetIcerikAlan";
const getPost = cache(async ({faaliyetid}) => {
    const slugToken = await customFetch({type:'slug',text:faaliyetid});
    let token = slugToken.data.keyID;
    return await customFetch({ type: 'detail', id: token });
});

export async function generateMetadata({ params }) {
    const posts = await getPost({ faaliyetid: params.faaliyetid }); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    let title = postdata.seotitle ? postdata.seotitle : postdata.title;
    let summary = postdata.seodesc ? postdata.seodesc : postdata.summary;
    let image = "https://minberiaksa.org/uploads/"+postdata.picture;
    const currentUrl = "faaliyet/"+params.faaliyetid;
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
    const posts = await getPost({ faaliyetid: params.faaliyetid }); // detayid'i doğrudan geçiriyoruz
    let postdata = posts.data[0];
  return (
    <main>
    <Container maxW={1020} p={0}>
    <FaaliyetIcerikAlan data={postdata} />    
    </Container>
    </main>
  )
}
