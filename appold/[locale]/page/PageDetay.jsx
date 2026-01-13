import React from "react";
import {
  Box,
  Image,
  Container,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Link,
  Heading,
} from "@chakra-ui/react";
import { customFetch } from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { AiOutlineHome } from "react-icons/ai";
import { cache } from "react";
import { notFound } from "next/navigation";
import FotoGaleriListe from "@/components/FotoGaleriListe";
import { FaRegFilePdf } from "react-icons/fa";

export default async function page({ data }) {
  const posts = data;
  let poststatus = posts.status;
  let postdata = posts.data[0];
  console.log("aa", postdata);
  return (
    <main>
      <Flex
        bgImage={{ base: "/mobiltitlebg.jpg", lg: "/detaybaslikbg.jpg" }}
        direction={"column"}
        py={"4em"}
      >
        <Container maxW={1200} p={0}>
          <Flex direction={"row"} gap={5} px={{ base: 4, lg: 0 }}>
            <AiOutlineHome
              className="mobilehide"
              size={"40px"}
              color={"#FFC471"}
              style={{ marginTop: 4 }}
            />
            <Flex direction={"column"} gap={0}>
              <Heading
                as="h1"
                fontSize={28}
                color={"white"}
                fontWeight={600}
                textAlign={"left"}
              >
                {postdata.title}
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
                  line={{
                    kategori: postdata.category.title,
                    sayfa: postdata.title,
                  }}
                  color={"#fff"}
                />
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </Flex>

      <Container maxW={1200} p={0}>
        <Flex
          direction={{ base: "column-reverse", lg: "row" }}
          gap={5}
          py={{ base: 5, lg: 10 }}
        >
          <Box width={{ base: "100%", lg: "30%" }}>
            <AsideOtherPages listtype="list" katid={postdata.category.key} />
          </Box>
          <Box
            width={{ base: "100%", lg: "80%" }}
            bg={"#FFF"}
            p={8}
            borderRadius={25}
            style={{ boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)" }}
          >
            <Flex direction={"column"} gap={5}>
              <Heading>{postdata.title}</Heading>
              {postdata.picture && (
                <Image
                  src={"https://minberiaksa.org/uploads/" + postdata.picture}
                />
              )}
              <div
                className="temizleme"
                dangerouslySetInnerHTML={{ __html: postdata.detail }}
              />
              {postdata.gallery && (
                <FotoGaleriListe photodata={postdata.gallery} />
              )}
              {postdata.url == "tuzuk" && (
                <Button
                  leftIcon={<FaRegFilePdf />}
                  colorScheme="teal"
                  variant="solid"
                  sx={{ width: "160px", background: "#aa7528" }}
                  as={Link}
                  href={"https://minberiaksa.org/uploads/tuzuk.pdf"}
                >
                  Tüzük İndir
                </Button>
              )}
            </Flex>
          </Box>
        </Flex>
      </Container>

      <Box>
        <Image src={"/ozgurfilistin.jpg"} width={"100%"} height={"auto"} />
      </Box>
    </main>
  );
}
