"use client";
import React,{useState} from 'react'
import { Box,Text,Heading,Image,Button,Flex,useMediaQuery} from '@chakra-ui/react'
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import { IoIosArrowForward,IoIosArrowBack  } from "react-icons/io";
import {useLanguage, useLanguageBelirtec} from "@/main/utilities/language";
import Link from "next/link";

const AdaptiveHeight = (slider) => {
    function updateHeight() {
      slider.container.style.height =
        slider.slides[slider.track.details.rel].offsetHeight + "px";
    }
    slider.on("created", updateHeight);
    slider.on("slideChanged", updateHeight);
  };

export default function HaberlerItemsComponent({data}) {
    const [isMobile] = useMediaQuery("(max-width: 768px)");
    const [perViewNum,setPerViewNum] = useState(1);
    const [currentSlide, setCurrentSlide] = useState(0)
    const [loaded, setLoaded] = useState(false);
    const [sliderRef, instanceRef] = useKeenSlider({
    initial: 0,
    slideChanged(slider) {
        setCurrentSlide(slider.track.details.rel)
    },
    created() {
        setLoaded(true)
    },
    slides: {
        perView:perViewNum,
        spacing: 15,
        mode: "free",
    },
    plugins: [AdaptiveHeight]
    });
    let messages = useLanguage();
    let lang = useLanguageBelirtec();

    const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));


    if(isMobile){
        return(
            <Box>
                <Flex direction={"row"} justifyContent={"space-between"} py={5}>
                    <Heading className="projeleranabaslik" color={'#04819C'} fontSize={25} bg={'#fff'} paddingRight={5} zIndex={2}>{messages['anasayfa'].news}</Heading>
                    {loaded && instanceRef.current && (
                    <>
                        <Flex direction={"row"} gap={2} zIndex={5} position={'relative'}>
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
            <Flex w={"100%"} gap="10" className="haberlerliste">
                <div ref={sliderRef} className="keen-slider">
                {sortedData.map((post,index) => (
                    <div key={post.id} className="keen-slider__slide">
                        <Box key={post.id} borderRadius={5} className="haberlerbox">
                            <Link href={lang+"/"+post.url}><Image objectFit='cover' borderRadius={10} src={"https://minberiaksa.org/uploads/"+post.picture} minW={"100%"} maxH={350} /></Link>
                            <Flex direction={"column"} my={10} gap={10}>
                            <Text color={"#04819C"} fontWeight={700} fontSize={18} display={{base:'none',lg:'block'}}>Seminerler</Text>
                            <Link href={lang+"/"+post.url}><Text className="post-title" style={{fontSize:18,fontWeight:600}}>{post.title}</Text></Link>
                            <Text>{post.summary}</Text>
                            <Button w={120} colorScheme='yellow' borderColor={'#04819C'} color={'#04819C'} variant='outline'>
                                {messages.readmore}
                            </Button>
                            </Flex>
                        </Box>
                    </div>
                ))}
                </div>
            </Flex>
            </Box>
        )
    }else{
        return (
            <Box minWidth={'100%'}>
            <Box mb={10}>
                <Heading size='lg' color={"#C98624"}>{messages['anasayfa'].news}</Heading>
            </Box>
            <Flex w={"100%"} gap="10" className="haberlerliste">
                <Flex width={"100%"} direction={"row"} gap={5}>
                {sortedData.slice(0,3).map((post,index) => (
                    index > 0 && index <= 2 && (
                    <Box flex={1} key={post.id} borderRadius={5}  className="haberlerbox"  _odd={{
                    '.categorybadge': {bg:'#ae3e30'},
                    '.datebadge': {bg:'#ff8576',color:'#fff'}
                    }} _even={{
                    '.categorybadge': {bg:'#DA9534'},
                    '.datebadge': {bg:'#FEE7C6'}
                    }} >
                        <Link href={lang+"/"+post.url}><Image objectFit='cover' width={'100%'} height={200} src={"https://minberiaksa.org/uploads/"+post.picture} borderRadius={20}/></Link>
                        <Flex direction={"row"} my={5} gap={0}>
                            <Flex className='datebadge' direction={'column'} bg={'#B1FFE3'} p={2} borderRadius={10} borderTopRightRadius={0}>
                                <Text fontSize={16} textAlign={'center'} fontWeight={600}>14</Text>
                                <Text fontSize={14} textAlign={'center'} fontWeight={600}>MRT</Text>
                            </Flex>
                            <Flex direction={'column'} alignItems={'flex-start'}>
                                <Text className='categorybadge' width={'auto'} color={"#FFF"} fontWeight={200} fontSize={12} bg={'#29C68D'} p={1} px={2} flexShrink={0}>Seminerler</Text>
                                <Link href={lang+"/"+post.url}><Text className="post-title" style={{fontSize:15,fontWeight:600}} p={1} px={2} noOfLines={1}>{post.title}</Text></Link>
                            </Flex>
                        </Flex>
                    </Box>
                    )
                ))}
                </Flex>
            </Flex>
            </Box>
        )
    }
}
