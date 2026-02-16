"use client";
import { useState } from "react";
import {
  Container,
  Image,
  Box,
  Text,
  Button,
  Input,
  Flex,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Progress,
} from "@chakra-ui/react";
import { BsBalloonHeartFill } from "react-icons/bs";
import { BsFillShareFill } from "react-icons/bs";
import { useModal } from "./ModalContext";
import { RiHeartAddLine } from "react-icons/ri";
import { MdAddShoppingCart } from "react-icons/md";
import { RiUserHeartLine } from "react-icons/ri";
import { IoIosArrowDown } from "react-icons/io";
import { useSelector } from "react-redux";
import { useLanguage } from "@/main/utilities/language";
import PopupSosyalMedyaPaylas from "@/components/PopupSosyalMedyaPaylas";
import { useAuth } from "../../components/LayoutProvider";
const BagisKutuButtonComponent = ({
  bagisid,
  renkler,
  bagisfiyat,
  bagistipi,
  goruntuleme,
  bagisItem,
  type,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [fiyat, setFiyat] = useState();
  const [secilenfiyat, setSecilenFiyat] = useState("");
  const [modaldisplayac, setModalDisplayAc] = useState("");
  const { showModal, sepeteEkle } = useModal();
  const { name, email, gsm } = useSelector((state) => state.oturum);
  let messages = useLanguage();
  const { parabirimLabel, parabirimi } = useAuth();

  const modalac = (bagisyapmatipi = 0) => {
    let fiyatmodal;
    if (bagistipi == "1") {
      fiyatmodal = fiyat;
    } else {
      fiyatmodal = fiyat;
    }
    showModal(fiyatmodal, bagisid, bagistipi, bagisItem, "", bagisyapmatipi);
  };

  const sepeteekle = (yonlendirme) => {
    let fiyatmodal;
    if (bagistipi == "1") {
      fiyatmodal = fiyat;
    } else {
      fiyatmodal = fiyat;
    }
    /*if(name == "" && email == "" && gsm == ""){
            modalac();
        }else{*/
    sepeteEkle(fiyatmodal, bagisid, bagistipi, bagisItem, "", yonlendirme);
    //}
  };

  const fiyatguncelle = (fiyat, index, e = null) => {
    setFiyat(fiyat);
    if (!index && e) {
      setFiyat(e.target.value);
    } else {
      if (secilenfiyat === index) {
        setSecilenFiyat(null);
        setFiyat(0); // Tutarı sıfırlar
      } else {
        setSecilenFiyat(index); // Tıklanan kutunun indeksini günceller
      }
    }
  };

  const fiyatguncelleinput = (e) => {
    const inputValue = e.target.value;
    if (/^\d*$/.test(inputValue)) {
      setFiyat(inputValue);
      fiyatguncelle(inputValue, null, e); // fiyatguncelle'ye değerleri geçir
    }
  };

  if (renkler == null) {
    renkler = {
      parabirimi: "#C98624",
      fiyat: "#FFE6C1",
      fiyattext: "#C98624",
      fiyathover: "#C98624",
      fiyattexthover: "#FFFFFF",
      input: "#FFE6C1",
      inputplaceholder: "#EAA034",
    };
  }
  let onerilenfiyatlar;
  if (bagisItem.onerilenfiyatlar != null) {
    onerilenfiyatlar = bagisItem.onerilenfiyatlar.split(",");
  }
  const progressbar = (totalDonateSuccessCalc) => {
    return (
      <Progress
        my={5}
        mb={3}
        minH={"8px"}
        overflow={"visible"}
        w={"100%"}
        height={"8px"}
        colorScheme={"sky"}
        bg={"#FFC7A9"}
        value={totalDonateSuccessCalc}
        borderRadius={10}
        sx={{
          "div[role=progressbar]": {
            height: "8px",
            backgroundColor: "#F36E26",
          },
        }}
      />
    );
  };

  const handleKeyDown = (event) => {
    const invalidChars = ["+", "-"]; // + ve - karakterlerine izin verme
    if (invalidChars.includes(event.key)) {
      event.preventDefault();
    }
  };
  if (bagistipi == 1) {
    return (
      <Box>
        <Flex direction="row" gap={"1"} mt={5}>
          <Box className="parabirimi" color={renkler.parabirimi}>
            {bagisItem.tutar} {parabirimLabel} x
          </Box>
          <Box
            className={`hizlibagisfiyat ${
              secilenfiyat === 0 ? "hizlibagisfiyatsecilen" : ""
            }`}
            bg={renkler.fiyat}
            color={renkler.fiyattext}
            onClick={() => fiyatguncelle("1", 0)}
          >
            1
          </Box>
          <Box
            className={`hizlibagisfiyat ${
              secilenfiyat === 1 ? "hizlibagisfiyatsecilen" : ""
            }`}
            bg={renkler.fiyat}
            color={renkler.fiyattext}
            onClick={() => fiyatguncelle("2", 1)}
          >
            2
          </Box>
          <Box
            className={`hizlibagisfiyat ${
              secilenfiyat === 2 ? "hizlibagisfiyatsecilen" : ""
            }`}
            bg={renkler.fiyat}
            color={renkler.fiyattext}
            onClick={() => fiyatguncelle("3", 2)}
          >
            3
          </Box>
          <Box>
            <Input
              className="tutargiriniz"
              placeholder={messages["bagislar"].enterthequantity}
              _placeholder={{ fontSize: 12, color: renkler.inputplaceholder }}
              bg={renkler.input}
              border={0}
              height={"100%"}
              width={110}
              value={fiyat}
              onChange={fiyatguncelleinput}
              onKeyDown={handleKeyDown}
            />
          </Box>
        </Flex>
        <Flex
          direction="row"
          gap={2}
          style={{ position: "relative", marginTop: 15 }}
        >
          <Button
            flex={1}
            h={38}
            leftIcon={<MdAddShoppingCart color={"white"} size={20} />}
            colorScheme="green"
            bg={"#D08E30"}
            color={"white"}
            size="md"
            px="12"
            fontSize={11}
            boxShadow="inner"
            onClick={() => sepeteekle(false)}
          >
            {messages["bagislar"].addtocart}
          </Button>

          <Menu isOpen={isOpen}>
            <MenuButton
              h={38}
              leftIcon={<RiHeartAddLine color={"white"} size={18} />}
              rightIcon={
                <IoIosArrowDown
                  color="white"
                  size={18}
                  className="mobilehide"
                />
              }
              colorScheme="green"
              bg={"#AA422F"}
              color={"white"}
              fontSize={11}
              boxShadow="inner"
              onClick={() => sepeteekle(true)}
              as={Button}
              onMouseEnter={onOpen}
              onMouseLeave={onClose}
              _hover={{
                background: "#085465",
              }}
              borderBottomLeftRadius={isOpen ? 0 : "md"}
              borderBottomRightRadius={isOpen ? 0 : "md"}
              _active={{ background: "#085465" }}
              transition={"all .5s"}
            >
              {messages["bagislar"].donatenow}
            </MenuButton>
            <MenuList
              display={{ base: "none", lg: "block" }}
              minWidth={175}
              h={38}
              onMouseEnter={onOpen}
              onMouseLeave={onClose}
              bg={"#3c1289"}
              p={0}
              style={{ marginTop: -8, width: "90px" }}
              overflow={"hidden"}
              borderRadius={"0px 15px"}
              borderWidth={0}
              _hover={{
                background: "#3c1289",
              }}
              px={1}
            >
              <MenuItem
                h={38}
                fontSize={11}
                bg={"#3c1289"}
                color={"white"}
                as={Button}
                icon={<RiUserHeartLine size={18} />}
                _hover={{ background: "#3c1289" }}
                onClick={() => modalac("1", bagisItem, bagisItem, bagistipi)}
                textTransform={"uppercase"}
              >
                {messages.dodonategift}
              </MenuItem>
            </MenuList>
          </Menu>
          <PopupSosyalMedyaPaylas url={bagisItem.url} baslik={bagisItem.name} />
        </Flex>
      </Box>
    );
  } else {
    return (
      <Box>
        {bagisItem.type == "4" && // EĞER DETAY SAYFASINDAYSAK BURASI GÖZÜKÜYOR
          type != "onlybuttons" && (
            <>
              {progressbar(bagisItem.totalDonateSuccessCalc)}
              <Flex direction={"row"} justifyContent={"space-between"}>
                <Box>
                  <Text fontSize={18} color="#F36E26" fontWeight={600}>
                    {bagisItem.totalDonate} {parabirimLabel}
                  </Text>
                  <Text fontSize={12} color="#F36E26" fontWeight={600}>
                    {messages["bagislar"].target}: {bagisItem.hedeflenentutar}{" "}
                    {parabirimLabel}
                  </Text>
                </Box>
                <Box>
                  <Text
                    fontSize={18}
                    color="#F36E26"
                    textAlign={"right"}
                    fontWeight={600}
                  >
                    {bagisItem.member}
                  </Text>
                  <Text
                    fontSize={12}
                    color="#F36E26"
                    textAlign={"right"}
                    fontWeight={600}
                  >
                    {messages["bagislar"].donetor}
                  </Text>
                </Box>
              </Flex>
            </>
          )}
        {bagisItem.onerilenfiyatlar ? (
          <Flex direction="row" gap={"1"} mt={5}>
            <Box className="parabirimi" color={renkler.parabirimi}>
              {parabirimLabel}
            </Box>
            {onerilenfiyatlar.slice(0, 3).map((post, index) => (
              <Box
                key={index}
                className={`hizlibagisfiyat ${
                  secilenfiyat === index ? "hizlibagisfiyatsecilen" : ""
                }`}
                bg={renkler.fiyat}
                color={renkler.fiyattext}
                onClick={() => fiyatguncelle(post, index)}
              >
                {post}
              </Box>
            ))}
            <Box>
              <Input
                type="number"
                className="tutargiriniz"
                placeholder={messages["bagislar"].entertheamount}
                _placeholder={{ fontSize: 12, color: renkler.inputplaceholder }}
                bg={renkler.input}
                border={0}
                height={"100%"}
                width={110}
                value={fiyat}
                onChange={fiyatguncelleinput}
                onKeyDown={handleKeyDown}
              />
            </Box>
          </Flex>
        ) : (
          <Flex direction="row" gap={"1"} mt={5}>
            <Box className="parabirimi" color={renkler.parabirimi}>
              {parabirimLabel}
            </Box>
            <Box
              className={`hizlibagisfiyat ${
                secilenfiyat === 0 ? "hizlibagisfiyatsecilen" : ""
              }`}
              bg={renkler.fiyat}
              color={renkler.fiyattext}
              onClick={() => fiyatguncelle("5", 0)}
            >
              5
            </Box>
            <Box
              className={`hizlibagisfiyat ${
                secilenfiyat === 1 ? "hizlibagisfiyatsecilen" : ""
              }`}
              bg={renkler.fiyat}
              color={renkler.fiyattext}
              onClick={() => fiyatguncelle("20", 1)}
            >
              20
            </Box>
            <Box
              className={`hizlibagisfiyat ${
                secilenfiyat === 2 ? "hizlibagisfiyatsecilen" : ""
              }`}
              bg={renkler.fiyat}
              color={renkler.fiyattext}
              onClick={() => fiyatguncelle("50", 2)}
            >
              50
            </Box>
            <Box>
              <Input
                type="number"
                className="tutargiriniz"
                placeholder={messages["bagislar"].entertheamount}
                _placeholder={{ fontSize: 12, color: renkler.inputplaceholder }}
                bg={renkler.input}
                border={0}
                height={"100%"}
                width={110}
                value={fiyat}
                onChange={fiyatguncelleinput}
                onKeyDown={handleKeyDown}
              />
            </Box>
          </Flex>
        )}
        <Flex
          direction="row"
          gap={2}
          style={{ position: "relative", marginTop: 15 }}
          flexWrap={"wrap"}
        >
          <Button
            flex={1}
            h={38}
            leftIcon={<MdAddShoppingCart color={"white"} size={20} />}
            colorScheme="green"
            bg={"#D08E30"}
            color={"white"}
            size="md"
            px="12"
            fontSize={11}
            boxShadow="inner"
            onClick={() => sepeteekle(false)}
          >
            {messages["bagislar"].addtocart}
          </Button>

          {goruntuleme == "detay" ? ( // EĞER DETAY SAYFASINDAYSAK BURASI GÖZÜKÜYOR
            <>
              <Menu isOpen={isOpen}>
                <MenuButton
                  h={38}
                  leftIcon={<RiHeartAddLine color={"white"} size={18} />}
                  rightIcon={
                    <IoIosArrowDown
                      color="white"
                      size={18}
                      className="mobilehide"
                    />
                  }
                  colorScheme="green"
                  bg={"#AA422F"}
                  color={"white"}
                  fontSize={11}
                  boxShadow="inner"
                  onClick={() => sepeteekle(true)}
                  as={Button}
                  onMouseEnter={onOpen}
                  onMouseLeave={onClose}
                  _hover={{
                    background: "#085465",
                  }}
                  borderBottomLeftRadius={isOpen ? 0 : "md"}
                  borderBottomRightRadius={isOpen ? 0 : "md"}
                  _active={{ background: "#085465" }}
                  transition={"all .5s"}
                >
                  {messages["bagislar"].donatenow}
                </MenuButton>
                <MenuList
                  display={{ base: "none", lg: "block" }}
                  minWidth={175}
                  h={38}
                  onMouseEnter={onOpen}
                  onMouseLeave={onClose}
                  bg={"#3c1289"}
                  p={0}
                  style={{ marginTop: -8, width: "90px" }}
                  overflow={"hidden"}
                  borderRadius={"0px 15px"}
                  borderWidth={0}
                  _hover={{
                    background: "#3c1289",
                  }}
                  px={1}
                >
                  <MenuItem
                    h={38}
                    fontSize={11}
                    bg={"#3c1289"}
                    color={"white"}
                    as={Button}
                    icon={<RiUserHeartLine size={18} />}
                    _hover={{ background: "#3c1289" }}
                    onClick={() => modalac(1, bagisItem, bagisItem, bagistipi)}
                    textTransform={"uppercase"}
                  >
                    {messages.dodonategift}
                  </MenuItem>
                </MenuList>
              </Menu>
            </>
          ) : (
            <Button
              flex={2}
              h={38}
              leftIcon={<RiHeartAddLine color={"white"} size={20} />}
              colorScheme="green"
              bg={"#AA422F"}
              color={"white"}
              fontSize={11}
              boxShadow="inner"
              onClick={() => sepeteekle(true)}
            >
              {messages["bagislar"].donatenow}
            </Button>
          )}
          <PopupSosyalMedyaPaylas url={bagisItem.url} baslik={bagisItem.name} />
          {goruntuleme == "detay" && (
            <Button
              display={{ base: "flex", lg: "none" }}
              alignItems={"center"}
              alignContent={"center"}
              h={38}
              fontSize={11}
              bg={"#3c1289"}
              color={"white"}
              leftIcon={<RiUserHeartLine size={18} />}
              onClick={() => modalac("1", bagisItem, bagisItem, bagistipi)}
              textTransform={"uppercase"}
            >
              {messages.dodonategift}
            </Button>
          )}
        </Flex>
      </Box>
    );
  }
};

export default BagisKutuButtonComponent;
