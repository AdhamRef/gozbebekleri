"use client";
import React,{useState,useEffect}from 'react'
import { BsBag } from "react-icons/bs";
import { Button, useDisclosure, Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton, Text, Image, Flex, Box } from '@chakra-ui/react'
import { useDispatch, useSelector} from 'react-redux';
import { BsCreditCardFill } from "react-icons/bs";
import { Spinner } from '@chakra-ui/react'
import { useRouter } from 'next/navigation';
import { FaRegTimesCircle } from "react-icons/fa";
import {useLanguageBelirtec} from "@/main/utilities/language";
import Link from "next/link";

export default function SepetIconComponent() {
  
  const [qsepetsayi,setqSepetsayi] = useState(0);
  const [sepetyukleniyor,setSepetYukleniyor] = useState(false);
  const dispatch = useDispatch(); //
  const router = useRouter();
  const sepetsay = useSelector((state) => state.sepet.sepetsay);
  let dil = useLanguageBelirtec();
 
  const sepetguncelle = async (sepetsay) => {
    const sepetsaynew = sepetsay + 1;
    //dispatch(logSepet(sepetsaynew));
  }

  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef = React.useRef();

  useEffect(() => {
    if(isOpen){
      setTimeout(() => {
        setSepetYukleniyor(true);
      }, 1000);
    }else{
      setSepetYukleniyor(false);
    }

  });

  const SepetIcerigi = () => {

    if(sepetyukleniyor){
    return(
      <>
      <Box style={{borderBottom:'1px solid #eee',}} pb="5">
        <Flex direction="row" gap="10px">
          <Image src="https://eldenele.org.tr//upload/arsiv/opt-stusent-TZ1O2621J2HD545DL9JG.jpg" width="100px"  />
          <Flex direction="column" gap="10px">
            <Flex direction="row" gap="8px">
              <Text style={{fontSize:14,}}>Üniversite Öğrencileri Bursu</Text>
              <Text style={{fontSize:14,color:'#e60000',marginTop:4,cursor:'pointer'}}><FaRegTimesCircle /></Text>
            </Flex>
            <Text style={{alignSelf:'flex-start',fontSize:15,paddingTop:5,paddingBottom:5,paddingLeft:12,paddingRight:12,background:'#eee',borderRadius:10}}>750 ₺</Text>
          </Flex>
        </Flex>
      </Box>

      <Box style={{borderBottom:'1px solid #eee',}} pb="5">
        <Flex direction="row" gap="10px" mt="5">
          <Image src="https://eldenele.org.tr//upload/arsiv/opt-Bagis-Kutu-Anasayfa-Boyutuar-VSKPDYCMBIC08X9OHYKE.jpg" width="100px"  />
          <Flex direction="column" gap="10px">
            <Flex direction="row" gap="8px">
            <Text style={{fontSize:14}}>Göz Ameliyatı Projesi</Text>
            <Text style={{fontSize:14,color:'#e60000',marginTop:4,cursor:'pointer'}}><FaRegTimesCircle /></Text>
            </Flex>
            <Text style={{alignSelf:'flex-start',fontSize:15,paddingTop:5,paddingBottom:5,paddingLeft:12,paddingRight:12,background:'#eee',borderRadius:10}}>2500 ₺</Text>
          </Flex>
        </Flex>
      </Box>

      <Box>
        <Flex direction="row" gap="10px" mt="5">
          <Image src="https://eldenele.org.tr//upload/arsiv/opt-Bagis-Kutu-Anasayfa-Boyutuar-VSKPDYCMBIC08X9OHYKE.jpg" width="100px"  />
          <Flex direction="column" gap="10px">
            <Flex direction="row" gap="8px">
            <Text style={{fontSize:14,}}>Göz Ameliyatı Projesi</Text>
            <Text style={{fontSize:14,color:'#e60000',marginTop:4,cursor:'pointer'}}><FaRegTimesCircle /></Text>
            </Flex>
            <Text style={{alignSelf:'flex-start',fontSize:15,paddingTop:5,paddingBottom:5,paddingLeft:12,paddingRight:12,background:'#eee',borderRadius:10}}>2500 ₺</Text>
          </Flex>
        </Flex>
      </Box>
            </>
    )
    }else{
      return (
        <>
        <Flex style={{height:'100%'}} direction={"row"} justifyContent={"center"} alignItems={"center"}>
          <Spinner />
          </Flex>
        </>
      )
    }
  }


  const SepeteYonlendir = () => {
    router.push('/sepet');
    onClose();
  }
  return (
    <>
    <Button as={Link} href={dil+"/sepet"} style={{position:'relative',background:'transparent'}} px={0}>
      <BsBag fontSize={18}/> 
      <Box style={{width:'17px',height:'17px',lineHeight:'15px',position:'absolute',right:5,top:18,background:'green',borderRadius:10,padding:2,paddingLeft:3,paddingRight:7,fontSize:9,color:'#FFF',textAlign:'center'}}>{sepetsay}</Box>
    </Button>
    </>
  )
}
