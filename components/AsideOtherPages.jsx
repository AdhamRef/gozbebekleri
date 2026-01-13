import React from 'react'
import {Flex,Text} from "@chakra-ui/react";
import { FaSquareFull } from "react-icons/fa";
import {customFetch} from "@/main/utilities/customFetch";
import { cache } from "react";
import Link from "next/link"
import { FaCircle  } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";

const getPost = cache(async ({typee,ids}) => {  // Direkt params alacak şekilde
    const posts = await customFetch({ type: typee, id: ids });
    return posts;
});

export default async function AsideOtherPages({listtype,katid,type}) {
    const posts = await getPost({typee:listtype,ids:katid,detayid:'ttt'}); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data;

    return (
        <Flex p={1} direction={"column"} bg={"#F5F5F5"} className='digerleri' style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px"}}>
            <Flex direction={"row"} color={'#B9B9B9'} p={3} px={4} alignItems={'center'} gap={3}> <FaSquareFull size={18}/> <Text color={'#B9B9B9'} fontSize={16} fontWeight={500} textTransform={'uppercase'}>{postdata[0].category.title}</Text></Flex>
            <Flex px={3} py={2}  direction={'column'}>
                {postdata.map((post,index) => (
                    <Flex key={index} direction={"row"} alignItems={'center'} gap={2} py={3} borderBottomWidth={1} borderColor={'#c7c7c763'}><IoIosArrowForward size={14} color={'#A8A8A8'} /><Link href={post.url} color={'#A8A8A8'}>{post.title}</Link></Flex>
                ))}
            </Flex>
        </Flex>
    )
}
