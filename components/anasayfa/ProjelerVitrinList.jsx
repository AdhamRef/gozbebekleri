"use client";
import React, {useState} from 'react'
import { Container,Image,Box,Text,useMediaQuery,Flex,Button,Grid,GridItem,Progress,Input } from '@chakra-ui/react'
import { RiHeartAddLine } from "react-icons/ri";
import { MdAddShoppingCart } from "react-icons/md";
import { useKeenSlider } from 'keen-slider/react' // import from 'keen-slider/react.es' for to get an ES module
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import BagisKutuButtonComponent from '@/BagisKutuButtonComponent';
import { useAuth } from '@/components/LayoutProvider';
import Link from "next/link";
export default function ProjelerVitrinList({data}) {
    const [isMobile] = useMediaQuery("(max-width: 768px)");
    const [perViewNum,setPerViewNum] = useState(1);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const {parabirimLabel,parabirimi} = useAuth();

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
    });
    let messages = useLanguage();
    let languageCode = useLanguageBelirtec();

    const renkler = {
        parabirimi: "#FFFFFF",
        fiyat: '#DAF1F4',
        fiyattext: '#01404E',
        fiyathover: '#01404E',
        fiyattexthover: '#FFFFFF',
        input: '#DBF8FC',
        inputplaceholder: '#719DA7',
      };

    if(isMobile){
        return (
        <div ref={sliderRef} className="keen-slider">
        {data.map((post,index) => {
        let bagisimg = post.picture; 
        if(bagisimg == ""){
            bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
        }else{
            bagisimg = "https://minberiaksa.org/uploads/"+post.picture;
        }

        return (
        <div key={index} className="keen-slider__slide">
            <Flex w={'100%'} direction={'column'} bg={'#EEFDFF'} p={5} px={7} borderRadius={5} mt={5} gap={10}>
                <Image src={bagisimg} width={'100%'} height={300}/>
                <Flex width={'100%'} direction={'column'}>
                    <Text color={'black'} fontWeight={'bold'} fontSize={20} mt={5}>Donate for accessible healthcare services</Text>
                    <Text color={'black'} fontWeight={'500'} fontSize={18} mt={5}>Together, we can make a meaningful impact and transform lives.</Text>
                    <Progress my={8} mb={3} w={'100%'} minH={8} colorScheme={'blue'} bg={'#56C0D7'} value={80} borderRadius={10}  sx={{
                        '.css-i1aryf': {backgroundColor:'#08677B'}
                    }}/>
                    <Flex direction={'row'} justifyContent={'space-between'}>
                        <Box>
                            <Text fontSize={18} color='#04819C' fontWeight={500}>{post.totalDonate} {parabirimLabel}</Text>
                            <Text fontSize={12} color='#04819C' fontWeight={500}>{messages['bagislar'].target}: {post.hedeflenentutar} {parabirimLabel}</Text>
                        </Box>
                        <Box>
                            <Text fontSize={18} color='#04819C' textAlign={'right'} fontWeight={500}>{post.member}</Text>
                            <Text fontSize={12} color='#04819C' textAlign={'right'} fontWeight={500}>{messages['bagislar'].donetor}</Text>
                        </Box>
                    </Flex>
                    <Box py={0} position={'relative'} zIndex={10}>
                    <Flex direction="row" gap={"1"} mt={5}>
                        <Box className="parabirimi" color={'#04819C'}>$</Box>
                        <Box p={2} px={3} bg={'#DAF1F4'} borderRadius={5} color={'#04819C'}>5</Box>
                        <Box p={2} px={3} bg={'#DAF1F4'} borderRadius={5} color={'#04819C'}>20</Box>
                        <Box p={2} px={3} bg={'#DAF1F4'} borderRadius={5} color={'#04819C'}>50</Box>
                        <Box p={2} px={3} bg={'#DAF1F4'} borderRadius={5} color={'#04819C'}>100</Box>
                        <Box><Input className="tutargiriniz" placeholder='Tutar giriniz' border={0} height={'100%'} width={120} bg={'#DAF1F4'} color={'#04819C'}/></Box>
                    </Flex>
                    <Flex direction="row" gap={2} style={{position:'relative',marginTop:15}}>
                        <Button style={{height:38}} leftIcon={<MdAddShoppingCart color={'white'} size={20}/>} colorScheme='green' bg={'#026C83'} color={'white'} size="md" px="8" fontSize={12}  boxShadow='inner'>{messages['bagislar'].addtocart}</Button> 
                        <Button style={{height:38}} leftIcon={<RiHeartAddLine color={'white'} size={20}/>} colorScheme='green' bg={'#47C2DD'} color={'white'} size="md" px="8" fontSize={12}  boxShadow='inner'>{messages['bagislar'].donatenow}</Button> 
                    </Flex>
                    </Box>
                </Flex>
            </Flex>
        </div>
        )})}
        </div>
        )
    }else{
    return (
    <Flex direction={'column'} mt={10}>
        <Grid className={"vitrinProjeler"} w={'100%'} templateColumns='repeat(2, 1fr)' gap={6}>
        {data.slice(0,2).map((post,index) => { 
        let bagisimg = post.picture; 
        if(bagisimg == ""){
            bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
        }else{
            bagisimg = "https://minberiaksa.org/uploads/"+post.picture;
        }
        
        return (
            <GridItem key={index} className='projeItem' w='100%' bg='blue.500' borderRadius={10} overflow={'hidden'} position={'relative'}>
                <Link href={languageCode+"/d/"+post.url}><Box bgImage={`url(${bagisimg})`} bgSize={'cover'} bgPos={'center'} width={'100%'} height={370} /></Link>
                <Flex className='araclar' direction='column' width={'100%'} height={'150px'} bg={'#04819C'} p={7} position={'absolute'}  bottom={0} transition={"all .5s"} transform={"translateY(0px)"} _hover={{height:'100%',transition:'all .5s',transform:'translateY(0px)'}}>
                    <Link href={languageCode+"/d/"+post.url}><Text color={'white'} fontWeight={'bold'} fontSize={18}>{post.name}</Text></Link>
                    <Progress my={5} mb={3} minH={'8px'} overflow={'visible'} w={'100%'} height={'8px'} colorScheme={'blue'} bg={'#56C0D7'} value={80} borderRadius={10}  sx={{
                        '.css-i1aryf': {height:'8px',backgroundColor:'#08677B'}
                    }}/>
                    <Flex direction={'row'} justifyContent={'space-between'}>
                        <Box>
                            <Text fontSize={18} color='#98EDFF' fontWeight={500}>{post.totalDonate} {parabirimLabel}</Text>
                            <Text fontSize={12} color='#98EDFF' fontWeight={500}>{messages['bagislar'].target}: {post.hedeflenentutar} {parabirimLabel}</Text>
                        </Box>
                        <Box>
                            <Text fontSize={18} color='#98EDFF' textAlign={'right'} fontWeight={500}>{post.member}</Text>
                            <Text fontSize={12} color='#98EDFF' textAlign={'right'} fontWeight={500}>{messages['bagislar'].donetor}</Text>
                        </Box>
                    </Flex>
                    <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} renkler={renkler} />
                </Flex>
            </GridItem>
        )})}
        </Grid>
        {data.slice(2,1).map((post,index) => {
        let renkler2 = {
        parabirimi: "#04819C",
        fiyat: '#DAF1F4',
        fiyattext: '#04819C',
        fiyathover: '#01404E',
        fiyattexthover: '#FFFFFF',
        input: '#DBF8FC',
        inputplaceholder: '#719DA7',
        };
        let bagisimg = post.picture; 
        if(bagisimg == ""){
            bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
        }else{
            bagisimg = "https://minberiaksa.org/uploads/"+post.picture;
        }
        return (
        <Flex key={index} w={'100%'} direction={'row'} bg={'#EEFDFF'} p={5} px={7} borderRadius={5} mt={5} gap={10}>
            <Flex width={'55%'} direction={'column'}>
                <Text color={'black'} fontWeight={'bold'} fontSize={20} mt={5}>{post.name}</Text>
                <Text color={'black'} fontWeight={'500'} fontSize={18} mt={5}>{post.name}</Text>
                <Progress my={8} mb={3} w={'100%'} colorScheme={'blue'} bg={'#56C0D7'} value={80} borderRadius={10}  sx={{
                    '.css-i1aryf': {backgroundColor:'#08677B'}
                }}/>
                <Flex direction={'row'} justifyContent={'space-between'}>
                    <Box>
                        <Text fontSize={18} color='#04819C' fontWeight={500}>{post.totalDonate} {parabirimLabel}</Text>
                        <Text fontSize={12} color='#04819C' fontWeight={500}>{messages['bagislar'].target}: {post.hedeflenentutar} {parabirimLabel}</Text>
                    </Box>
                    <Box>
                        <Text fontSize={18} color='#04819C' textAlign={'right'} fontWeight={500}>{post.member}</Text>
                        <Text fontSize={12} color='#04819C' textAlign={'right'} fontWeight={500}>{messages['bagislar'].donetor}</Text>
                    </Box>
                </Flex>
                <BagisKutuButtonComponent bagisid={post.token} bagisfiyat={post.tutar} bagistipi={post.kind} bagisItem={post} renkler={renkler2} />
                
            </Flex>
            <Image src={bagisimg} width={'45%'} height={350}/>
        </Flex>
        )})}
    </Flex>
    )
}
}
