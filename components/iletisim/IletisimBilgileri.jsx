"use client";
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
  useToast,
  IconButton,
} from "@chakra-ui/react";
import { BsPinMapFill, BsFillEnvelopeFill, BsHeadset } from "react-icons/bs";
import { TbMapSearch } from "react-icons/tb";
import { IoLocationOutline } from "react-icons/io5";
import { useAuth } from "@/components/LayoutProvider";
import { FaRegCopy } from "react-icons/fa";
import { useLanguage } from "@/main/utilities/language";
import Link from "next/link";
export default function IletisimBilgileri() {
  const { settings } = useAuth();

  let messages = useLanguage();
  const Toast = useToast();

  const kopyalaText = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        Toast({
          title: "Bilgiler Kopyalandı",
          position: "bottom-right",
          isClosable: true,
        });
      })
      .catch((err) => {
        console.error("Metin kopyalanırken bir hata oluştu: ", err);
      });
  };
  const kopyala = (text) => {
    return (
      <IconButton
        bg={"#04819c"}
        color={"white"}
        aria-label="Kopyala"
        p={2}
        minW={"auto"}
        height={"auto"}
        icon={<FaRegCopy size={10} />}
        ml={2}
        onClick={() => kopyalaText(text)}
      />
    );
  };
  return (
    <Flex
      width={"50%"}
      direction={{ base: "column", lg: "column" }}
      alignItems={"stretch"}
      h={{ base: "auto", lg: 240 }}
      gap={5}
    >
      <Flex
        width={160}
        py={2}
        justifyContent={"center"}
        bg={"#AA422F"}
        borderRadius={10}
      >
        <Text fontSize={16} fontWeight={500} color={"#fff"}>
          {messages.istanbul}
        </Text>
      </Flex>

      <Flex my={5}>
        <Text
          fontSize={28}
          fontWeight={600}
          color={"#CE8B2B"}
          textTransform={"uppercase"}
        >
          {messages.addresstitle}
        </Text>
      </Flex>
      {settings.adres && (
        <Flex
          direction={"row"}
          gap={3}
          justifyContent={"flex-start"}
          alignItems={"center"}
        >
          <Flex
            justifyContent={"center"}
            alignItems={"center"}
            bg={"#FFE6C1"}
            padding={3}
            borderRadius={55}
          >
            <BsPinMapFill color={"#C98624"} size={20} />
          </Flex>
          <Text fontSize={18} fontWeight={"500"} color={"#C98624"}>
            {settings.adres}
          </Text>
        </Flex>
      )}

      {settings.gsm && (
        <Flex
          direction={"row"}
          gap={3}
          justifyContent={"flex-start"}
          alignItems={"center"}
        >
          <Flex
            justifyContent={"center"}
            alignItems={"center"}
            bg={"#FFE6C1"}
            padding={3}
            borderRadius={55}
          >
            <BsHeadset color={"#C98624"} size={20} />
          </Flex>
          <Text fontSize={18} fontWeight={"500"} color={"#C98624"}>
            {settings.gsm}
          </Text>
        </Flex>
      )}

      {settings.faks && (
        <Flex
          direction={"row"}
          gap={3}
          justifyContent={"flex-start"}
          alignItems={"center"}
        >
          <Flex
            justifyContent={"center"}
            alignItems={"center"}
            bg={"#FFE6C1"}
            padding={3}
            borderRadius={55}
          >
            <BsFillEnvelopeFill color={"#C98624"} size={20} />
          </Flex>
          <Text fontSize={18} fontWeight={"500"} color={"#C98624"}>
            {settings.faks}
          </Text>
        </Flex>
      )}

      {settings.email && (
        <Flex
          direction={"row"}
          gap={3}
          justifyContent={"flex-start"}
          alignItems={"center"}
        >
          <Flex
            justifyContent={"center"}
            alignItems={"center"}
            bg={"#FFE6C1"}
            padding={3}
            borderRadius={55}
          >
            <BsFillEnvelopeFill color={"#C98624"} size={20} />
          </Flex>
          <Text fontSize={18} fontWeight={"500"} color={"#C98624"}>
            {settings.email}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
