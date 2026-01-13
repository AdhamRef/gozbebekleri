"use client";
import React, { Component, useEffect, useState } from "react";
import {
  Container,
  Image,
  Box,
  Flex,
  Input,
  Button,
  Text,
  Grid,
} from "@chakra-ui/react";
import { BsArrowRightShort } from "react-icons/bs";
import { FaFacebookF, FaTwitter, FaYoutube } from "react-icons/fa";
import { IoLogoTiktok } from "react-icons/io5";
import { FaLinkedinIn } from "react-icons/fa6";
import { RiBankFill } from "react-icons/ri";
import { MdOutlineQuestionAnswer } from "react-icons/md";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import Swal from "sweetalert2";
import { FaInstagram } from "react-icons/fa";
import HizliBagis from "@/components/HizliBagis";

export default function Footer({ setting }) {
  let messages = useLanguage();
  const [bagislar, setBagislar] = useState();
  const [menuDataFetch, setMenuDataFetch] = useState();
  const [ebultenMail, setEbultenMail] = useState();
  let dil = useLanguageBelirtec();
  let dilfetch = dil;
  dilfetch = dilfetch.replace("/", "");
  if (dil == "") {
    dilfetch = "tr";
  }

  const whatsappnumara = setting.whatsappfixno.replace(/\s+/g, "");
  let whatsappfixmsg = setting.whatsappfixmsg;
  if (!whatsappfixmsg) {
    whatsappfixmsg = "Merhaba";
  }

  useEffect(() => {
    const bagislarfetch = async () => {
      let urlbody = JSON.stringify({ type: "donates" });
      let response = await fetch("/api/kategoriListe", {
        cache: "no-store",
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": dilfetch,
        },
        body: urlbody,
      });

      let posts = await response.json();
      return posts;
    };

    const fetchData = async () => {
      let bdata = await bagislarfetch();
      if (bdata.status) {
        let bdatatumu = bdata["data"];
        const filteredData = bdatatumu.filter((item) => item.simge === "1");
        setBagislar(bdatatumu);
      }
    };

    fetchData(); // Fetch işlemini başlat

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
    const menuFetchData = async () => {
      let menudata = await menufetch();
      const filteredMenuData = menudata["data"].filter(
        (item) => item.menuyerleri === "1"
      );
      setMenuDataFetch(filteredMenuData);
    };

    menuFetchData();
  }, []);

  const Gonder = () => {
    const gfetch = async () => {
      const inputValues = {};
      inputValues["email"] = ebultenMail;
      inputValues["formID"] = "67532d51bf3402185e27ce5a";
      if (!ebultenMail) {
        Swal.fire({
          icon: "error",
          html: "<strong>" + messages.fillallfields + "</strong>",
          padding: "0px 0px 20px 0px",
          showConfirmButton: false,
          width: "350px",
          allowOutsideClick: () => {
            Swal.close();
            return false; // Explicitly return false to handle `allowOutsideClick`.
          },
        });

        return false;
      }
      try {
        const response = await fetch("/api/formsadd", {
          method: "POST",
          body: JSON.stringify(inputValues),
        });
        if (response.ok) {
          let responsejson = await response.json();
          if (responsejson.status) {
            Swal.fire({
              icon: "success",
              html: "<strong>" + messages.formsubmitsuccessfull + "</strong>",
              padding: "0px 0px 20px 0px",
              showConfirmButton: false,
              width: "350px",
              allowOutsideClick: () => {
                Swal.close();
                return false; // Explicitly return false to handle `allowOutsideClick`.
              },
            });
            setEbultenMail("");
          } else {
            Swal.fire({
              icon: "error",
              html: "<strong>" + messages.formsubmitfailed + "</strong>",
              padding: "0px 0px 20px 0px",
              showConfirmButton: false,
              width: "350px",
              allowOutsideClick: () => {
                Swal.close();
                return false;
              },
            });
          }
        } else {
          console.log("Form gönderiminde bir hata oluştu.");
        }
      } catch (error) {
        console.error("Hata:", error);
      }
    };

    gfetch();
  };

  return (
    <footer>
      <Box style={{ background: "#414141" }}>
        <Container maxW="1200">
          <Grid
            className="footermenu"
            templateColumns="repeat(4, 1fr)"
            py={{ base: 6, lg: "3em" }}
            gap={3}
          >
            <Flex
              direction={{ lg: "column", base: "row" }}
              w={{ lg: 250, base: "100%" }}
              me={{ base: 0, lg: 20 }}
            >
              <Image
                maxW={{ lg: "100%", base: "50%" }}
                src={"/altlogo.png"}
                pb={2}
                className="footerlogo"
                flex={1}
              />
              <Flex
                direction={"column"}
                gap={2}
                justifyContent={"center"}
                mt={5}
                flex={1}
                wrap={"wrap"}
                alignSelf={"center"}
              >
                <Flex
                  direction={"row"}
                  alignItems={"center"}
                  justifyContent={"center"}
                  gap={2}
                >
                  <Link href={setting.facelink}>
                    <Box bg={"#fff"} p={2} fontSize={12} borderRadius="full">
                      <FaFacebookF color={"#000"} />
                    </Box>
                  </Link>
                  <Link href={setting.twitterlink}>
                    <Box bg={"#fff"} p={2} fontSize={12} borderRadius="full">
                      <FaTwitter color={"#000"} />
                    </Box>
                  </Link>
                  <Link href={setting.instagramlink}>
                    <Box bg={"#fff"} p={2} fontSize={12} borderRadius="full">
                      <FaInstagram color={"#000"} />
                    </Box>
                  </Link>
                  <Link href={setting.youtubelink}>
                    <Box bg={"#fff"} p={2} fontSize={12} borderRadius="full">
                      <FaYoutube color={"#000"} />
                    </Box>
                  </Link>
                </Flex>
              </Flex>
            </Flex>
            <Flex direction={"row"}>
              <Box flex={1}>
                <Text color={"#fff"} fontSize={16} fontWeight={600} mb={5}>
                  {messages["header"].onlinedonate}
                </Text>
                <Flex pl={{ base: 5, lg: 0 }}>
                  <ul style={{ padding: 0, listStyleType: "none" }}>
                    {bagislar &&
                      bagislar.length > 0 &&
                      bagislar.slice(0, 6).map((post, index) => (
                        <Link key={index} href={dil + "/" + post.url}>
                          <li
                            style={{
                              color: "white",
                              fontWeight: "300",
                              fontSize: 14,
                              marginBottom: "10px",
                            }}
                          >
                            {post.name}
                          </li>
                        </Link>
                      ))}
                  </ul>
                </Flex>
              </Box>
            </Flex>
            <Flex>
              <Box flex={1}>
                <Text color={"#fff"} fontSize={16} fontWeight={600} mb={5}>
                  {messages.informations}
                </Text>
                <Flex pl={{ base: 5, lg: 0 }}>
                  <ul style={{ padding: 0, listStyleType: "none" }}>
                    {menuDataFetch &&
                      menuDataFetch.map((component, index) => {
                        if (component.menuler) {
                          return (
                            <Link
                              key={index}
                              href={dil + "/" + component.menuler[0].url}
                            >
                              <li
                                style={{
                                  color: "white",
                                  fontWeight: "300",
                                  fontSize: 14,
                                  marginBottom: "10px",
                                }}
                              >
                                {component.menubaslik}
                              </li>
                            </Link>
                          );
                        }
                      })}
                  </ul>
                </Flex>
              </Box>
            </Flex>
            <Box>
              <Text color={"#fff"} fontSize={16} fontWeight={600} mb={5}>
                {messages.newslettertitle}
              </Text>
              <Flex
                direction={"row"}
                borderWidth={2}
                borderStyle={"solid"}
                borderColor={"white"}
                borderRadius={10}
                overflow={"hidden"}
              >
                <Input
                  placeholder="Email"
                  py={8}
                  _placeholder={{ color: "white" }}
                  color={"white"}
                  value={ebultenMail}
                  style={{ borderWidth: 0 }}
                  onChange={(e) => setEbultenMail(e.target.value)}
                />
                <Button
                  borderRadius={0}
                  bg={"#C98624"}
                  color={"white"}
                  py={8}
                  px={10}
                  onClick={() => Gonder()}
                >
                  {messages.submit}
                </Button>
              </Flex>
              <Flex direction={"column"} gap={2} mt={7} pb={5}>
                <Text color={"white"} fontSize={15}>
                  {setting.telefon}
                </Text>
                <Text color={"white"} fontSize={15}>
                  {setting.email}
                </Text>
              </Flex>
            </Box>
          </Grid>
        </Container>
      </Box>
      <Box style={{ background: "#C98624" }} py={3}>
        <Container
          maxW="1200"
          display={"flex"}
          flexDir={"row"}
          justifyContent={"space-between"}
        >
          <Text color={"white"} fontSize={12}>
            © {setting.title} {new Date().getFullYear()} {messages.copyright}
          </Text>
          <Text color={"white"} fontSize={12}>
            Design By Tuşsesleri
          </Text>
        </Container>
      </Box>

      <HizliBagis />

      <Box
        style={{
          padding: 10,
          position: "fixed",
          right: 30,
          borderRadius: 50,
          background: "#25d366",
          boxShadow: "2px 2px 3px #999",
        }}
        bottom={{ base: 70, lg: 30 }}
      >
        <Link
          href={
            "https://api.whatsapp.com/send?phone=" +
            whatsappnumara +
            "&text=" +
            whatsappfixmsg
          }
        >
          <FaWhatsapp size={34} color={"#fff"} />
        </Link>
      </Box>
    </footer>
  );
}
