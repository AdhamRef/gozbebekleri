"use client";
import React, { useEffect} from 'react'
import { Box,Flex,Text,Button,Avatar,useToast} from '@chakra-ui/react'
import { BsFillPersonFill, BsFillLockFill, BsFillHeartFill,  } from "react-icons/bs";
import { FaSignOutAlt } from "react-icons/fa";
import Link from "next/link";
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {useSelector} from 'react-redux';
import { MdChildCare } from "react-icons/md";
import { Menu, MenuButton } from '@/components/core';
import { FaHandsBubbles } from "react-icons/fa6";
import { useDispatch } from 'react-redux';
import {oturumGuncelle,oturumKapat} from '@/redux/slices/oturumSlice';
import {sepetTemizle} from '@/redux/slices/sepetSlice';
import { CiSettings } from "react-icons/ci";
import {useLanguageBelirtec,useLanguage} from "@/main/utilities/language";

export default function ProfilMenu() {
  const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
  const router = useRouter();
  const toast = useToast();
  //const { Adisoyadi} = "Cüneyt";
  const dispatch = useDispatch(); // REDUX
  let messages = useLanguage();
  let languageCode = useLanguageBelirtec();

  const MenuData = [
    {
      id:1,
      title: messages.donations,
      href: 'bagislarim',
      icon: <BsFillHeartFill color={'#04819C'} size={18} />,
      altmenu: [
        {
          id:1001,
          title: messages.mydonates,
          href: '/profil/bagislarim',
          type: 'text'
        },
        {
          id:1004,
          title: messages.donatenow,
          href: '/bagislar',
          type: 'button'
        }
      ]
    },
    {
      id:3,
      title: messages.settings,
      href: 'ayarlar',
      icon: <CiSettings color={'#04819C'} size={20} />,
      altmenu: [
        {
          id:1002,
          title: messages.changeaccountsettings,
          href: '/profil/hesabimiduzenle'
        },
        {
          id:1003,
          title: messages.changepassword,
          href: '/profil/paroladegistir'
        },
      ]
    },
    {
      id:4,
      title: messages.logout,
      href: 'cikisyap',
      icon: <FaSignOutAlt color={'#D72B2B'} size={20}/>
  },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // apinr
        const response_ham = await fetch("https://minberiaksa.org/api/checklogin", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: "1",
          }),
        });
        if (!response_ham.ok) {
          throw new Error('API çağrısı başarısız');
        }
        const response = await response_ham.json();
        if(response.status){
        let name2 = response.data[0].name;
        let mtoken2 = response.data[0].token;
        let mail2 = response.data[0].email;
        let gsm2 = response.data[0].gsm;

        dispatch(oturumGuncelle({name:name2,email:mail2,gsm:gsm2,mtoken:mtoken2}));
        }else{
          router.push("/login");
        }

      } catch (error) {
        console.error('Error:', error);
      }
    };
  
    fetchData();
  }, []); 

  const {name,email,mtoken} = useSelector((state) => state.oturum);

  const cikisyap =  () => {
    router.refresh()
    router.push("/");
    dispatch(oturumKapat());
    dispatch(sepetTemizle());
  }

  return (
    <Box width={["100%","30%"]}>
    <Flex direction={"column"} bg={"#FFF"} className='profilDigerleri' style={{borderWidth:1,borderColor:'#eee',boxShadow: "#0000002b 0px 0px 1px"}} borderRadius={"burakradi"}>
        <Flex justify={"flex-start"} alignItems={"center"} gap={3} style={{borderBottomWidth:1,borderColor:'#eee'}} p={7}>
            <Avatar name={name} src='https://bit.ly/dan-abramov' />
            <Flex direction={"column"} gap={0}>
              <Text fontSize={18} fontWeight={500}>{name}</Text>
              <Text fontSize={14} fontWeight={500}>{email}</Text>
            </Flex>
        </Flex>
        <Flex direction={"column"} gap={3} p={7}>
        {MenuData.map((post, index) => (
        <Menu key={index}>
          {({ isOpen, toggleMenu }) => (
            <>
             {post.href == "cikisyap" ? 
              <MenuButton as="button" toggleMenu={toggleMenu} isOpen={isOpen} icon={post.icon} onClick={post.href === "cikisyap" ? cikisyap : undefined}  className={"anabutonlar "+post.href} style={{textTransform:'uppercase'}}>
                {post.title}
              </MenuButton>
              :
              <MenuButton toggleMenu={toggleMenu} isOpen={isOpen} icon={post.icon} className={"anabutonlar "+post.href} style={{textTransform:'uppercase'}}>
                {post.title}
              </MenuButton>
             }
              {isOpen && post.altmenu && (
                <ul style={{paddingLeft:'40px',marginTop:10}}>
                {post.altmenu.map((posta,indexs) => (
                  posta.type == "button" ? 
                  <Button key={indexs} size='xs' onClick={() =>  router.push(languageCode+posta.href)} colorScheme='blue' bg={'#0e83a3'} ml={'-15px'} w={'100%'} textTransform={'uppercase'} style={{textTransform:'uppercase'}}>{posta.title}</Button> 
                  : 
                  <li key={indexs} style={{fontSize:14,fontWeight:500,marginBottom:5,}}>{posta.href ? (
                    <Link href={languageCode+posta.href}>{posta.title}</Link>
                  ) : (
                    posta.title
                  )}</li> 
                ))}
                </ul>
              )}
            </>
          )}
        </Menu>
        ))}
        </Flex>
    </Flex>
    </Box>
  )
}
