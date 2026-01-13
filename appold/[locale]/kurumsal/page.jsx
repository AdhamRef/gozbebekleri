import React from "react";
import {
  Box,
  Image,
  Container,
  Flex,
  Text,
  Button,
  Heading,
  Grid,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@chakra-ui/react";
import Link from "next/link";
import Head from "next/head";
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSquareFull } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { FiTarget } from "react-icons/fi";
import { customFetch } from "@/main/utilities/customFetch";
import { cache } from "react";
import KurumsalSVideo from "@/components/kurumsal/KurumsalSVideo";
import Breadcrumbs from "@/components/breadcrumbs";
import { AiOutlineHome } from "react-icons/ai";
import { FaRegFilePdf } from "react-icons/fa";

const getPost = cache(async () => {
  return await customFetch({ type: "list", id: "672230bc012d3f025450d1fa" });
});

const getPost_kurmsal = cache(async () => {
  return await customFetch({ type: "detail", id: "67b3942d885e3ffadd84ad7d" });
});

export async function generateMetadata() {
  const posts = await getPost(); // Veriyi al
  let postdata = posts.data;

  return {
    title:
      postdata.length > 0 ? postdata[0].category.title : "Varsayılan Başlık",
    description:
      postdata.length > 0 ? postdata[0].category.title : "Varsayılan Açıklama",
  };
}

export default async function page() {
  const posts = await getPost(); // Veriyi al
  let postdata = posts.data;
  let multiparams = postdata.find(
    (param) => param.token == "67223650012d3f025450d215"
  ).multiparams;
  let tanitimvideomuz = multiparams.find(
    (param) => param.type.key === "673c8fecada526e2a5841a88"
  ).value;
  let tanitimvideomuz_metin = multiparams.find(
    (param) => param.type.key === "6779715f9d2dfc5d7ebb2da8"
  ).value;

  const posts_krmsal = await getPost_kurmsal(); // Veriyi al
  let postdata_krmsal = posts_krmsal.data;
  const Iconlar = (img, baslik, desc) => {
    return (
      <Flex direction={"row"} gap={5} mb={5} alignItems={"center"}>
        <Image src={img} width={70} height={70} />
        <Flex direction={"column"}>
          <Text fontSize={28} fontWeight={600}>
            {baslik}
          </Text>
          <Text fontSize={18} fontWeight={500} whiteSpace={"pre-line"}>
            {desc}
          </Text>
        </Flex>
      </Flex>
    );
  };

  return (
    <main>
      <Flex
        direction={"column"}
        py={{ base: "2em", lg: "4em" }}
        position={"relative"}
        zIndex={5}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Box
          width={"100%"}
          height={"100%"}
          bgImg={{
            base: "url('/mobiltitlebg.jpg')",
            lg: "url('/kurumsalbannerfull.jpg')",
          }}
          bgPos={"right center"}
          bgSize={"cover"}
          position={"absolute"}
          zIndex={9}
          top="0"
          left={0}
        ></Box>
        <Container
          maxW={1200}
          p={0}
          px={{ base: 3, md: 0 }}
          position={"relative"}
          zIndex={19}
        >
          <Flex direction={"row"} gap={5}>
            <AiOutlineHome
              className="mobilehide"
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
                textAlign={"left"}
              >
                {postdata[0].category.title}
              </Heading>
              <Box
                width={"100px"}
                height={1}
                borderRadius={10}
                bg={"#ffffffd4"}
                my={3}
              />
              <Flex direction={"row"}>
                <Breadcrumbs line={{ kategori: postdata[0].category.title }} />
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </Flex>

      <Container maxW={1200} py={10} px={{ base: 3, lg: 0 }}>
        <Flex direction={{ base: "column", lg: "row" }} gap={5}>
          <Box
            w={{ base: "100%", lg: "45%" }}
            pr={5}
            borderRight={{ base: 0, lg: "1px solid #C98624" }}
          >
            <Text fontSize={19} fontWeight={500} color={"#AA422F"}>
              {postdata_krmsal[0].title}
            </Text>
            <Text mt={3} fontSize={24} fontWeight={600} color={"#C98624"}>
              {postdata_krmsal[0].summary}
            </Text>
          </Box>
          <Box>
            <div
              style={{ fontSize: 20 }}
              dangerouslySetInnerHTML={{ __html: postdata_krmsal[0].detail }}
            />
          </Box>
        </Flex>
        <Flex direction={{ base: "column", lg: "row" }} gap={5} mt={10}>
          <KurumsalSVideo
            videoKodu={tanitimvideomuz}
            metin={tanitimvideomuz_metin}
          />
          <Flex direction={"row"} wrap={"wrap"} gap={5}>
            <Box width={"100%"}>
              <Image
                src="/kurumsalimg.jpg"
                alt="Hakkımızda"
                width={"100%"}
                objectFit={"cover"}
                height={290}
                borderRadius={15}
              />
            </Box>
            <Box flex={1}>
              <Image
                src="/kurumsalimg2.jpg"
                alt="Hakkımızda"
                width={"100%"}
                objectFit={"cover"}
                height={290}
                borderRadius={15}
              />
            </Box>
            <Box flex={1}>
              <Image
                src="/kurumsalimg3.jpg"
                alt="Hakkımızda"
                width={"100%"}
                objectFit={"cover"}
                height={290}
                borderRadius={15}
              />
            </Box>
          </Flex>
        </Flex>

        <Grid
          templateColumns={{ base: "repeat(1,1fr)", lg: "repeat(2,1fr)" }}
          direction={"row"}
          gap={10}
          mt={10}
        >
          {postdata.slice(0, 10).map((post, index) => (
            <Box
              key={index}
              p={8}
              px={8}
              _odd={{ background: "#C98624" }}
              _even={{ background: "#AA422F" }}
              color={"#fff"}
              borderRadius={10}
            >
              <Text fontSize={24} fontWeight={600} mb={5}>
                {post.title}
              </Text>
              <div
                className="temizlemedetay"
                dangerouslySetInnerHTML={{ __html: post.detail }}
              />
              {post.url == "tuzuk" && (
                <Button
                  leftIcon={<FaRegFilePdf />}
                  colorScheme="teal"
                  variant="solid"
                  sx={{
                    width: "160px",
                    background: "#e7ab38",
                    marginTop: "20px",
                  }}
                  as={Link}
                  href={"https://minberiaksa.org/uploads/tuzuk.pdf"}
                >
                  Tüzük İndir
                </Button>
              )}
            </Box>
          ))}
        </Grid>

        <Flex direction={"column"} mt={"4em"}>
          <Heading fontWeight={600} fontSize={34} color={"#BB7714"}>
            İSTATİSTİK
          </Heading>
          <Flex
            direction={"row"}
            flexWrap={"wrap"}
            justifyContent={"space-between"}
            mt={10}
          >
            {Iconlar(
              "/tamamlananprojelerico.png",
              "1851+",
              "Tamamlanan \nProjeler"
            )}
            {Iconlar("/restorasyonico.png", "210+", "Restorasyon \nProjesi")}
            {Iconlar("/mutluailelerico.png", "10K+", "Mutlu Aileler \nProjesi")}
            {Iconlar("/gidaico.png", "3410+", "Gıda & Giyim \nProjesi")}
          </Flex>
        </Flex>
      </Container>
    </main>
  );
}
