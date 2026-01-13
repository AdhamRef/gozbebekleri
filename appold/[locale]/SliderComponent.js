'use client';
import React, {useState} from 'react';
import 'keen-slider/keen-slider.min.css'
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import "./styles.css"
import Image from 'next/image'
import { Flex, Button, Box, } from '@chakra-ui/react'
import { useMediaQuery } from '@chakra-ui/react';
const SliderComponent = () => {

  const slidedata = [
    {
      id:1,
      image: "https://aaaaaa.tr/upload/images/faaliyetler/yetim/yetim-okulu/makas%C4%B1d-hastanesi/AnaSayfaSlider1920x4503(1).jpg",
      imageresp: "https://aaaaaa.tr/upload/images/faaliyetler/Kurban/AnasayfaMobilSlider700x5256.jpg"
    },
    {
      id:2,
      image: "https://aaaaaa.tr/upload/images/faaliyetler/yetim/yetim-okulu/makas%C4%B1d-hastanesi/AnaSayfaSlider1920x4503(1).jpg",
      imageresp: "https://aaaaaa.tr/upload/images/faaliyetler/yetim/yetim-okulu/makas%C4%B1d-hastanesi/AnasayfaMobilSlider700x5253(1).jpg"
    },
    {
      id:3,
      image: "https://aaaaaa.tr/upload/images/faaliyetler/yetim/yetim-okulu/makas%C4%B1d-hastanesi/AnaSayfaSlider1920x4503(1).jpg",
      imageresp: "https://aaaaaa.tr/upload/images/faaliyetler/A%C4%B0LE%20SPONSORLUK/KUMANYA%20KAPAKLAR/AnasayfaMobilSlider700x5255.jpg"

    },
  ];  


  const [isMobile] = useMediaQuery("(max-width: 768px)");
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
    <div style={{position:'relative'}}>
    <div ref={sliderRef} className="keen-slider" >
        {slidedata.map((slide,index) => (
          <div key={index} className="keen-slider__slide">
          {isMobile ? (
            <Image
              width={700}
              height={525}
              src={slide.imageresp}
              alt="Vercel Logo"
              objectFit='contain'
            />
            ) : (
              <Image
              width={1920}
              height={500}
              src={slide.image}
              alt="Vercel Logo"
              objectFit='contain'
            />
            )}
          </div>
        ))}
        </div>
    <div>
    
    {loaded && instanceRef.current && (
     <Flex direction="row" justify="flex-end" gap="2" style={{marginTop:"-35px",right:40,position:"absolute",zIndex:5}}>
      {[
        ...Array(instanceRef.current.track.details.slides.length).keys(),
      ].map((idx) => {
        return (
          <Box
            key={idx}
            onClick={() => {
              instanceRef.current?.moveToIdx(idx)
            }}
            style={{width:13,height:13,background: currentSlide == idx ? "red" : "#eee",borderRadius:10,borderWidth:2,borderColor:"#ccc",borderStyle:"solid"}}
            className={"dot" + (currentSlide === idx ? " active" : "")}
          ></Box>
        )
      })}
    </Flex>
    )}
    
    </div>
    </div>
  );
};

export default SliderComponent;