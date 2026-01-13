"use client";
import React, {useState} from 'react'
import {Box,Flex,Text} from "@chakra-ui/react";
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import { FiChevronRight, FiChevronLeft  } from "react-icons/fi";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import Link from 'next/link'

import Image from 'next/image'
export default function FaaliyetlerSlayt({data}) {
    let languageCode = useLanguageBelirtec();
    const [currentSlide, setCurrentSlide] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const [sliderRef, instanceRef] = useKeenSlider({
      initial: 0,
      slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel)
      },
      created() {
        setLoaded(true)
      },
    })

  return (
    <Box className='faaliyetlerslayt' style={{position:'relative'}}>
    <Box ref={sliderRef} className="keen-slider" >
        {data.slice(0,2).map((slide,index) => {
          let img;
          if(slide.picture){
          img = "https://minberiaksa.org/uploads/"+slide.picture;
          }else{
          img = "http://crm.tussesleri.com/uploads/varsayilan.jpg";
          }
          return (
          <Box key={index} className="keen-slider__slide" style={{height:"400px",overflow:"hidden"}} borderRadius={25} overflow={'hidden'}>
              <Link href={languageCode+"/faaliyetler/"+slide.url}><Box bgImage={img} bgPos={'center'} bgSize={'cover'} w={'100%'} h={'100%'} position={'relative'} display={'flex'} alignItems={'flex-end'}>
                <Image
                src={img}
                alt="Vercel Logo"
                fill={true}
                objectFit='cover'
                style={{opacity:0}}
                />
                <Box position={"absolute"} w={'100%'} h={'100%'} bg={'#04819c8f'} />
                <Box zIndex={10} px={'4em'} pb={10} gap={5}>
                  <Flex direction={"column"} gap={3}>
                    <Text color={'#FFFFFF'} fontWeight={600} fontSize={22}>{slide.title}</Text>
                    <Text color={'#FFFFFF'} fontSize={15}>{slide.summary}</Text>
                  </Flex>
                </Box>
            </Box></Link>
          </Box>
        )})}
    </Box>
    {loaded && instanceRef.current && (
        <div>
          <div className='ileri' style={{right:'0px !important'}} onClick={ () => {instanceRef.current?.next()}}> <Image src={'/faaliyetslaytileri.svg'} width={25} height={70} style={{width:'25px',height:'70px'}} /><FiChevronRight size={18} color={'#04819C'} style={{position:'absolute',right:0,top:'40%'}}/>  </div>
          <div className='geri' style={{left:'0px !important'}} onClick={ () => {instanceRef.current?.prev()}}><Image src={'/faaliyetslaytgeri.svg'} width={25} height={70} style={{width:'25px',height:'70px'}} /><FiChevronLeft size={18} color={'#04819C'} style={{position:'absolute',left:0,top:'40%'}}/>  </div>
        </div>
    )}
  </Box>
  )
}
