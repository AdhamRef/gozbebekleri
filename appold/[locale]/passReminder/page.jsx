"use client";
import React,{useState,useEffect} from 'react'
import { Box,useToast,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Checkbox,Center,Radio, RadioGroup,Stack} from '@chakra-ui/react'
import { BsFillTelephoneFill,BsFillLockFill,BsEnvelopeFill,BsFillPersonFill   } from "react-icons/bs";
import { useSearchParams } from 'next/navigation'
import {useLanguageBelirtec} from "@/main/utilities/language";


export default function PassReminder() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    let dil = useLanguageBelirtec();
    let dilfetch = dil;
    if(dilfetch==""){
        dilfetch = "tr";
    }

    useEffect(() => {
        const tokenDogrulama = async () => {
            try {
                const response_ham = await fetch("/api/passReminder", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept-Language': dilfetch,
                    },
                    body: JSON.stringify({
                        email: "mcayapim@gmail.com",
                        type: "passReminderCheck",
                        key: token
                    }),
                });
            
                if (response_ham.ok) {
                    const response = await response_ham.json(); // response_ham'dan JSON verisini al
                    if (response.status) {
                        //console.log("passreminder ok");
                    } else {
                       // console.log("passreminder else");

                    }
                } else {
                    // response_ham.ok false ise buraya gelir
                }
            
            } catch (error) {
                console.error('Error:', error);
                
            }
        }
        if(token != ""){
            tokenDogrulama();
            
        }else{
            console.log("token else");
        }
    }, [])
    
  return (
    <Container maxW={1000} py={8}>
    
    </Container>
  )
}
