"use client";
import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  Image,
  Flex,
  Heading,
  Progress,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import Link from "next/link";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import BagisKutuButtonComponent from "@/main/BagisKutuButtonComponent";
import { useAuth } from "@/components/LayoutProvider";

export default function FaaliyetKategorileri() {
  const [donatePosts, setDonatePosts] = useState();
  const { parabirimLabel, parabirimi } = useAuth();
  let lang = useLanguage();
  let dil = useLanguageBelirtec();
  let dilfetch = dil.replace("/", "");
  if (dilfetch == "") {
    dilfetch = "tr";
  }
  const renkler = {
    parabirimi: "#FFFFFF",
    fiyat: "#DAF1F4",
    fiyattext: "#01404E",
    fiyathover: "#01404E",
    fiyattexthover: "#FFFFFF",
    input: "#DBF8FC",
    inputplaceholder: "#719DA7",
  };

  const fetchData = async () => {
    //const donates = await customFetch({type:'donateswcatid',id:katid});
    // apinr
    let url = "/api/kategoriListe";
    let urlbody = JSON.stringify({ type: "donates" });
    let response = await fetch(url, {
      // URL'yi tam formatta kullanın
      cache: "no-store",
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Language": dilfetch,
      },
      body: urlbody,
    });
    // Veriyi JSON formatına dönüştür
    let posts = await response.json();
    const filterdata = posts.data.filter((item) => item.type == 4);
    setDonatePosts(filterdata);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Flex direction={"column"}>
      <Grid
        templateColumns={{ base: "repeat(1,1fr)", lg: "repeat(3,1fr)" }}
        gridGap={5}
        width={"100%"}
      >
        {donatePosts &&
          donatePosts.slice(0, 6).map((post, index) => {
            let bagisimg = post.picture;
            if (bagisimg === "") {
              bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
            } else {
              bagisimg = "https://minberiaksa.org/uploads/" + post.picture;
            }
            return (
              <Flex
                key={index}
                direction="column"
                width={"100%"}
                borderRadius={10}
              >
                <Box
                  position={"relative"}
                  borderRadius={10}
                  overflow={"hidden"}
                >
                  <Image
                    src={bagisimg}
                    width={"100%"}
                    height={390}
                    objectFit={"cover"}
                  />
                  <Flex
                    direction={"column"}
                    justifyContent={"flex-end"}
                    position={"absolute"}
                    width={"100%"}
                    height={"100%"}
                    top={0}
                    style={{
                      boxShadow: "inset 0px -69px 23px -10px rgba(0,0,0,0.67)",
                    }}
                  >
                    <Box p={5} pt={7} bg={"#1c1c1c96"}>
                      <Progress
                        mb={3}
                        w={"100%"}
                        colorScheme={"sky"}
                        bg={"#FFC7A9"}
                        value={post.totalDonateSuccessCalc}
                        borderRadius={10}
                        sx={{
                          'div[role="progressbar"]': {
                            backgroundColor: "#F36E26",
                          },
                        }}
                      />
                      <Flex direction={"row"} justifyContent={"space-between"}>
                        <Box>
                          <Text fontSize={18} color="#F36E26" fontWeight={500}>
                            {post.totalDonate} {parabirimLabel}
                          </Text>
                          <Text fontSize={12} color="#F36E26" fontWeight={500}>
                            {lang["bagislar"].target}: {post.hedeflenentutar}{" "}
                            {parabirimLabel}
                          </Text>
                        </Box>
                        <Box>
                          <Text
                            fontSize={18}
                            color="#F36E26"
                            textAlign={"right"}
                            fontWeight={500}
                          >
                            {post.member}
                          </Text>
                          <Text
                            fontSize={12}
                            color="#F36E26"
                            textAlign={"right"}
                            fontWeight={500}
                          >
                            {lang["bagislar"].donetor}
                          </Text>
                        </Box>
                      </Flex>
                    </Box>
                  </Flex>
                </Box>
                <Flex
                  direction={"column"}
                  alignItems={"center"}
                  justifyContent={"center"}
                  mt={5}
                >
                  <Link href={post.url}>
                    <Text fontSize={19} fontWeight={500} color={"#D48C24"}>
                      {post.name}
                    </Text>
                  </Link>
                  <BagisKutuButtonComponent
                    bagisid={post.token}
                    bagisfiyat={post.tutar}
                    bagistipi={post.kind}
                    bagisItem={post}
                    type={"onlybuttons"}
                  />
                </Flex>
              </Flex>
            );
          })}
      </Grid>
    </Flex>
  );
}
