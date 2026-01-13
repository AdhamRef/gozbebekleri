"use client";
import React, { useEffect, useState } from "react";
import {
  Image,
  Drawer,
  DrawerBody,
  Flex,
  Box,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Button,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { useMediaQuery } from "@chakra-ui/react";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import { usePathname } from "next/navigation";
import {
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaUser,
  FaRegHeart,
} from "react-icons/fa";
import { IoLogoTiktok } from "react-icons/io5";
import { FaLinkedinIn } from "react-icons/fa6";
import { FaBars } from "react-icons/fa6";

export default function DrawerMenuComponent(settings) {
  const [menuDataFetch, setMenuDataFetch] = useState();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpentwo, onOpentwo, onClosetwo } = useDisclosure();
  const btnRef = React.useRef();
  let messages = useLanguage();
  let languageCode = useLanguageBelirtec();
  let dilfetch = languageCode.replace("/", "");
  if (dilfetch == "") {
    dilfetch = "tr";
  }

  useEffect(() => {
    const menufetch = async () => {
      const response_ham = await fetch("/api/kategoriListe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": dilfetch,
        },
        body: JSON.stringify({ type: "menus" }),
      });
      const response = await response_ham.json(); // response_ham'dan JSON verisini al
      return response;
    };
    const fetchData = async () => {
      let menudata = await menufetch();
      const filteredMenuData = menudata["data"].filter(
        (item) => item.menuyerleri === "0"
      );
      setMenuDataFetch(filteredMenuData);
    };

    fetchData();
  }, []);

  if (isMobile) {
    return (
      <>
        <Button
          ref={btnRef}
          colorScheme="teal"
          width={"20px"}
          height={"18px"}
          p={0}
          variant={"none"}
          onClick={onOpen}
        >
          <FaBars size={24} color={"#ccc"} />
        </Button>
        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={onClose}
          finalFocusRef={btnRef}
          size={"full"}
        >
          <DrawerOverlay />
          <DrawerContent bg={"#C98624"}>
            <DrawerCloseButton />
            <DrawerBody p={0} style={{ padding: 0 }}>
              <figure style={{ padding: 15 }}>
                <Link href={"/"}>
                  <Image
                    className="logo"
                    width={"140"}
                    height={"110"}
                    src="/altlogo.png"
                  />
                </Link>
              </figure>
              {menuDataFetch &&
                menuDataFetch.map((component, index) =>
                  component.menuler.length > 1 ? (
                    <Menu key={component.id} isOpen={isOpentwo}>
                      <MenuButton
                        className="menubutton"
                        color={"#FFF"}
                        borderColor={"#df9f41f0"}
                        style={{ textTransform: "uppercase", borderRadius: 0 }}
                        _hover={{ bg: "#08a883", borderRadius: 0 }}
                        _expanded={{
                          bg: "#08a883",
                          color: "#FFF",
                          borderRadius: 0,
                        }}
                        variant="ghost"
                        as={Button}
                        onMouseEnter={onOpentwo}
                        onMouseLeave={onClosetwo}
                      >
                        {component.menubaslik}
                      </MenuButton>
                      <MenuList
                        className="dropdownmenu"
                        onMouseEnter={onOpentwo}
                        onMouseLeave={onClosetwo}
                        w="100%"
                        style={{ marginTop: -8 }}
                      >
                        {component.menuler.map((altcomponent, altindex) => (
                          <MenuItem
                            as={Link}
                            href={languageCode + "/" + altcomponent.url}
                            key={altindex}
                          >
                            {altcomponent.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                  ) : (
                    <Link
                      key={component.id}
                      href={languageCode + "/" + component.menuler[0].url}
                    >
                      <Button
                        className="menubutton"
                        variant="ghost"
                        fs="18"
                        color={"#FFF"}
                        borderColor={"#df9f41f0"}
                        style={{ textTransform: "uppercase", borderRadius: 0 }}
                        _hover={{
                          bg: "#08a883",
                          color: "#FFF",
                          borderRadius: 0,
                        }}
                        _active={{ color: "#FFF" }}
                      >
                        {component.menubaslik}
                      </Button>
                    </Link>
                  )
                )}
              <Flex direction={"row"} mt={8} gap={5} px={15}>
                <Link href="/login" w={"100%"}>
                  <Button
                    w={"100%"}
                    leftIcon={<FaUser />}
                    color={"#fff"}
                    bgColor={"#6f480f"}
                  >
                    OTURUM AÇ
                  </Button>
                </Link>
                <Link href="/bagislar" w={"100%"}>
                  <Button
                    w={"100%"}
                    leftIcon={<FaRegHeart />}
                    color={"#fff"}
                    bgColor={"#6f480f"}
                  >
                    BAĞIŞ YAP
                  </Button>
                </Link>
              </Flex>
              <Flex direction={"row"} gap={3} mt={8} px={15}>
                <Link href={settings.facelink}>
                  <Box
                    bg={"#df9f41f0"}
                    p={"8.5px"}
                    fontSize={15}
                    borderRadius="full"
                  >
                    <FaFacebookF color={"#FFF"} />
                  </Box>
                </Link>
                <Link href={settings.twitterlink}>
                  <Box
                    bg={"#df9f41f0"}
                    p={"8.5px"}
                    fontSize={15}
                    borderRadius="full"
                  >
                    <FaTwitter color={"#FFF"} />
                  </Box>
                </Link>
                <Link href={settings.instagramlink}>
                  <Box
                    bg={"#df9f41f0"}
                    p={"8.5px"}
                    fontSize={15}
                    borderRadius="full"
                  >
                    <IoLogoTiktok color={"#FFF"} />
                  </Box>
                </Link>
                <Link href={settings.youtubelink}>
                  <Box
                    bg={"#df9f41f0"}
                    p={"8.5px"}
                    fontSize={15}
                    borderRadius="full"
                  >
                    <FaYoutube color={"#FFF"} />
                  </Box>
                </Link>
                <Link href={settings.linkedinlink}>
                  <Box
                    bg={"#df9f41f0"}
                    p={"8.5px"}
                    fontSize={15}
                    borderRadius="full"
                  >
                    <FaLinkedinIn color={"#FFF"} />
                  </Box>
                </Link>
              </Flex>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  } else {
    return null;
  }
}
