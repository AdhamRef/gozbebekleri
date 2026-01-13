import React from 'react'
import { Box,Image} from '@chakra-ui/react'
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";


const getPost = cache(async () => {
    return await customFetch({ type: 'detail', id: "67b05215885e3ffadd84a41f" });
});

export default async function FooterBanner() {
    const posts = await getPost();
    let poststatus = posts.status;
    let postdata = posts.data;

    return (
        <Box>
        {poststatus && 
            <Image src={'https://minberiaksa.org/uploads/'+postdata[0].picture} width={'100%'} height={'auto'}/>
        }
        </Box>
    )
}
