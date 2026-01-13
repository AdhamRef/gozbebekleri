"use client";
import React, {useEffect} from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'
import Swal from 'sweetalert2'

export default function Formlar({postdata,formdata}) {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;

    const Gonder = () => {
        const gfetch = async () => {
            const form = document.getElementById("volunteerForm");
            const formData = new FormData(form);
            const inputValues = {};
            formData.forEach((value, key) => {
                inputValues[key] = value;
            });
            inputValues['formID'] = postdata.token;
            try {
                const response = await fetch("/api/formsadd", {
                method: "POST",
                body: JSON.stringify(inputValues),
                });
                if (response.ok) {
                    let responsejson = await response.json();
                    if (responsejson.status) {
                        Swal.fire({
                        icon: "success",
                        html: "<strong>Başarıyla Formunuz Gönderildi!</strong>",
                        padding: "0px 0px 20px 0px",
                        showConfirmButton: false,
                        width: "350px",
                        allowOutsideClick: () => {
                            Swal.close();
                            return false; // Explicitly return false to handle `allowOutsideClick`.
                        }
                        });
                        document.getElementById("volunteerForm").reset();
                    } else {
                        Swal.fire({
                        icon: "error",
                        html: "<strong>Formunuz Gönderilemedi!</strong>",
                        padding: "0px 0px 20px 0px",
                        showConfirmButton: false,
                        width: "350px",
                        allowOutsideClick: () => {
                            Swal.close();
                            return false;
                        }
                        });
                    }
                } else {
                console.log("Form gönderiminde bir hata oluştu.");
                }
            } catch (error) {
                console.error("Hata:", error);
            }
        }

        gfetch();
    }
    
  return (
    <Flex direction={["column","row"]} gap={5} py={10}>
        <Box width={["100%","100%"]} bg={"#FFF"} p={8} borderRadius={25} style={{boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)",}}>
            <Flex direction={"column"} gap={5} >
                <div dangerouslySetInnerHTML={{__html:postdata.formdetay}}/>
                <Button onClick={()=>Gonder()}>Gönder</Button>
            </Flex>
        </Box>
    </Flex>
  )
}
