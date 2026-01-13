'use client';
import React,{useEffect, useState,} from 'react';
import { Menu,MenuButton,MenuList,MenuItem,MenuItemOption,MenuGroup,MenuOptionGroup,MenuDivider,Button,Flex,Image,useDisclosure,useMediaQuery } from '@chakra-ui/react'
import Link from 'next/link';
import "./menu.css";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import MenuDropdown from '@/components/MenuDropdown';
import { usePathname } from 'next/navigation';
const MenuComponent = ({display}) => {
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [menuDataFetch,setMenuDataFetch] = useState();
  let messages = useLanguage();


  let languageCode = useLanguageBelirtec();
  let dilfetch = languageCode.replace("/","");
  if(dilfetch==""){
      dilfetch = "tr";
  }
  
  useEffect(() => {
    
    const menufetch = async() => {
      const response_ham = await fetch("/api/kategoriListe", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': dilfetch,
        },
        body: JSON.stringify({ type: "menus"}),
      });
      const response = await response_ham.json(); // response_ham'dan JSON verisini al
      return response;
    }
    const fetchData = async () => {
    let menudata = await menufetch();
    const filteredMenuData = menudata['data'].filter(item => item.menuyerleri ==="0");
    const sortmenu = filteredMenuData.sort((a,b) => a.menusirasi - b.menusirasi);
    setMenuDataFetch(sortmenu);
    }

    fetchData();
  }, [])



  return (
    <Flex className="headermenu tabletdesktopmenu hidexs"  position={'relative'} zIndex={25} wrap={'wrap'}>
      {menuDataFetch && menuDataFetch.map((component,index) => (
        component.menuler.length > 1 ? (
        <MenuDropdown key={index} index={index} component={component}  />
        ) : (
        <Link key={index} href={languageCode+"/"+component.menuler[0].url}><Button variant="ghost" borderRadius={10} fontSize={12} fontWeight={'600'} color={'#5A5A5A'} px="2" style={{textTransform:'uppercase'}} _hover={{ bg: "#ad402f", color:'#FFF' }} _active={{color:'#FFF'}}>{component.menubaslik}</Button></Link> 
        )        
        ))}
    </Flex>
  );
};

export default MenuComponent;
