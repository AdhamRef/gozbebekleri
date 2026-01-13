"use client";
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
  Heading,
} from "@chakra-ui/react";
import Link from "next/link";
import Head from "next/head";
import Basarisiz from "@/dosyalar/failed.json";
import dynamic from "next/dynamic";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
import { FaUndo } from "react-icons/fa";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import { useSelector } from "react-redux";

export default function Basarili() {
  let messages = useLanguage();
  let languageCode = useLanguageBelirtec();
  let dilfetch = languageCode.replace("/", "");
  if (dilfetch == "") {
    dilfetch = "tr";
  }
  const {
    name,
    email,
    mtoken,
    gsm,
    paymenttoken,
    membertoken,
    membertype,
    oturumdurumu,
  } = useSelector((state) => state.oturum);

  const IframeDonate = () => {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <iframe
          src="https://charitygiving.net/iframe/eyJpdiI6InQzOVRQNUUyRCt0ODFzQ2hYZXUzekE9PSIsInZhbHVlIjoieXBMZVBqMXRPVFFCSHNvNzNsUXViZz09IiwibWFjIjoiMjE1Zjk3MDQzNjRlNjBlNTg2Y2FhMjkxOThiMTdlMGJjMzRiNWE5ODRlYzJiYWE0OTk5MTBiOWRkYWQyMjhlNiIsInRhZyI6IiJ9"
          allow="payment"
          frameBorder="0"
          height="580"
          width="400"
        ></iframe>
      </div>
    );
  };

  return (
    <>
      <head>
        <script async src="https://js.stripe.com/v3/buy-button.js"></script>
      </head>
      <main
        style={{
          background: "#f8f8f8",
          paddingTop: "3em",
          paddingBottom: "4em",
        }}
      >
        <Container maxW={["100%", 1000]} py={8}>
          <Flex direction={"column"} p={7} bg={"#fff"}>
            <Flex
              style={{ width: "100%" }}
              pb={5}
              direction="row"
              justify={"space-between"}
              borderBottom={"1px solid #E9E9E9"}
            >
              <Flex style={{}} direction={"row"} alignItems={"center"} gap={3}>
                <Image src={"/carticon.svg"} width={30} />
                <Text
                  mt={0.5}
                  fontSize={28}
                  fontWeight={600}
                  className="mavitextgradient"
                >
                  {messages.result}
                </Text>
              </Flex>
            </Flex>
            <Flex
              direction={"column"}
              alignItems={"center"}
              justifyContent={"center"}
              textAlign={"center"}
              bg={"#F8F8F8"}
              p={5}
              pb={7}
              mt={5}
              borderRadius={15}
            >
              <Lottie
                renderer="svg"
                style={{ width: 180 }}
                fontSize="12"
                animationData={Basarisiz}
                loop={false}
              />
              <Heading as="h1" fontSize={28} color={"#b21616"}>
                {messages.yourdonatefailed}
              </Heading>
              <Text
                fontSize={16}
                color={"black"}
                fontWeight={500}
                mt={5}
                lineHeight={8}
              >
                {messages.yourdonatefailed_dear} {name},{" "}
                {messages.yourdonatefailed_dear_detail}
              </Text>
              {dilfetch == "tr" && (
                <Flex
                  width={"100%"}
                  mt={5}
                  py={5}
                  gap={5}
                  borderTop={"1px solid #E6E6E6"}
                  direction={"column"}
                >
                  <Text textAlign={"center"} fontSize={14} fontWeight={600}>
                    {messages.yourdonatefailed_bankaccounts}
                  </Text>
                  <Text>
                    <strong>🏦 Banka Hesap Bilgilerimiz:</strong>
                    <br />
                    📌 IBAN: TR37 0020 3000 0859 2124 0000 18
                    <br />
                    📌 Alıcı Adı: Uluslararası Minberi Aksa Derneği
                    <br />
                  </Text>
                </Flex>
              )}
              <Flex
                width={"100%"}
                mt={5}
                py={5}
                gap={5}
                borderTop={"1px solid #E6E6E6"}
                direction={"column"}
              >
                <Text textAlign={"center"} fontSize={14} fontWeight={600}>
                  {messages.paymentalternativetext}
                </Text>
                <IframeDonate />
              </Flex>
              <Flex
                justifyContent={"center"}
                w={"100%"}
                direction={"row"}
                gap={5}
                mt={5}
                borderTop={"1px solid #E6E6E6"}
                py={5}
                wrap={"wrap"}
              >
                <Link href={"/"}>
                  <Button fontSize={14} colorScheme="red" fontWeight={500}>
                    {messages.backtohomepage}
                  </Button>
                </Link>
                <Link href={"/sepet"}>
                  <Button
                    fontSize={14}
                    leftIcon={<FaUndo />}
                    colorScheme="red"
                    fontWeight={500}
                  >
                    {messages.trydonateagain}
                  </Button>
                </Link>
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </main>
    </>
  );
}
