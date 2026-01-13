"use client";
import React from 'react'
import { useDisclosure, Box, Button, ButtonGroup, Text, useTheme, Menu, MenuButton, MenuList, MenuItem, } from '@chakra-ui/react'
import { GrLanguage } from "react-icons/gr";

export default function Diller() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
    <Menu>
    <MenuButton variant={"none"} fontSize={{base:20,lg:16}} fontWeight={"500"} py={1} borderRadius={10} as={Button} color={'#c4c5c5'} _hover={{background:'#eee',color:'black'}} _active={{background:'#eee',color:'black'}} _focusVisible={{border:0,}}>
    <GrLanguage />
    </MenuButton>
    <MenuList minWidth={"80px"} bg={'#eee'} overflow={'hidden'} style={{marginTop:-8}} padding={'2px 0px'} borderRadius={'0px 15px'} borderWidth={0}>
        <MenuItem key={1} bg={'#eee'} fontWeight={200} as={Button} style={{fontWeight:200}} _hover={{background:'#eee',color:'black'}} borderRadius={0} color={'black'} onClick={() => window.location.href = "/"}>
            Türkçe (TR)
        </MenuItem>
        <MenuItem key={2} bg={'#eee'} fontWeight={200} as={Button} style={{fontWeight:200}} _hover={{background:'#eee',color:'black'}} borderRadius={0} color={'black'} onClick={() => window.location.href = "/en/"}>
            English (EN)
        </MenuItem>
        <MenuItem key={4} bg={'#eee'} fontWeight={200} as={Button} style={{fontWeight:200}} _hover={{background:'#eee',color:'black'}} borderRadius={0} color={'black'} onClick={() => window.location.href = "/ar/"}>
            العربية (AR)
        </MenuItem>
    </MenuList>
    </Menu>
    </>
  )
}
