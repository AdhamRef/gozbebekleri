import React from 'react'
import {Flex} from '@chakra-ui/react'

import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";

import BagisDonenKutuItemList from "@/components/BagisDonenKutuItemList";

const getPost = cache(async () => {
  return await customFetch({type:'donates'});
});

export default async function BagisDonenKutuComponent(){
      const posts = await getPost(); // Veriyi al
      let poststatus = posts.status;
      let postdata = posts.data;
     
      const DonenAksiyon = (a) =>{
        instanceRef.current.next();
      }
      
      return(
      <Flex direction="column" className="BagisAlan">
      <BagisDonenKutuItemList data={postdata}/>
      </Flex>
      )
}

