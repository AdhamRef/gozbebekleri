"use client";
import React from "react";
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
} from "@chakra-ui/react";
import { BsFillPersonFill, BsSearch, BsBank } from "react-icons/bs";
import { PiMosque } from "react-icons/pi";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";

import { FaHands } from "react-icons/fa6";
import { IoIosArrowDown } from "react-icons/io";
import Link from "next/link";
import { TbWorld } from "react-icons/tb";
import { MdSms } from "react-icons/md";
import { FaRegCalendarCheck } from "react-icons/fa6";
import { MdAccountBalance } from "react-icons/md";
import { RiUserHeartLine } from "react-icons/ri";
import { GiPayMoney } from "react-icons/gi";
import { useLanguage, useLanguageBelirtec } from "@/main/utilities/language";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/LayoutProvider";

export default function HeaderButonlarMobil({ buttonadi }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  let messages = useLanguage();
  let dil = useLanguageBelirtec();
  const { settings } = useAuth();

  if (buttonadi == "bagisyap") {
    return (
      <Menu>
        <MenuButton
          className="bagisyapbutton"
          //leftIcon={<BsBank size={16} />}
          variant={"none"}
          maxW={"75px"}
          w={"75px"}
          height={30}
          fontSize={10}
          fontWeight={"500"}
          py={0}
          px={2}
          borderRadius={10}
          as={Button}
          _hover={{ background: "#035135", color: "white" }}
          _active={{ background: "#035135", color: "white" }}
          _focusVisible={{ border: 0 }}
          sx={{
            border: "1px solid #cf8a2b",
            color: "#cf8a2b",
            borderRadius: 10,
            paddingInline: "5px !important",
          }}
        >
          {messages["header"].donateus}
        </MenuButton>
        <MenuList
          w="100%"
          bg={"#169265"}
          overflow={"hidden"}
          style={{ marginTop: -8 }}
          padding={"2px 0px"}
          borderRadius={"0px 15px"}
          borderWidth={0}
        >
          <MenuItem
            key={1}
            bg={"#169265"}
            color={"white"}
            as={Link}
            href={dil + "/bagislar"}
            icon={<TbWorld size={18} />}
            _hover={{ background: "#054f34" }}
          >
            {messages["header"].onlinedonate}
          </MenuItem>
          {/*<MenuItem key={2} bg={'#169265'} color={'white'} as={Link} href={dil+"/aylikbagis"} icon={<FaRegCalendarCheck size={18} />} _hover={{background:'#054f34'}}>
                {messages['header'].monthlydonate}
            </MenuItem>
            <MenuItem key={3} bg={'#169265'} color={'white'} as={Link} href={dil+"/page/sms-ile-bagis"} icon={<MdSms size={18} />} _hover={{background:'#054f34'}}>
                {messages['header'].donatewithsms}
            </MenuItem>*/}
          <MenuItem
            key={4}
            bg={"#169265"}
            color={"white"}
            as={Link}
            href={dil + "/hesapnumaralarimiz"}
            icon={<MdAccountBalance size={18} />}
            _hover={{ background: "#054f34" }}
          >
            {messages["header"].accountnumbers}
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }
  if (buttonadi == "destekol") {
    return (
      <Menu>
        <MenuButton
          className="destekolbutton"
          leftIcon={<FaHands size={18} />}
          variant={"none"}
          maxW={"120px"}
          height={30}
          w={"120px"}
          fontSize={10}
          fontWeight={"500"}
          py={0}
          borderRadius={10}
          as={Button}
          _hover={{ background: "#085465", color: "white" }}
          _active={{ background: "#085465", color: "white" }}
          _focusVisible={{ border: 0 }}
        >
          {messages["header"].supportus}
        </MenuButton>
        <MenuList
          w="100%"
          bg={"#04819C"}
          style={{ marginTop: -8 }}
          overflow={"hidden"}
          padding={"2px 0px"}
          borderRadius={"0px 15px"}
          borderWidth={0}
        >
          <MenuItem
            bg={"#04819C"}
            color={"white"}
            as={Link}
            href={dil + "/formlar/gonullu-formu"}
            icon={<RiUserHeartLine size={18} />}
            _hover={{ background: "#015E72" }}
          >
            {messages["header"].bevolunteer}
          </MenuItem>
          <MenuItem
            bg={"#04819C"}
            color={"white"}
            as={Link}
            href={dil + "/formlar/kumbara-talep-formu"}
            icon={<GiPayMoney size={18} />}
            _hover={{ background: "#015E72" }}
          >
            {messages["header"].wantmoneybox}
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }

  if (buttonadi == "kudus") {
    return (
      <Button
        leftIcon={<PiMosque size={20} />}
        variant={"none"}
        maxW={"90"}
        w={"90"}
        height={30}
        fontSize={10}
        fontWeight={"500"}
        py={0}
        borderRadius={10}
        textTransform={"uppercase"}
        sx={{ border: "1px solid #cf8a2b", color: "#cf8a2b", borderRadius: 10 }}
      >
        <Link href={dil + "/kudus"} locale={dil}>
          {messages["header"].jerusalem}
        </Link>
      </Button>
    );
  }

  if (buttonadi == "duzenlibagis") {
    return (
      <Button
        //leftIcon={<PiMosque size={20} />}
        variant={"none"}
        maxW={"100"}
        w={"100"}
        height={30}
        fontSize={10}
        fontWeight={"500"}
        py={0}
        borderRadius={10}
        textTransform={"uppercase"}
        sx={{ border: "1px solid #cf8a2b", color: "#cf8a2b", borderRadius: 10 }}
      >
        <Link href={dil + "/duzenlibagis"} locale={dil}>
          Düzenli Bağış
        </Link>
      </Button>
    );
  }

  if (buttonadi == "hesaplarimiz") {
    return (
      <Button
        // leftIcon={<PiMosque size={20} />}
        variant={"none"}
        maxW={"100"}
        w={"100"}
        height={30}
        fontSize={10}
        fontWeight={"500"}
        py={0}
        borderRadius={10}
        textTransform={"uppercase"}
        sx={{ border: "1px solid #cf8a2b", color: "#cf8a2b", borderRadius: 10 }}
      >
        <Link href={dil + "/hesapnumaralarimiz"} locale={dil}>
          Hesaplarımız
        </Link>
      </Button>
    );
  }

  if (buttonadi == "paypal") {
    return (
      <Button
        //leftIcon={<PiMosque size={20} />}
        variant={"none"}
        maxW={"75"}
        w={"75"}
        height={30}
        fontSize={10}
        fontWeight={"500"}
        py={0}
        borderRadius={10}
        textTransform={"uppercase"}
        sx={{
          border: "1px solid #cf8a2b",
          color: "#cf8a2b",
          borderRadius: 10,
          paddingInline: "5px !important",
        }}
      >
        <Link href={dil + "/kudus"} locale={dil}>
          Paypal
        </Link>
      </Button>
    );
  }

  if (buttonadi == "whatsapptelefon") {
    return (
      <Button
        leftIcon={<FaWhatsapp size={20} />}
        borderColor={"#DBDBDB"}
        variant="outline"
        w={"120px"}
        fontSize={12}
        fontWeight={"500"}
        py={6}
        borderRadius={20}
        color={"#6DAA2F"}
        wordBreak={"break-all"}
        whiteSpace={"wrap"}
        textAlign={"start"}
      >
        <Link
          href={
            "https://api.whatsapp.com/send?phone=" +
            whatsappnumara +
            "&text=" +
            settings.whatsappfixmsg
          }
          locale={dil}
        >
          {settings.whatsappfixno}
        </Link>
      </Button>
    );
  }

  if (buttonadi == "telefon") {
    return (
      <Button
        leftIcon={<FaPhoneAlt size={12} />}
        variant="outline"
        w={"auto"}
        height={"25px"}
        fontSize={12}
        fontWeight={"500"}
        py={0}
        borderRadius={20}
        color={"#F1B96A"}
        wordBreak={"break-all"}
        whiteSpace={"wrap"}
        textAlign={"start"}
        borderColor={"#f1b96a"}
      >
        <Link href={"tel:+905366375867"} locale={dil}>
          {settings.telefon}
        </Link>
      </Button>
    );
  }
}
