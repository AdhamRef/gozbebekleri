"use client";
import React, { useEffect, useState } from "react";
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
import komp from "@/components/BagisKutuComp";
import BagisIcon from "@/dosyalar/heartsuccess3.json";
import dynamic from "next/dynamic";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
import OdemeAdimlariWizard from "../components/OdemeAdimlariWizard";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { BsFillSuitHeartFill } from "react-icons/bs";
import Script from "next/script";

export default function Basarili({ searchParams }) {
  let param_token = searchParams.token;
  const [paymentInfo, setPaymentInfo] = useState();
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
  const router = useRouter();
  let messages = useLanguage();
  let languageCode = useLanguageBelirtec();
  let dilfetch = languageCode.replace("/", "");
  let parabirimi;
  if (dilfetch == "") {
    dilfetch = "tr";
  }
  if (dilfetch == "tr") {
    parabirimi = "TRY";
  } else {
    parabirimi = "USD";
  }

  useEffect(() => {
    const getFetch = async (token) => {
      const response = await fetch("/api/paymentInfo", {
        cache: "no-store",
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": dilfetch,
        },
        body: JSON.stringify({ checkouttoken: token }),
      });
      const data = await response.json();
      console.log("data", data);
      setPaymentInfo(data);
      return data;
    };
    if (param_token) {
      getFetch(param_token);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.dataLayer) {
      if (paymentInfo?.payment) {
        let items = paymentInfo?.basket.map((post) => ({
          item_id: post.key,
          item_name: post.name,
          price: Number(post.price),
          quantity: post.quantity ? Number(post.quantity) : 1,
          donation_type: post.regular_payment ? "regular" : "one_time",
        }));

        window.dataLayer.push({
          event: "Donate",
          event_id: "dnt_" + paymentInfo?.id,
          donation_value: Number(paymentInfo?.payment?.orjprice || 0),
          currency: parabirimi,
          ecommerce: { items },
          payment_method: "CREDIT_CARD",
          user_email: email,
          user_phone: gsm,
        });
      }
    }
  }, [paymentInfo]);

  return (
    <>
      <main style={{ background: "#f8f8f8", paddingBottom: "4em" }}>
        <Container maxW={1020} py={8}>
          <OdemeAdimlariWizard adim={3} />

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
                style={{
                  width: 180,
                  filter:
                    "invert(42%) sepia(93%) saturate(1352%) hue-rotate(177deg) brightness(119%) contrast(119%)",
                }}
                fontSize="12"
                animationData={BagisIcon}
                loop={true}
                color={"#56C0D7"}
                bgColor={"#56C0D7"}
              />
              <Heading as="h1" fontSize={28} color={"burakmavisi.50"}>
                {messages.yourdonatesuccessfull}
              </Heading>
              <Text
                fontSize={16}
                color={"black"}
                fontWeight={500}
                mt={5}
                lineHeight={8}
              >
                {messages.yourdonatesuccessfull_dear} {name}{" "}
                {messages.yourdonatesuccessfull_dear_detail}{" "}
              </Text>
              <Flex
                justifyContent={"center"}
                w={"100%"}
                direction={"row"}
                gap={5}
                mt={5}
                borderTop={"1px solid #E6E6E6"}
                py={5}
              >
                <Button
                  bgColor={"#959595"}
                  px={5}
                  py={5}
                  color={"#fff"}
                  fontWeight={500}
                  onClick={() => router.push(languageCode + "/")}
                  textTransform={"uppercase"}
                >
                  {messages.backtohomepage}
                </Button>
                <Button
                  bgColor={"#959595"}
                  px={5}
                  py={5}
                  color={"#fff"}
                  fontWeight={500}
                  onClick={() => router.push(languageCode + "/bagislar")}
                  textTransform={"uppercase"}
                >
                  {messages.donatenow}
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </main>
    </>
  );
}
