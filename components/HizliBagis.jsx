"use client";
import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Slide,
  useBreakpointValue,
  Flex,
  Select,
  Input,
  useOutsideClick,
  Text,
} from "@chakra-ui/react";
import { MdAddShoppingCart } from "react-icons/md";
import { IoCloseSharp } from "react-icons/io5";

import { useModal } from "@/main/ModalContext";
import { useSelector } from "react-redux";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import { useAuth } from "@/components/LayoutProvider";
import Swal from "sweetalert2";

export default function QuickDonateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [bagislar, setBagislar] = useState({});
  const [fiyat, setFiyat] = useState();
  const [secilenFiyat, setSecilenFiyat] = useState("");
  const [secilenBagis, setSecilenBagis] = useState("");
  const [secilenBagisTipi, setSecilenBagisTipi] = useState();
  const [secilenBagisItem, setSecilenBagisItem] = useState();
  const { showModal, sepeteEkle } = useModal();
  const { parabirimLabel } = useAuth();
  const { name, email, gsm, parabirimi } = useSelector((state) => state.oturum);
  const [onerilenFiyatlar, setOnerilenFiyatlar] = useState("");

  const ref = useRef();

  let messages = useLanguage();
  let dil = useLanguageBelirtec();
  let dilfetch = dil;
  dilfetch = dilfetch.replace("/", "");
  if (dil == "") {
    dilfetch = "tr";
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
      let bdatatumu = bdata["data"];
      if (bdata && bdata.status && bdata.data.length > 0) {
        const filteredData = bdatatumu.filter(
          (item) =>
            Array.isArray(item.simge) && item.simge.some((s) => s.key === "2")
        );
        setBagislar(filteredData);
      }
    };

    fetchData();
  }, []);

  const secilenbagisiayarla = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    if (selectedOption != 0) {
      // data_tip ve data_item değerlerini almak
      const dataTip = selectedOption.getAttribute("data_tip");
      const dataItem = selectedOption.getAttribute("data_item");
      const dataItemJson = JSON.parse(dataItem);
      let onerilenFiyatlardata = dataItemJson.onerilenfiyatlar
        ? dataItemJson.onerilenfiyatlar.split(",")
        : {};
      console.log("dataItemJson", dataItemJson);
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

  const fiyatguncelle = (fiyat, index, e = null) => {
    setFiyat(fiyat);
    if (secilenFiyat === index) {
    } else {
      setSecilenFiyat(index);
    }
  };

  const fiyatguncelleinput = (e) => {
    const inputValue = e.target.value;
    setFiyat(inputValue);
    fiyatguncelle(inputValue, null, e);
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

    sepeteEkle(
      fiyat,
      secilenBagis,
      secilenBagisTipi,
      secilenBagisItem,
      "",
      yonlendirmeDurumu
    ); //fiyat,bagistoken,bagistipi,bagisItem

    /*if(name == "" && email == "" && gsm == ""){
              modalac();
          }else{
              sepeteEkle(fiyat,secilenBagis,secilenBagisTipi,secilenBagisItem,"",yonlendirmeDurumu); //fiyat,bagistoken,bagistipi,bagisItem
          }*/
  };

  useOutsideClick({
    ref: ref,
    handler: () => setIsOpen(false),
  });

  useEffect(() => {
    console.log("secilenBagisItem", secilenBagisItem);
  }, [secilenBagisItem]);

  return (
    <>
      {isMobile && (
        <Box
          position="fixed"
          bottom="0"
          left="0"
          width="100%"
          bg="white"
          p={2}
          boxShadow="0 -2px 6px rgba(0,0,0,0.1)"
          zIndex={1000}
        >
          <Button
            background="#cf8f33"
            color={"white"}
            width="100%"
            onClick={() => setIsOpen(true)}
          >
            Hızlı Bağış Yap
          </Button>
        </Box>
      )}

      <Slide
        direction="bottom"
        className="hizlibagismodal"
        in={isOpen}
        style={{
          zIndex: 1001,
        }}
        boxShadow="1px -3px 17px 6px rgba(0,0,0,0.99)"
      >
        <Box
          ref={ref}
          p={6}
          bg="gray.100"
          shadow="md"
          borderTopRadius="md"
          textAlign="center"
          style={{
            boxShadow: "box-shadow: 1px -3px 17px 6px rgba(0,0,0,0.99)",
          }}
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Box width={"100%"} className="hizlibagisselectboxarea">
              <Flex
                width={"100%"}
                direction={"row"}
                justifyContent={"space-between"}
                alignItems={"center"}
                pb={5}
              >
                <Text fontSize={16} fontWeight={600} color={"#6B6B6B"} my={2}>
                  {messages.quick} {messages.donation}
                </Text>
                <Button
                  size="xs"
                  colorScheme="red"
                  onClick={() => setIsOpen(false)}
                >
                  <IoCloseSharp size={18} />
                </Button>
              </Flex>

              <Select
                className="hizlibagisselectbox"
                w={"100%"}
                boxShadow="xs"
                fontSize={14}
                color={"#CDCDCD"}
                rounded="md"
                size="lg"
                borderWidth={0}
                sx={{
                  background: "white",
                  color: "black",
                }}
                onChange={(e) => secilenbagisiayarla(e)}
              >
                <option value="" selected>
                  {messages.choose}
                </option>
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
              <Flex>
                <Flex
                  direction={"row"}
                  alignItems={"center"}
                  justifyContent={"flex-start"}
                  gap={3}
                  mt={3}
                  py={2}
                  fontWeight={"bold"}
                >
                  <Text
                    color={"#D08E30"}
                    fontSize={14}
                    display={"flex"}
                    gap={"8"}
                    whiteSpace={"pre"}
                    flexDirection={"row"}
                  >
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
                            secilenFiyat === index
                              ? "hizlibagisfiyatsecilen"
                              : ""
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
                  ) : secilenBagisItem?.kind == "1" ? (
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
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
                        display={{ base: "block", lg: "block" }}
                      >
                        250
                      </Box>
                    </>
                  )}
                  <Input
                    placeholder={messages.entertheamount}
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
              </Flex>
              <Button
                width={"100%"}
                rightIcon={<MdAddShoppingCart size={18} />}
                bg={"#000"}
                colorScheme="blue"
                background={"maincolor"}
                p={1}
                fontSize={14}
                mt={2}
                onClick={() => sepeteekle()}
                textTransform={"uppercase"}
              >
                {messages.donatenow}
              </Button>
            </Box>
          </Flex>
        </Box>
      </Slide>
    </>
  );
}
