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
import { FaHands } from "react-icons/fa6";
import { FaWhatsapp, FaPhoneAlt } from "react-icons/fa";
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
import { FaCalendarAlt } from "react-icons/fa";

export default function HeaderButonlar({ buttonadi }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  let messages = useLanguage();
  let dil = useLanguageBelirtec();
  const { settings } = useAuth();
  const whatsappnumara = settings.whatsappfixno.replace(/\s+/g, "");

  if (buttonadi == "bagisyap") {
    return (
      <Menu isOpen={isOpen}>
        <MenuButton
          className="bagisyapbutton"
          leftIcon={<BsBank size={18} />}
          bg={"#CE8B2B"}
          colorScheme="red"
          maxW={"120px"}
          w={"120px"}
          fontSize={12}
          fontWeight={"500"}
          py={6}
          borderRadius={20}
          as={Button}
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          _hover={{ background: "#86540c" }}
          _active={{ background: "#86540c" }}
          _focusVisible={{ border: 0 }}
        >
          {messages["header"].donateus}
        </MenuButton>
        <MenuList
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          w="100%"
          bg={"#CE8B2B"}
          overflow={"hidden"}
          style={{ marginTop: -8 }}
          padding={"2px 0px"}
          borderRadius={"0px 15px"}
          borderWidth={0}
        >
          <MenuItem
            key={1}
            bg={"#CE8B2B"}
            color={"white"}
            as={Link}
            href={dil + "/bagislar"}
            icon={<TbWorld size={18} />}
            _hover={{ background: "#86540c" }}
          >
            {messages["header"].onlinedonate}
          </MenuItem>
          {/*<MenuItem key={2} bg={'#CE8B2B'} color={'white'} as={Link} href={dil+"/aylikbagis"} icon={<FaRegCalendarCheck size={18} />} _hover={{background:'#86540c'}}>
                    {messages['header'].monthlydonate}
                </MenuItem>
                <MenuItem key={3} bg={'#CE8B2B'} color={'white'} as={Link} href={dil+"/page/sms-ile-bagis"} icon={<MdSms size={18} />} _hover={{background:'#86540c'}}>
                    {messages['header'].donatewithsms}
                </MenuItem>*/}
          <MenuItem
            key={4}
            bg={"#CE8B2B"}
            color={"white"}
            as={Link}
            href={dil + "/hesapnumaralarimiz"}
            icon={<MdAccountBalance size={18} />}
            _hover={{ background: "#86540c" }}
          >
            {messages["header"].accountnumbers}
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }
  if (buttonadi == "destekol") {
    return (
      <Menu isOpen={isOpen}>
        <MenuButton
          className="destekolbutton"
          leftIcon={<FaHands size={18} style={{ marginLeft: "0px" }} />}
          bg={"#AA422F"}
          colorScheme="red"
          maxW={"120px"}
          w={"120px"}
          onClick={() => showModal(3)}
          fontSize={12}
          fontWeight={"500"}
          py={6}
          borderRadius={20}
          as={Button}
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          _hover={{ background: "#54190e" }}
          _active={{ background: "#54190e" }}
          _focusVisible={{ border: 0 }}
        >
          {messages["header"].supportus}
        </MenuButton>
        <MenuList
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          w="100%"
          bg={"#AA422F"}
          style={{ marginTop: -8 }}
          overflow={"hidden"}
          padding={"2px 0px"}
          borderRadius={"0px 15px"}
          borderWidth={0}
        >
          <MenuItem
            bg={"#AA422F"}
            color={"white"}
            as={Link}
            href={dil + "/formlar/gonullu-formu"}
            icon={<RiUserHeartLine size={18} />}
            _hover={{ background: "#54190e" }}
          >
            {messages["header"].bevolunteer}
          </MenuItem>
          <MenuItem
            bg={"#AA422F"}
            color={"white"}
            as={Link}
            href={dil + "/formlar/kumbara-talep-formu"}
            icon={<GiPayMoney size={18} />}
            _hover={{ background: "#54190e" }}
          >
            {messages["header"].wantmoneybox}
          </MenuItem>
        </MenuList>
      </Menu>
    );
  }

  if (buttonadi == "hesaplarimiz") {
    return (
      <Button
        leftIcon={<MdAccountBalance size={20} />}
        colorScheme="red"
        maxW={"140px"}
        fontSize={12}
        fontWeight={"500"}
        py={6}
        borderRadius={20}
        bg={"#AA422F"}
        textTransform={"uppercase"}
        _hover={{ background: "#54190e" }}
        _active={{ background: "#54190e" }}
      >
        <Link href={dil + "/hesapnumaralarimiz"} locale={dil}>
          {messages["header"].accounts}
        </Link>
      </Button>
    );
  }

  if (buttonadi == "kudus") {
    return (
      <Button
        leftIcon={<PiMosque size={20} />}
        bg={"#E7AB38"}
        _hover={{ background: "#a6761a" }}
        colorScheme="red"
        maxW={"100px"}
        w={"100px"}
        fontSize={12}
        fontWeight={"500"}
        py={6}
        borderRadius={20}
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
        leftIcon={<FaCalendarAlt size={20} />}
        bg={"#E7AB38"}
        _hover={{ background: "#a6761a" }}
        textTransform={"uppercase"}
        colorScheme="red"
        fontSize={12}
        fontWeight={"500"}
        py={6}
        borderRadius={20}
      >
        <Link href={dil + "/duzenlibagis"} locale={dil}>
          {messages["header"].regulardonate}
        </Link>
      </Button>
    );
  }

  if (buttonadi == "whatsapptelefon") {
    return (
      <Button
        borderColor={"#DBDBDB"}
        variant="outline"
        fontSize={10}
        fontWeight={"500"}
        py={0}
        height={25}
        borderRadius={20}
        color={"#6DAA2F"}
        wordBreak={"break-all"}
        whiteSpace={"wrap"}
        textAlign={"start"}
        bgColor={"#FFF"}
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
        borderColor={"#DBDBDB"}
        variant="outline"
        fontSize={10}
        fontWeight={"500"}
        height={25}
        py={0}
        borderRadius={20}
        color={"#F1B96A"}
        wordBreak={"break-all"}
        whiteSpace={"wrap"}
        textAlign={"start"}
        bgColor={"#FFF"}
      >
        <Link href={"tel:+905366375867"} locale={dil}>
          {settings.telefon}
        </Link>
      </Button>
    );
  }
}
