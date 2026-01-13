"use client";
import React, { useState, useEffect } from "react";
import {
  Grid,
  Box,
  Text,
  Flex,
  Image,
  Select,
  Input,
  Button,
} from "@chakra-ui/react";
import { language } from "@/main/utilities/languageS";
import { useModal } from "@/main/ModalContext";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { MdAddShoppingCart } from "react-icons/md";
import { HiArrowLongRight } from "react-icons/hi2";
import BASE_API_URL from "@/main/utilities/config";
import Link from "next/link";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import { useAuth } from "@/components/LayoutProvider";
export default function SlaytHizliBagis() {
  const [bagislar, setBagislar] = useState({});
  const [fiyat, setFiyat] = useState();
  const [secilenFiyat, setSecilenFiyat] = useState("");
  const [secilenBagis, setSecilenBagis] = useState("");
  const [onerilenFiyatlar, setOnerilenFiyatlar] = useState("");
  const [secilenBagisTipi, setSecilenBagisTipi] = useState();
  const [secilenBagisItem, setSecilenBagisItem] = useState();
  const { showModal, sepeteEkle } = useModal();

  const { name, email, gsm } = useSelector((state) => state.oturum);
  const { parabirimi, parabirimLabel } = useAuth();

  let message = useLanguage();
  let dil = useLanguageBelirtec();
  let dilfetch = dil.replace("/", "");
  if (dilfetch == "") {
    dilfetch = "tr";
  }

  let postimg;

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

      // Veriyi JSON formatına dönüştür
      let posts = await response.json();

      return posts;
    };

    const fetchData = async () => {
      let bdata = await bagislarfetch(); // `await` ekleniyor
      let bdatatumu = bdata["data"];
      const filteredData = bdatatumu.filter(
        (item) =>
          Array.isArray(item.simge) && item.simge.some((s) => s.key === "2")
      );
      setBagislar(filteredData); // State'i burada güncelle
    };

    fetchData(); // Fetch işlemini başlat
  }, []);

  const fiyatguncelle = (fiyat, index, e = null) => {
    setFiyat(fiyat);
    if (!index && e) {
      setFiyat(e.target.value);
    } else {
      if (secilenFiyat === index) {
      } else {
        setSecilenFiyat(index); // Tıklanan kutunun indeksini günceller
      }
    }
    console.log(fiyat);
  };

  const fiyatguncelleinput = (e) => {
    const inputValue = e.target.value;
    setFiyat(inputValue);
    fiyatguncelle(inputValue, null, e); // fiyatguncelle'ye değerleri geçir
  };

  const modalac = (bagisyapmatipi = 0) => {
    showModal(fiyat, secilenBagis, secilenBagisTipi, secilenBagisItem);
  };

  const sepeteekle = () => {
    let yonlendirmeDurumu = true;
    if (!secilenBagis) {
      Swal.fire({
        icon: "error",
        html: "<strong>Lütfen bir bağış türü seçiniz</strong>",
        padding: "0px 0px 20px 0px",
        showConfirmButton: false,
        width: "350px",
        allowOutsideClick: () => {
          Swal.close();
          return false;
        },
      });
      return false;
    }
    /*if(name == "" && email == "" && gsm == ""){
            modalac();
        }else{
            sepeteEkle(fiyat,secilenBagis,secilenBagisTipi,secilenBagisItem); //fiyat,bagistoken,bagistipi,bagisItem
        }*/
    sepeteEkle(
      fiyat,
      secilenBagis,
      secilenBagisTipi,
      secilenBagisItem,
      "",
      yonlendirmeDurumu
    ); //fiyat,bagistoken,bagistipi,bagisItem
  };

  const secilenbagisiayarla = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex]; // Seçilen <option>
    if (selectedOption != 0) {
      // data_tip ve data_item değerlerini almak
      const dataTip = selectedOption.getAttribute("data_tip");
      const dataItem = selectedOption.getAttribute("data_item");
      const dataItemJson = JSON.parse(dataItem);
      let onerilenFiyatlardata = dataItemJson.onerilenfiyatlar
        ? dataItemJson.onerilenfiyatlar.split(",")
        : {};

      // state güncellemeler  i
      setSecilenBagisTipi(dataTip);
      setSecilenBagisItem(dataItemJson); // JSON string'i nesneye dönüştürme
      setSecilenBagis(e.target.value); // Seçilen değeri almak
      setOnerilenFiyatlar({
        status: dataItemJson.onerilenfiyatlar ? true : false,
        data: onerilenFiyatlardata,
      });
    }
  };

  return (
    <>
      <Flex
        display={{ base: "none", lg: "flex" }}
        direction={"row"}
        width={{ base: "100%", lg: "100%" }}
        mt={3}
      >
        <Flex
          display={{ base: "none", lg: "block" }}
          direction={"column"}
          p={5}
          px={8}
          className="hizlibagisicongradient"
          borderRadius={70}
          zIndex={9}
          alignItems={"center"}
          justifyContent={"center"}
        >
          <Image
            src={"/logosimge.png"}
            width={88}
            height={98}
            display={{ base: "none", lg: "block" }}
            objectFit="cover"
          />
          <Text
            fontSize={28}
            fontWeight={600}
            color={"#AA422F"}
            textAlign={"center"}
            lineHeight={"130%"}
            textTransform={"uppercase"}
          >
            {message.quick}
          </Text>
          <Text
            fontSize={22}
            fontWeight={600}
            color={"#FFF"}
            textAlign={"center"}
            lineHeight={"130%"}
            textTransform={"uppercase"}
          >
            {message.donation}
          </Text>
        </Flex>
        <Flex
          width={{ base: "100%", lg: "auto" }}
          py={5}
          px={5}
          ps={{ base: "25px", lg: "90px" }}
          ms={{ base: 0, lg: "-70px" }}
          flex={1}
          gap={2}
          direction={"column"}
          className="hizlibagisgradient"
          pe={8}
        >
          <Flex direction={"row"}>
            <Text
              color={"#CE8B2B"}
              fontWeight={600}
              textTransform={"uppercase"}
            >
              {message.donatefast}
            </Text>
          </Flex>
          <Select
            w={"100%"}
            mt={3}
            boxShadow="xs"
            bg={"#fff"}
            fontSize={14}
            color={"#CDCDCD"}
            rounded="md"
            size="lg"
            borderWidth={0}
            sx={{ option: { color: "black" } }}
            onChange={(e) => secilenbagisiayarla(e)}
          >
            <option selected>{message.choose}</option>
            {bagislar &&
              bagislar.length > 0 &&
              bagislar.map((post, index) => (
                <option
                  key={index}
                  data_tip={post.kind}
                  data_item={JSON.stringify(post)}
                  value={post.token}
                >
                  {post.name}
                </option>
              ))}
          </Select>
          <Flex
            direction={"row"}
            alignItems={"center"}
            justifyContent={"flex-start"}
            gap={3}
            py={2}
            fontWeight={"bold"}
          >
            <Text color={"#D08E30"} fontSize={14}>
              {secilenBagisItem?.kind == "1" ? (
                <div>
                  {secilenBagisItem.tutar} {parabirimLabel} x
                </div>
              ) : (
                <div>{parabirimLabel}</div>
              )}
            </Text>
            {onerilenFiyatlar.status ? (
              <>
                {onerilenFiyatlar.data.slice(0, 5).map((post, index) => (
                  <Box
                    key={index}
                    className={`hizlibagisfiyat ${
                      secilenFiyat === index ? "hizlibagisfiyatsecilen" : ""
                    }`}
                    bg={"#FFE6C1"}
                    p={2}
                    px={2}
                    borderRadius={5}
                    color={"#D08E30"}
                    fontSize={11}
                    onClick={() => fiyatguncelle(post, index)}
                  >
                    {post}
                  </Box>
                ))}
              </>
            ) : secilenBagisItem?.kind == 1 ? (
              <>
                <Box
                  className={` ${
                    secilenFiyat === 0 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  textAlign={"center"}
                  width={30}
                  fontSize={11}
                  onClick={() => fiyatguncelle("1", 0)}
                  display={{ base: "none", lg: "block" }}
                >
                  1
                </Box>
                <Box
                  className={` ${
                    secilenFiyat === 1 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  textAlign={"center"}
                  width={30}
                  fontSize={11}
                  onClick={() => fiyatguncelle("2", 1)}
                  display={{ base: "none", lg: "block" }}
                >
                  2
                </Box>
                <Box
                  className={` ${
                    secilenFiyat === 2 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  textAlign={"center"}
                  width={30}
                  fontSize={11}
                  onClick={() => fiyatguncelle("3", 2)}
                  display={{ base: "none", lg: "block" }}
                >
                  3
                </Box>
                <Box
                  className={` ${
                    secilenFiyat === 3 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  textAlign={"center"}
                  width={30}
                  fontSize={11}
                  onClick={() => fiyatguncelle("4", 3)}
                  display={{ base: "none", lg: "block" }}
                >
                  4
                </Box>
              </>
            ) : (
              <>
                <Box
                  className={` ${
                    secilenFiyat === 0 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("20", 0)}
                  display={{ base: "none", lg: "block" }}
                >
                  20
                </Box>
                <Box
                  className={`hizlibagisfiyat ${
                    secilenFiyat === 1 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("50", 1)}
                  display={{ base: "none", lg: "block" }}
                >
                  50
                </Box>
                <Box
                  className={`hizlibagisfiyat ${
                    secilenFiyat === 2 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("100", 2)}
                  display={{ base: "none", lg: "block" }}
                >
                  100
                </Box>
                <Box
                  className={`hizlibagisfiyat ${
                    secilenFiyat === 3 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("150", 3)}
                  display={{ base: "none", lg: "block" }}
                >
                  150
                </Box>
                <Box
                  className={`hizlibagisfiyat ${
                    secilenFiyat === 4 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("200", 4)}
                  display={{ base: "none", lg: "block" }}
                >
                  200
                </Box>
                <Box
                  className={`hizlibagisfiyat ${
                    secilenFiyat === 4 ? "hizlibagisfiyatsecilen" : ""
                  }`}
                  bg={"#FFE6C1"}
                  p={2}
                  px={2}
                  borderRadius={5}
                  color={"#D08E30"}
                  fontSize={11}
                  onClick={() => fiyatguncelle("250", 5)}
                  display={{ base: "none", lg: "block" }}
                >
                  250
                </Box>
              </>
            )}
            <Input
              placeholder={message.entertheamount}
              bg={"#FFE6C1"}
              _placeholder={{ color: "#D08E30", fontSize: 12 }}
              color={"#a76200"}
              width={{ base: "100%", lg: 90 }}
              height={30}
              p={4}
              px={2}
              borderWidth={0}
              value={fiyat}
              onChange={fiyatguncelleinput}
            />
          </Flex>
          <Flex direction={"row"} justifyContent={"flex-end"} gap={3}>
            <Button
              rightIcon={<MdAddShoppingCart size={18} />}
              bg={"#D08E30"}
              colorScheme="orange"
              p={3}
              px={4}
              fontSize={11}
              onClick={() => sepeteekle()}
            >
              {message.add}
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
}
