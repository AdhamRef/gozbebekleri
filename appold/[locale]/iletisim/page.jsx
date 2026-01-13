import React from "react";
import {
  Box,
  Image,
  Container,
  Flex,
  Text,
  Divider,
  Center,
  Input,
  Button,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import Link from "next/link";
import { BsQuestion, BsBox2HeartFill, BsFillHousesFill } from "react-icons/bs";
import { TbMessage2Search } from "react-icons/tb";
import { IoIosArrowDropright } from "react-icons/io";
import IletisimBilgileri from "@/components/iletisim/IletisimBilgileri";
import Breadcrumbs from "@/components/breadcrumbs";
import { AiOutlineHome } from "react-icons/ai";

import { cache } from "react";
import { customFetch } from "@/main/utilities/customFetch";

import { language } from "@/main/utilities/languageS";
import { headers } from "next/headers";
import IletisimFormu from "@/components/IletisimFormu";
import GmapsIletisim from "@/components/GmapsIletisim";

const getPost = cache(async () => {
  let fetchid = "672231ae012d3f025450d206";
  return await customFetch({ type: "list", id: fetchid });
});

export default async function Iletisim() {
  const posts = await getPost();
  let postdata = posts.data;

  const heads = headers();
  const pathname = heads.get("x-pathname");
  let lang = language(pathname);

  return (
    <main style={{}}>
      <Flex bgImage={"/detaybaslikbg.jpg"} direction={"column"} py={"8em"}>
        <Container maxW={1200} p={0}>
          <Flex direction={"row"} gap={5}>
            <AiOutlineHome
              size={28}
              color={"#FFC471"}
              style={{ marginTop: 4 }}
            />
            <Flex direction={"column"} gap={0}>
              <Heading
                as="h1"
                fontSize={28}
                noOfLines={1}
                color={"white"}
                fontWeight={600}
                textAlign={"inherit"}
              >
                {lang.contactus}
              </Heading>
              <Box
                width={"100px"}
                height={1}
                borderRadius={10}
                bg={"#ffffffd4"}
                my={3}
              />
              <Flex direction={"row"}>
                <Breadcrumbs
                  line={{ kategori: lang.contactus }}
                  color={"#fff"}
                />
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </Flex>
      <Container maxW={1200} py={10}>
        <Flex direction={"row"}>
          <IletisimBilgileri />
          <IletisimFormu />
        </Flex>
      </Container>

      <GmapsIletisim />
    </main>
  );
}
