'use client';
import React, {useState,useEffect,useRef} from 'react'
import 'keen-slider/keen-slider.min.css'
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import "@/styles/styles.css";
import Image from 'next/image'
import {Box,useMediaQuery,Container,Flex,Text,useDisclosure } from '@chakra-ui/react'
import { FiChevronRight, FiChevronLeft  } from "react-icons/fi";
import SlaytHizliBagis from '@/components/SlaytHizliBagis';
import VideoModal from "@/src/app/components/VideoModal";
import Link from 'next/link';
export default function SliderBox({data,tanitimvideomuz,tanitimvideomuz_metin}) {

    const [isMobile] = useMediaQuery("(max-width: 768px)");
    const [currentSlide, setCurrentSlide] = useState(0)
    const [loaded, setLoaded] = useState(false)
    const intervalRef = useRef(null); // Interval referansı
    const [sliderRef, instanceRef] = useKeenSlider({
        initial: 0,
        loop:true,
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel)
        },
        created(slider) {
            setLoaded(true)
            slider.container.addEventListener("mouseover", pauseAutoPlay);
            slider.container.addEventListener("mouseout", startAutoPlay);

            startAutoPlay();
        },
    })
    const {isOpen, onOpen, onClose} = useDisclosure();

    const goToSlide = (slideIndex) => {
        if (instanceRef) {
          instanceRef.current?.moveToIdx(slideIndex); // Belirli slayta geç
        }
      };

    
    const startAutoPlay = () => {
        if (!intervalRef.current && instanceRef.current) {
            intervalRef.current = setInterval(() => {
                if (instanceRef.current) {
                    instanceRef.current.next();
                }
            }, 5000);
        }
    };

    const pauseAutoPlay = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        
        return () => {
            pauseAutoPlay();
        };
    }, []);

  return (
    <div style={{position:'relative'}}>
        <Box position={'relative'}>
        {data && data.length > 0 ?
            <Box ref={sliderRef} className="keen-slider" borderWidth={1} borderStyle={'solid'} borderColor={'#eee'} boxShadow={'lg'}>
            {data && data.length > 0 && data.slice(0,8).map((slide,index) => {
                let mobilslide,desktopslide,slidelink;
                slidelink = slide.slidelink ? slide.slidelink : '#';
                if(slide.slidemobilepicture==""){
                    mobilslide = "/defaultslider.jpg";
                }else{
                    mobilslide = "https://minberiaksa.org/uploads/slayt-"+slide.slidemobilepicture
                }
                desktopslide = "https://minberiaksa.org/uploads/slayt-"+slide.slidepicture;
                return (
                <Box key={index} className="keen-slider__slide" height={{lg:'600px',base:'130px'}} style={{overflow:"hidden"}}>
                <Link href={slidelink}>
                {isMobile ?  (
                    <Image
                   
                   
                    src={mobilslide}
                    alt={slide.slidename}
                    objectFit='cover'
                    fill={true}
                    />
                ) : (
                    <>
                    {slide.type === '0' && 
                        <Image
                            src={desktopslide}
                            alt={slide.slidename}
                            fill={true}
                            objectFit='cover'
                        />
                    }
                    {slide.type === '1' && 
                        <Image
                            src={desktopslide}
                            alt={slide.slidename}
                            fill={true}
                            objectFit='cover'
                        />
                    }
                    {slide.type === '2' && 
                        <div dangerouslySetInnerHTML={{__html:slide.slidevideoembed}}/>
                    }
                </> 
                )}
                </Link>
            </Box>
            )})}
        </Box>
        : <Box height={100}></Box>}
        {loaded && instanceRef.current && (
        <div className="slidebuttons">
            <div className='ileri' onClick={ () => {instanceRef.current?.next()}}> <FiChevronRight />  </div>
            <div className='geri' onClick={ () => {instanceRef.current?.prev()}}> <FiChevronLeft /> </div>
        </div>
        )}
        </Box>


        <Container maxW='1200' marginTop={{base: '30px', md: '-30px',lg:'-40px'}} style={{position:'relative',zIndex:5}}>

        <Flex direction={{base:'column',lg:"row"}} gap={5}>
        
                <Flex maxWidth={{base:'100%',lg:'50%'}} direction="column" justifyContent={"flex-start"} alignItems={'flex-start'} flex={1} gap={5}>
              

                    {!isMobile && data && data.length > 0 && <div className="slide-buttons" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                            {data && data.length > 0 && data.map((slide,index) => (
                                <button
                                key={index}
                                className={`slide-button ${currentSlide === index ? "active" : ""}`}
                                onClick={() => goToSlide(index)}
                                >
                                <Box backgroundImage={"https://minberiaksa.org/uploads/"+slide.slidepicture} bgPos={'center'} bgSize={'cover'} width={{base:'50px',lg:70}} height={{base:'50px',lg:70}} borderRadius={'50%'}></Box>
                                </button>
                            ))}
                        </div>
                    }

              


                    <Flex direction={"row"} gap={7} justifyContent={'center'} alignItems={'center'} onClick={onOpen}>
                        <Image src={"/tanitimvideosu.png"} width={160} height={110} />
                        <Text fontWeight={600} fontSize={{base:18,lg:22}} textAlign={'left'}>{tanitimvideomuz_metin}</Text>
                    </Flex>
                </Flex>
        
                <Flex width={{base:'100%',lg:'50%'}}>
                    <SlaytHizliBagis />
                </Flex>
        </Flex>
        </Container>
        <VideoModal videoKodu={tanitimvideomuz} isOpen={isOpen} onClose={onClose} />
  </div>
  )
}
