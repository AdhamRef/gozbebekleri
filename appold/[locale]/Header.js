"use client";
import SepetIcon from "./SepetIconComponent";
import UstMenu from "./MenuComponent";
import React, { useEffect, useState } from "react";
import {
  useDisclosure,
  Box,
  Button,
  ButtonGroup,
  Text,
  useTheme,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Container,
  Flex,
  useMediaQuery,
} from "@chakra-ui/react";
import Image from "next/image";
import { BsFillPersonFill, BsSearch, BsBank } from "react-icons/bs";
import DrawerMenu from "./DrawerMenuComponent";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { useModal } from "./ModalContext";
import { useAuth } from "@/components/LayoutProvider";
import AramaInput from "@/components/AramaInput";
import HeaderButonlar from "@/components/header/HeaderButonlar";
import HeaderButonlarMobil from "@/components/header/HeaderButonlarMobil";
import { PiMosque } from "react-icons/pi";
import { FaHands } from "react-icons/fa6";
import { oturumKapat } from "@/redux/slices/oturumSlice";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import Diller from "@/components/Diller";
import { CiHome } from "react-icons/ci";
import {
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaUser,
  FaRegHeart,
} from "react-icons/fa";
import { IoLogoTiktok } from "react-icons/io5";
import { FaLinkedinIn } from "react-icons/fa6";

export default function Header({ setting }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { showModal } = useModal();
  const theme = useTheme();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const { count, login } = useAuth();
  const { name, email, oturumdurumu } = useSelector((state) => state.oturum);
  const [durum, setDurum] = useState(false);

  let languages = useLanguage();
  let dil = useLanguageBelirtec();

  const dispatch = useDispatch(); //

  const oturumuKapat = () => {
    alert("Oturum Kapatılıyor");
    dispatch(oturumKapat());
    document.cookie = `${"auth-token"}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    document.cookie = `${"paymenttoken"}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
  };

  if (isMobile) {
    return (
      <header>
        <Container
          className="headerContainer"
          px="0"
          py="2"
          pt={0}
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
          ml={[0, "2%"]}
          maxW={["1020px", "96%"]}
          bg={"#fff"}
        >
          <Flex
            direction={"row"}
            justifyContent={"space-between"}
            bgColor={"#cf8a2b"}
            py={2}
            px={2}
          >
            <HeaderButonlarMobil buttonadi={"telefon"} />

            <Flex direction={"row"} gap={1} alignItems={"center"}>
              <Link href={setting.facelink}>
                <Box bg={"#fff"} p={"5px"} fontSize={9} borderRadius="full">
                  <FaFacebookF color={"#df9f41f0"} />
                </Box>
              </Link>
              <Link href={setting.twitterlink}>
                <Box bg={"#fff"} p={"5px"} fontSize={9} borderRadius="full">
                  <FaTwitter color={"#df9f41f0"} />
                </Box>
              </Link>
              <Link href={setting.instagramlink}>
                <Box bg={"#fff"} p={"5px"} fontSize={9} borderRadius="full">
                  <IoLogoTiktok color={"#df9f41f0"} />
                </Box>
              </Link>
              <Link href={setting.youtubelink}>
                <Box bg={"#fff"} p={"5px"} fontSize={9} borderRadius="full">
                  <FaYoutube color={"#df9f41f0"} />
                </Box>
              </Link>
              <Link href={setting.linkedinlink}>
                <Box bg={"#fff"} p={"5px"} fontSize={9} borderRadius="full">
                  <FaLinkedinIn color={"#df9f41f0"} />
                </Box>
              </Link>
            </Flex>
          </Flex>
          <Flex
            direction="column"
            justify="space-between"
            align="center"
            wrap={"nowrap"}
          >
            <Flex
              direction="row"
              wrap="nowrap"
              align="center"
              w={"100%"}
              justifyContent={"space-between"}
              gap="2"
              px={2}
              py={2}
            >
              <Link href={dil + "/"}>
                <Image
                  className="logo"
                  width={"140"}
                  height={"110"}
                  src="/logo.png"
                />
              </Link>
              <Flex wrap="nowrap" gap={2} alignItems={"center"}>
                <SepetIcon />
                <Link href={dil + "/login/"}>
                  <Button
                    px="0"
                    style={{ position: "relative", background: "transparent" }}
                  >
                    <BsFillPersonFill fontSize={22} />
                  </Button>
                </Link>
                <DrawerMenu settings={setting} />
                <Diller />
              </Flex>
            </Flex>
            <Flex direction="row" gap="2" mt={3}>
              <HeaderButonlarMobil buttonadi={"bagisyap"} />
              <HeaderButonlarMobil buttonadi={"duzenlibagis"} />
              <HeaderButonlarMobil buttonadi={"hesaplarimiz"} />
            </Flex>
          </Flex>
        </Container>
      </header>
    );
  } else {
    return (
      <header style={{ padding: "0px 0px", zIndex: 89, position: "relative" }}>
        <Container
          className="headerContainer"
          px="0"
          py="2"
          bg={"#fff"}
          maxW={"1200px"}
          position={"relative"}
          zIndex={8}
        >
          <Flex direction="row" justify="space-between" align="center">
            <Flex direction={"column"} w={"35%"} gap={5}>
              <Flex gap="2" direction="row" alignItems={"center"}>
                <HeaderButonlar buttonadi={"bagisyap"} />
                <HeaderButonlar buttonadi={"duzenlibagis"} />
                <HeaderButonlar buttonadi={"hesaplarimiz"} />
              </Flex>
              <UstMenu display="desktop" />
            </Flex>
            <Flex
              direction={"column"}
              w={"50%"}
              boxShadow={"lg"}
              justifyContent={"center"}
              alignItems={"center"}
              position={"relative"}
            >
              <Box
                bg={"#fff"}
                borderBottomRadius={50}
                padding={"60px 15px"}
                position={"absolute"}
                boxShadow={"lg"}
              >
                <Link href={dil + "/"}>
                  <Image
                    className="logo"
                    alt={setting.title}
                    width={"280"}
                    height={"110"}
                    src="/logo.png"
                    mt={"20px"}
                  />
                </Link>
              </Box>
            </Flex>
            <Flex direction={"column"} w={"40%"} gap={5}>
              <Flex gap="2" direction={"row"} justifyContent={"flex-end"}>
                <HeaderButonlar buttonadi={"whatsapptelefon"} />
                <HeaderButonlar buttonadi={"telefon"} />
              </Flex>
              <Flex
                wrap="nowrap"
                gap={1}
                direction={"row"}
                justifyContent={"flex-end"}
              >
                <SepetIcon />
                <Link href={dil + "/login"} locale={dil}>
                  <Button
                    px="0"
                    style={{ position: "relative" }}
                    bg={"#F0F0F0"}
                    color={"#C0C0C0"}
                    borderRadius={0}
                    borderTopRightRadius={10}
                    borderBottomLeftRadius={10}
                  >
                    <BsFillPersonFill fontSize={16} />
                  </Button>
                </Link>
                <Diller />
                <Button
                  px="0"
                  style={{ position: "relative", background: "transparent" }}
                  color={"#A7C9D0"}
                  onClick={onOpen}
                >
                  <BsSearch fontSize={16} />
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Container>
        <AramaInput isOpen={isOpen} onClose={onClose} />
      </header>
    );
  }
}
