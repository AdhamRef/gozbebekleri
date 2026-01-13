'use client';
import React, { useState, useEffect } from 'react';
import { Grid, Box, Text, Flex, Image, Button, Tabs, TabList, TabPanels, Tab, TabPanel,useMediaQuery,Alert,AlertIcon,AlertTitle,AlertDescription, } from '@chakra-ui/react';
import { useKeenSlider } from 'keen-slider/react';
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { LiaLongArrowAltRightSolid } from "react-icons/lia";
import Link from "next/link";
import {useLanguage,useLanguageBelirtec } from '@/main/utilities/language';
import BagisKutuButtonComponent from '../app/[locale]/BagisKutuButtonComponent';
import { FaSquare } from "react-icons/fa";
import BASE_API_URL from '@/main/utilities/config';

export default function FotoVideoGaleri({ fgaleridata,vgaleridata }) {
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
    });

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

    const TabDegistir = (index) => {
        setTabDegistirState(index);
    }

   
    return (
        <Flex direction={'row'} className='bagisKategorileri' gap={8}>
            
            <Tabs w={'100%'}>
                <TabList border={0} gap={7} alignItems={'center'} mb={8}>
                    <Tab p={0} width={'auto'} border={0} color={'#CECECE'} _selected={{border:'0px',color:'#7B2819'}}>
                        <Text fontSize={20} fontWeight={600} noOfLines={2} textAlign={'left'}>{message['anasayfa'].videogallery}</Text>
                    </Tab>
                </TabList>
                <TabPanels width={'100%'} mt={5}>
                    <TabPanel style={{padding:0}} width={"100%"}>
                        <Grid templateColumns={{base:'repeat(1,1fr)',lg:'repeat(4,1fr)'}} gap={6}>
                            {vgaleridata.slice(0,4).map((post, index) => {
                                let bagisimg = post.picture;
                                if (bagisimg === "") {
                                    bagisimg = "/default.jpg";
                                } else {
                                    bagisimg = "https://minberiaksa.org/uploads/" + post.picture;
                                }
                                return (
                                    <Box key={index} border={'3px solid #7B2819'} borderRadius={10} overflow={'hidden'}>
                                        <Link href={languageCode + "/" + post.url}>
                                            <Image objectFit='cover' src={bagisimg} width={'100%'} height="220" alt={post.name} />
                                        </Link>
                                        <Box p={4} bg={'#7B2819'} height={65}>
                                            <Link href={languageCode + "/" + post.url}>
                                                    <Text textAlign={'center'} color={'#fff'} noOfLines={2}>{post.title}</Text>
                                            </Link>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Grid>
                    </TabPanel>
                    {/* Diğer TabPanel içerikleri */}
                </TabPanels>
            </Tabs>
        </Flex>
    );
}
