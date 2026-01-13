'use client';
import React,{useEffect, useState}from 'react'
import { Grid,GridItem,Flex,Box,Text,Image,Tabs,TabList,TabPanels,Tab,TabPanel,Alert,AlertIcon,AlertTitle,AlertDescription,} from '@chakra-ui/react'
import BagisKutuButtonComponent from '@/BagisKutuButtonComponent';
import Link from 'next/link'
import { FaSquare } from "react-icons/fa6";
import "@/main/styles/styles.css";
import LottieAnimation from '@/components/LottieAnimation';
import loadingGif from '@/dosyalar/loadingGif.json';
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";

export default function BagisKatTabs({donatecats,secilenkat}) {
    const [tabIndex, setTabIndex] = useState(0)
    const [donatePosts, setDonatePosts] = useState({});
    const [donatePostsStatus, setDonatePostsStatus] = useState({});
    const [donatePostsLoad, setDonatePostsLoad] = useState(true);
    const [secilenKatState, setSecilenKatState] = useState();
    let donatesposts;
    let message = useLanguage();
    let dil = useLanguageBelirtec();
    let dilfetch = dil.replace("/","");
    if(dilfetch==""){
        dilfetch = "tr";
    }
    const fetchData = async (katid) => {
        //const donates = await customFetch({type:'donateswcatid',id:katid});
        // apinr
        let url = '/api/kategoriListe';
        let urlbody = JSON.stringify({ type: "donates", id: katid });
        let response = await fetch(url, { // URL'yi tam formatta kullanın
            cache: "no-store",
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': dilfetch,
            },
            body: urlbody,
        });
        // Veriyi JSON formatına dönüştür
        let posts = await response.json()
        setDonatePostsStatus(posts['status']);
        setDonatePosts(posts['data']);
        setDonatePostsLoad(false);
    }
    
    const handleTabsChange = async (index) => {
        setDonatePostsLoad(true);
        setTabIndex(index);
        let catid = donatecats[index].token;
        setSecilenKatState(catid);
        await fetchData(catid)
    }
   

    useEffect(() => {
        if(secilenkat != undefined){
            const tabIndex = donatecats.findIndex((post) => post.token === secilenkat); // `donatecats` dizisinde `data-id` ile eşleşen index'i buluyoruz.
            setSecilenKatState(secilenkat);
            setTabIndex(tabIndex);
            fetchData(secilenkat);
        }else{
            handleTabsChange(0);
        }

    }, []); // Boş bir bağımlılık dizisi, useEffect'in yalnızca ilk render'da çalışmasını sağlar
    


  return (
    <>
    <Flex width={"100%"} direction={'row'} justifyContent={'flex-start'} gap={5} mt={3} overflowX={{base:'scroll',lg:'hidden'}} flexWrap={{base:'nowrap',lg:'wrap'}}>
    {donatecats.map((post,index) => {
        let katimg;
        if(post.iconimage1){
            katimg= "https://minberiaksa.org/uploads/"+post.iconimage1;
        }else{
            katimg = "https://minberiaksa.org/uploads/icon1.png";
        }
        return ( 
        <Box key={index} height={{base:'auto',lg:'100%'}}><Link href={dil+"/"+post.url} style={{display:'flex',height:'100%'}}>
            <Flex width={{base:'120px',lg:'auto'}}  height={{base:'auto',lg:'100%'}} direction={{base:'column',lg:'row'}} style={{display:'flex',gap:15,flex:1,boxSizing:'border-box',}} p={3} px={'15px'} borderRadius={10} alignItems={'center'} justifyContent={'center'} bgColor={secilenKatState==post.token ? '#C98624' : '#a59d9d' }>
            <Image src={katimg} w={'30px'} h={'auto'}/>
            <Text color={'white'} fontSize={16} fontWeight={600} textAlign={{base:'center',lg:'left'}}>{post.name}</Text>
        </Flex></Link></Box>
        
    )})}
    </Flex>
    <Tabs w={'100%'}  overflow={'hidden'} index={tabIndex} onChange={handleTabsChange}>
       
        <TabPanels pb={5} >

        {donatecats.map((postcat,indexcat) => ( 
            <TabPanel p={0} key={indexcat}   >
            {donatePosts && 
                donatePosts.length > 0 && 
                <div>

                <div style={{ paddingBottom: '20px', paddingTop: '20px', fontSize: '20px', lineHeight: '160%' }} dangerouslySetInnerHTML={{__html:postcat.summary}} />

                <Grid className='BagisKutular' templateColumns={{base:'repeat(1, 1fr)', sm:'repeat(2, 1fr)', lg:'repeat(3, 1fr)' }}   gap={3} >
                {donatePosts.map((post,index) => {
                    let bagisimg = post.picture;
                    if(bagisimg == ""){
                        bagisimg = "https://minberiaksa.org/uploads/bagis1.jpg";
                    }else{
                        bagisimg = "https://minberiaksa.org/uploads/"+bagisimg;
                    }
                    return(
                        <Box className="BagisKutu" key={index}>
                        <Link href={dil + "/" + post.url}>
                        <Box
                            width="100%"
                            height="390px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bg="#f7f7f7"
                            overflow="hidden"
                        >
                            <Image
                            src={bagisimg}
                            alt={post.name}
                            objectFit="contain"
                            width="100%"
                            height="100%"
                            />
                        </Box>
                        </Link>

                        <Box className="bilgi">
                            <Link href={dil + "/" + post.url}>
                            <Flex direction="row" alignItems="flex-start" gap={2}>
                                <FaSquare style={{ marginTop: 4 }} />
                                <Text className="baslik" height={42} noOfLines={2}>
                                {post.name}
                                </Text>
                            </Flex>
                            </Link>

                            <BagisKutuButtonComponent
                            bagisid={post.token}
                            bagisfiyat={post.tutar}
                            bagistipi={post.kind}
                            bagisItem={post}
                            />
                        </Box>
                        </Box>

                )})}
                </Grid>
            </div>

            }

            {!donatePostsStatus && 
                <Alert status='warning'>
                <AlertIcon />
                <AlertTitle>{message.nodonationsinthiscat}</AlertTitle>
                </Alert>
            }

            {donatePostsLoad &&
                <Flex justifyContent={'center'}><LottieAnimation animationData={loadingGif} style={{ width: 120, height: 120 }} /></Flex>
            }
            </TabPanel>
        ))}
        </TabPanels>
    </Tabs>
    </>

  )
}
