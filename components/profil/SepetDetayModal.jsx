"use client";
import React, { useState,useEffect } from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, Text, useDisclosure,Table,Thead,Tbody,Tfoot,Tr,Th,Td,TableCaption,TableContainer,} from '@chakra-ui/react'

export default function SepetDetayModal({token}) {
  const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [sepetBilgileri,setSepetBilgileri] = useState();
  const [sepetStatus,setSepetStatus] = useState(true);
  let parabirimi = "₺";
  const sepetDetayFetch = async() => {
        try{
            // apinr
            const response_ham = await fetch("/apinr/checklogin", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymenttoken: token,
                    token: 1,
                }),
            });
        
            if (response_ham.ok) {
                const response = await response_ham.json(); // response_ham'dan JSON verisini al
                if (response.status) {
                    setSepetBilgileri(response.data[0].donatesList[0].basket);
                    setSepetStatus(false);
                } else {
                }
            } else {
                // response_ham.ok false ise buraya gelir
                console.log("sepet detay response else");

            }
        }catch(error){
            console.log("error", error);
        }
    }
  const detaylarModal = () => {
    onOpen();
    sepetDetayFetch();

  }
  useEffect(() => {
    
  }, [])

  return (
    <>
    <Button onClick={() => detaylarModal()} size={'sm'}>Detaylar</Button>
    <Modal isOpen={isOpen} onClose={onClose} size={'xl'}>
    <ModalOverlay />
    <ModalContent>
        <ModalHeader></ModalHeader>
        <ModalCloseButton />
        <ModalBody>
            {!sepetStatus && 
                <TableContainer>
                <Table maxWidth={350} variant='simple' bgColor={'#fcfcfc'} borderColor={'#DFDFDF'} borderRadius={15}>
                    <Thead>
                    <Tr>
                        <Th>ADI</Th>
                        <Th>TUTAR</Th>
                        <Th>AD & SOYAD</Th>
                        <Th>E-POSTA</Th>
                        <Th>TELEFON</Th>
                        <Th>KİMİN ADINA?</Th>
                    </Tr>
                    </Thead>
                    <Tbody>
                    {sepetBilgileri.map((post,index) => (
                        <Tr key={index}>
                            <Td>{post.name}</Td>
                            <Td>{post.totalprice}
                            {post.Currency == "0" && <Text>₺</Text>}
                            {post.Currency == "1" && <Text>$</Text>}
                            {post.Currency == "2" && <Text>€</Text>}
                            </Td>
                            <Td>{post.personname}</Td>
                            <Td>{post.personemail}</Td>
                            <Td>{post.personphone}</Td>
                            <Td>
                            {post.persontype == "0" && <Text>Kendi Adıma</Text>}
                            {post.persontype == "1" && <Text>Başkası Adına</Text>}
                            {post.persontype == "2" && <Text>Hediye Bağış</Text>}
                            </Td>
                        </Tr>
                        ))}
                    </Tbody>
                    <Tfoot>
                    <Tr>
                        <Th>ADI</Th>
                        <Th>TUTAR</Th>
                        <Th>AD & SOYAD</Th>
                        <Th>E-POSTA</Th>
                        <Th>TELEFON</Th>
                        <Th>KİMİN ADINA?</Th>
                    </Tr>
                    </Tfoot>
                </Table>
                </TableContainer>
            }
        </ModalBody>

        <ModalFooter>
        <Button colorScheme='blue' mr={3} onClick={onClose}>
            Kapat
        </Button>
        </ModalFooter>
    </ModalContent>
    </Modal>
    </>
  )
}
