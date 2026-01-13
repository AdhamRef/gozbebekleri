'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Box, Text, Flex, Image, Button, Tabs, TabList, TabPanels, Tab, TabPanel,useMediaQuery,Alert,AlertIcon,AlertTitle,AlertDescription, } from '@chakra-ui/react';
import { useKeenSlider } from 'keen-slider/react';
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { LiaLongArrowAltRightSolid } from "react-icons/lia";
import Link from "next/link";
import {useLanguage,useLanguageBelirtec } from '@/main/utilities/language';
import BagisKutuButtonComponent from '../app/[locale]/BagisDonenKutuComponent';
import { FaSquare } from "react-icons/fa";
import BASE_API_URL from '@/main/utilities/config';

export default function BagisKategoriAlaniComp({ data }) {
    const [isMobile] = useMediaQuery("(max-width: 768px)");
    const [perViewNum, setPerViewNum] = useState(3);
    const [perViewNum2, setPerViewNum2] = useState(1);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [bagisKategorileri, setBagisKategorileri] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [tabDegistirState,setTabDegistirState] = useState(0);
    const [bagislarLoaded, setBagislarLoaded] = useState(false);
    const { name, email, mtoken, gsm, paymenttoken } = useSelector((state) => state.oturum);
    const dispatch = useDispatch();
    let message = useLanguage();
    let languageCode = useLanguageBelirtec();
    let dilfetch = languageCode.replace("/","");
    if(dilfetch==""){
        dilfetch = "tr";
    }

    const AdaptiveHeight = (slider) => {
    function updateHeight() {
        slider.container.style.height =
        slider.slides[slider.track.details.rel].offsetHeight + "px";
    }
    slider.on("created", updateHeight);
    slider.on("slideChanged", updateHeight);
    };


    const [sliderRef, instanceRef] = useKeenSlider({
        initial: 0,
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
        created() {
            setLoaded(true);
        },
        slides: {
            perView: perViewNum,
            spacing: 15,
            mode: "free",
        },
    }
    );

    const [sliderRefBagislar, instanceRefBagislar] = useKeenSlider({
        initial: 0,
        slideChanged(slider) {
            setCurrentSlide(slider.track.details.rel);
        },
        created() {
            setLoaded(true);
        },
        slides: {
            perView: perViewNum2,
            spacing: 15,
            mode: "free",
        },
    });

    useEffect(() => {
        async function fetchDataAndProcess() {
            const updatedCategories = [];
            await Promise.all(data.slice(0, 10).map(async (post, index) => {
                const urlbody = JSON.stringify({ type: "donates", id: post.token });
                const response = await fetch('/api/kategoriListe', {
                    cache: 'no-store',
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Accept-Language': dilfetch,
                    },
                    body: urlbody
                });
                const posts = await response.json();
                updatedCategories[index] = posts || []; // API'den gelen veriyi kontrol et
            }));
            setBagisKategorileri(updatedCategories);
            setBagislarLoaded(true); // Veriler yüklendiğinde 'bagislarLoaded' true yapılır
            setTabDegistirState(0);
        }

        fetchDataAndProcess();
        if (instanceRefBagislar.current) {
            instanceRefBagislar.current.update();
        }
    }, [data]);

    const TabDegistir = (index) => {
            setTabDegistirState(index);
    }

    useEffect(() => {
        if (instanceRefBagislar.current) {
            instanceRefBagislar.current.update();
        }
    }, [tabDegistirState,bagisKategorileri]);
    

    if (isMobile) {
        return (
            <>
               
                <Box className='bagisKategorileri' gap={8} style={{width:'100%'}}>
                <Box gap={3} p={2} mb={5} px={7} alignItems={'center'} justifyContent={'center'} bg={'#F4F4F4'} borderRadius={40}>
                    <Text color={'black'} fontSize={18} fontWeight={600} noOfLines={2} textAlign={'left'} textTransform={'uppercase'}>{message.projects}</Text>
                </Box>
                
                {loaded && instanceRef.current && (
                    <>
                        <Flex direction={"row"} gap={2} zIndex={5} justifyContent={'flex-end'} width={'full'} mb={5} className='rowreversertl'>
                            <Button variant={"none"} p={0} px={1} textAlign={'center'} fontSize={15} borderRadius={5} bg={'#FFF'} boxShadow={'md'} color={"#1197B5"} onClick={(e) => e.stopPropagation() || instanceRef.current?.prev()}><IoIosArrowBack /></Button>
                            <Button variant={"none"} p={0} px={1} textAlign={'center'} fontSize={15} borderRadius={5} bg={'#FFF'} boxShadow={'md'} color={"#1197B5"} onClick={(e) => e.stopPropagation() || instanceRef.current?.next()}><IoIosArrowForward /></Button>
                        </Flex>
                    </>
                )}
                <Tabs w={'100%'} onChange={(index) => TabDegistir(index)}>
                <TabList border={0} gap={3}>
                <div ref={sliderRef} className="keen-slider" style={{ width: '100%' }}>
                    {data && data.map((post, index) => {
                        let iconimage1 = post.picture;
                        if (iconimage1 === "") {
                            iconimage1 = "/default.jpg";
                        } else {
                            iconimage1 = "https://minberiaksa.org/uploads/" + post.iconimage1;
                        }
                        return(
                        <Tab key={index} p={0} width={'100%'} borderRadius={5} className="keen-slider__slide" style={{borderColor:'#fff'}}>
                            <Flex direction={'column'} gap={3} p={3} px={3} width={'100%'} alignItems={'center'} justifyContent={'center'} bg={tabDegistirState==index ? "#48c2ff" : "#F5F5F5"}>
                                {post.iconimage1 && <Image src={"https://minberiaksa.org/uploads/" + post.iconimage1} w={35} h={35} />}
                                <Text color={'black'} fontSize={14} fontWeight={500} noOfLines={3} textAlign={'left'} height={'40px'}>{post.name}</Text>
                            </Flex>
                        </Tab>
                    )})}
                    </div>
                </TabList>
               
                <Box width={'100%'} mt={5}>
                        <div ref={sliderRefBagislar} className="keen-slider" style={{ width: '100%' }}>
                            {bagislarLoaded && bagisKategorileri[tabDegistirState] && bagisKategorileri[tabDegistirState]['data']?.slice(0,6).map((post, index) => {
                                let bagisimg = post.picture;
                                if (bagisimg === "") {
                                    bagisimg = "/default.jpg";
                                } else {
                                    bagisimg = "https://minberiaksa.org/uploads/" + post.picture;
                                }
                                return (
                                    <Box key={index} className="keen-slider__slide BagisKutu">
                                        <Box>
                                        <Link href={languageCode + "/" + post.url}>
                                            <Image objectFit='cover' src={bagisimg} fill={true} borderRadius={10} alt={post.name} />
                                        </Link>
                                        <Box className="bilgi">
                                            <Link href={languageCode + "/" + post.url}>
                                                <Flex direction={"row"} alignItems={'center'} gap={2} height={'40px'}>
                                                    <FaSquare className="baslikikon"/>
                                                    <Text className="baslik">{post.name}</Text>
                                                </Flex>
                                            </Link>
                                            <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} />
                                        </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                            </div>
                        {/* Diğer TabPanel içerikleri */}
                </Box>
                </Tabs>
                </Box>
            </>
        );
    } else {
        return (
            <Flex direction={'row'} className='bagisKategorileri' w={'100%'} gap={8} >
                
                <Tabs w={'100%'}>
                    <TabList border={0} gap={3} alignItems={'center'}>
                        <Box gap={3} p={2} px={7} width={'auto'} height={35} alignItems={'center'} justifyContent={'center'} bg={'#F4F4F4'} borderRadius={40}>
                            <Text color={'black'} fontSize={14} fontWeight={600} noOfLines={2} textAlign={'left'} textTransform={'uppercase'}>{message.projects}</Text>
                        </Box>
                        {data.slice(0, 10).map((post, index) => {
                            return (
                            <Tab key={index} p={0} width={'auto'} border={0} bg={'#D1CBCB'} borderRadius={15} _selected={{border:'0px',bg:'#6CAA2F'}} flex={1}>
                                <Flex direction={'row'} gap={3} p={5} px={3} width={'100%'} height={"100%"} alignItems={'center'} justifyContent={'center'} >
                                {post.iconimage1 &&  <Image src={"https://minberiaksa.org/uploads/" + post.iconimage1} w={25} h={25} /> }
                                    <Text color={'#fff'} fontSize={12} fontWeight={500} noOfLines={2} textAlign={'left'}>{post.name}</Text>
                                </Flex>
                            </Tab>
                        )})}
                    </TabList>
                    <TabPanels width={'100%'} mt={5}>
                    {data.slice(0, 10).map((post, index) => (
                        <TabPanel key={index} style={{padding:0}} width={"100%"}>
                        {bagislarLoaded && bagisKategorileri[index] && bagisKategorileri[index]['status']==true ? 
                        <>
                        <Flex direction={"row"} gap={3} alignItems={'center'} my={8}>
                            <LiaLongArrowAltRightSolid size={28} color={'#6CAA2F'} className='arrowiconrtl'/><Text fontSize={22} fontWeight={600} color={'#6CAA2F'}>{bagisKategorileri[index]['data'][0]['category']['title']}</Text>
                        </Flex>
                        <Grid templateColumns={'repeat(3,1fr)'} gap={6}>
                            {bagislarLoaded && bagisKategorileri[index]['data']?.slice(0,3).map((post, index) => {
                                let bagisimg = post.picture;
                                if (bagisimg === "") {
                                    bagisimg = "/default.jpg";
                                } else {
                                    bagisimg = "https://minberiaksa.org/uploads/" + post.picture;
                                }
                                return (
                                    <Box key={index} className="BagisKutu">
                                        <Link href={languageCode + "/" + post.url}>
                                            <Image objectFit='cover' src={bagisimg} width={380} height={380} borderRadius={10} alt={post.name} />
                                        </Link>
                                        <Box className="bilgi">
                                            <Link href={languageCode + "/" + post.url}>
                                                <Flex direction={"row"} alignItems={'center'} gap={2} height={'40px'}>
                                                    <FaSquare className="baslikikon" color={'#AA422F'}/>
                                                    <Text className="baslik">{post.name}</Text>
                                                </Flex>
                                            </Link>
                                            <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} />
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Grid>
                        </>
                        :
                        <Box width={'100%'} height={300}>
                        <Alert status='warning' mt={'4em'}>
                            <AlertIcon />
                            {message.nodonationsinthiscat}
                        </Alert>
                        </Box>
                        }
                        </TabPanel>
                    ))}
                        {/* Diğer TabPanel içerikleri */}
                    </TabPanels>
                </Tabs>
            </Flex>
        );
    }
}
