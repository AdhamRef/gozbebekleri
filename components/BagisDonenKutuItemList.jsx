'use client';
import React,{useState,useEffect,useRef} from 'react'
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import { Box,Heading,Button,Flex,Image,Text,Container} from '@chakra-ui/react'
import Link from 'next/link'
import BagisKutuButtonComponent from '../app/[locale]/BagisKutuButtonComponent';
import { useMediaQuery } from '@chakra-ui/react';
import { FaSquare } from "react-icons/fa6";
import { IoIosArrowForward,IoIosArrowBack  } from "react-icons/io";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import "keen-slider/keen-slider.min.css"
export default function BagisDonenKutuItemList({data}) {
    const [isMobile] = useMediaQuery("(max-width: 500px)");
    const [isTablet] = useMediaQuery("(min-width: 500px) and (max-width: 900px)");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [perViewNum, setPerViewNum] = useState(3);
    const intervalRef = useRef(null);
    let messages = useLanguage();
    let languageCode = useLanguageBelirtec();
    
    const filteredData = data.filter(item => item.simge === "1");

    const [sliderRef, instanceRef] = useKeenSlider({
        initial: 0,
        loop: true, // Sliderın döngü halinde devam etmesi için
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
        created(slider) {
            setLoaded(true);
            
            // İlk oluşturulduğunda otomatik oynatma başlatılır
            //startAutoPlay();

            // Fare üzerine gelince otomatik geçiş durur, ayrılınca devam eder
            //slider.container.addEventListener("mouseover", pauseAutoPlay);
            //slider.container.addEventListener("mouseout", startAutoPlay);
        },
        slides: {
            perView: perViewNum,
            spacing: 15,
            mode: "free",
        },
    });

    useEffect(() => {
        if (isMobile) {
            setPerViewNum(1);
        } else if (isTablet) {
            setPerViewNum(2.5);
        } else {
            setPerViewNum(3);
        }
    }, [isMobile, isTablet]);

    const startAutoPlay = () => {
        if (!intervalRef.current && instanceRef.current) {
            intervalRef.current = setInterval(() => {
                if (instanceRef.current) {
                    instanceRef.current.next(); // Bir sonraki slayta geçiş yapılır
                }
            }, 3000); // 3 saniye aralıklarla geçiş yapılır
        }
    };

    const pauseAutoPlay = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

 

    return (
    <>
    <Box maxW={1200}>
    <Flex width={'100%'} direction={"row"} justifyContent={"space-between"} alignItems={'center'} className="bagislarslider" position={'relative'} mb={5}>
        <Heading color={'#C98624'} fontSize={26} bg={'#fff'} paddingRight={5} zIndex={2} position={'relative'}>{messages['anasayfa'].projects}</Heading>
        {loaded && instanceRef.current && (
            <>
            <Flex direction={{base:"row",dir: "row-reverse"}} gap={2} zIndex={5} position={'relative'}>
                <Button variant={"none"} p={0} px={2} textAlign={'center'} fontSize={18} borderRadius={5} bg={'#C98624'} color={"#FFF"} onClick={(e) =>
                e.stopPropagation() || instanceRef.current?.prev()
                }><IoIosArrowBack/></Button>
                <Button variant={"none"} p={0} px={2} textAlign={'center'} fontSize={18} borderRadius={5}  bg={'#C98624'} color={"#FFF"} onClick={(e) =>
                e.stopPropagation() || instanceRef.current?.next()
                }><IoIosArrowForward/></Button>
            </Flex>
            </>
        )}
    </Flex>
    </Box>
    <div ref={sliderRef} className="keen-slider">
    {filteredData.map((post,index) => { 
    let bagisimg = post.picture; 
    if(bagisimg == ""){
        bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
    }else{
        bagisimg = "https://minberiaksa.org/uploads/"+post.picture;
    }
    return (
        <div key={post.token} className="keen-slider__slide">
        <Box className="BagisKutu">
            <Link href={languageCode+"/d/"+post.url}><Image objectFit='cover' src={bagisimg} height="220" alt={post.name} /></Link>
            <Box className="bilgi">
                <Link href={languageCode+"/d/"+post.url}><Flex direction={"row"} alignItems={'center'} gap={2} height={'40px'}><FaSquare /><Text className="baslik">{post.name}</Text></Flex></Link>
                <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} />
            </Box>
        </Box>
        </div>  
    )})}
    </div>
    </>
    )
}
