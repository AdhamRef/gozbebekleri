"use client";
import React,{useState,useEffect,useRef} from 'react'
import { Box,Text,Image,Flex,Heading,useMediaQuery,Button} from '@chakra-ui/react'
import Link from 'next/link';
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import { IoIosArrowForward,IoIosArrowBack  } from "react-icons/io";
import { GoArrowRight } from "react-icons/go";
import {useLanguage,useLanguageBelirtec} from '@/main/utilities/language';
import "keen-slider/keen-slider.min.css"
export default function TanitimProjeleri({data}) {

    const [isMobile] = useMediaQuery("(max-width: 500px)");
    const [isTablet] = useMediaQuery("(min-width: 500px) and (max-width: 900px)");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [perViewNum, setPerViewNum] = useState(1);
    const intervalRef = useRef(null);
    const message = useLanguage();
    const dil = useLanguageBelirtec();
    const [sliderRef, instanceRef] = useKeenSlider({
        initial: 0,
        loop: true, // Sliderın döngü halinde devam etmesi için
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
        created(slider) {
            setLoaded(true);
            
        },
        slides: {
            perView: perViewNum,
            spacing: 0,
            mode: "free",
        },
    });

    useEffect(() => {
        if (isMobile) {
            setPerViewNum(1);
        } else if (isTablet) {
            setPerViewNum(2.5);
        } else {
            setPerViewNum(1);
        }
    }, [isMobile, isTablet]);

    return (
    <Box mb={10}>
            <Flex direction={'row'} justifyContent={'space-between'}>
            <Heading size='lg' color={"#AE4836"}>{message.introduction}</Heading>
                {loaded && instanceRef.current && (
                    <>
                    <Flex direction={{base:"row",dir: "row-reverse"}} gap={2} zIndex={5} position={'relative'}>
                        <Button variant={"none"} p={0} px={2} textAlign={'center'} fontSize={18} borderRadius={5} bg={'#04819C'} color={"#FFF"} onClick={(e) =>
                        e.stopPropagation() || instanceRef.current?.prev()
                        }><IoIosArrowBack/></Button>
                        <Button variant={"none"} p={0} px={2} textAlign={'center'} fontSize={18} borderRadius={5}  bg={'#04819C'} color={"#FFF"} onClick={(e) =>
                        e.stopPropagation() || instanceRef.current?.next()
                        }><IoIosArrowForward/></Button>
                    </Flex>
                    </>
                )}
            </Flex>

            <Flex direction={'column'} position={'relative'} mt={10}>
                <Link href={dil+"/"+data[0].url}><Image src={'/nureddinzengi.png'} width={'100%'} height={400} position={'relative'} zIndex={5} /></Link>
                <Image src={'/nureddinzengiitembg.png'} width={'100%'} height={400} className='nureddinnzengiitembg' />
            </Flex>

            <Flex mt={20}>
                <Button width={'85%'} rightIcon={<GoArrowRight size={18}/>} color={'#fff'} fontSize={14} bg={'#EA9F34'} borderRadius={15} textAlign={'left'} justifyContent={'space-between'}>TÜM TANITIM PROJELER İÇİN TIKLAYIN</Button>
            </Flex>
      </Box>
  )
}
