"use client";
import React from 'react'
import {Button,Modal,ModalOverlay,ModalContent,ModalHeader,ModalFooter,ModalBody,ModalCloseButton,useDisclosure} from "@chakra-ui/react";
export default function VideoModal({isOpen,onClose,videoKodu}) {
  let videoK = {__html: videoKodu};
  return (
    <Modal isOpen={isOpen} onClose={onClose} size={"lg"}>
    <ModalOverlay
      bg='blackAlpha.300'
      backdropFilter='blur(10px) hue-rotate(0deg)'
    />
    <ModalOverlay />
    <ModalContent>
      <ModalCloseButton style={{color:'white'}}/>
      <ModalBody style={{padding:'0px',borderRadius:15,borderWidth:3,borderColor:'white'}}>
      <div className='videoModaliframe' dangerouslySetInnerHTML={videoK} />
      </ModalBody>
      <ModalFooter style={{padding:'0px'}}>
      </ModalFooter>
    </ModalContent>
  </Modal>
  )
}
