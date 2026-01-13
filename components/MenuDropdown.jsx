'use client';
import React from 'react'
import { Menu,MenuButton,MenuList,MenuItem,MenuItemOption,MenuGroup,MenuOptionGroup,MenuDivider,Button,Flex,Image,useDisclosure,useMediaQuery } from '@chakra-ui/react'
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function MenuDropdown({component,index}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
   let languageCode = useLanguageBelirtec();
    let dilfetch = languageCode.replace("/","");
    if(dilfetch==""){
        dilfetch = "tr";
    }
  return (
    <Menu key={index} isOpen={isOpen}>
    <MenuButton fontSize={12} fontWeight={'600'} color={"#5A5A5A"} px="2" style={{textTransform:'uppercase', borderRadius:10}} _hover={{ bg: "#ad402f"}} _expanded={{ bg: "#ad402f",  color:'#FFF', zIndex:55}} _focusVisible={{border:0,}} variant="ghost" as={Button} onMouseEnter={onOpen} onMouseLeave={onClose}>
        {component.menubaslik}
    </MenuButton>
    <MenuList onMouseEnter={onOpen} onMouseLeave={onClose} w="100%" style={{marginTop:-8,zIndex:555}}>
        {component.menuler.map((altcomponent, altindex) => (
        <MenuItem key={altcomponent.id} href={languageCode+"/"+altcomponent.url}>
            <Link href={languageCode+"/"+altcomponent.url} style={{width:'100%',height:'100%',fontSize:14}}>{altcomponent.name}</Link>
        </MenuItem>
        ))}
    </MenuList>
    </Menu>
  )
}
