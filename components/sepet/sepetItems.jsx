"use client";
import React,{useState,useEffect,useRef} from 'react'
import { Box,Image,Container,Flex,Text,Button,useToast,Tag,TagLabel,TagLeftIcon,Spinner,Input, IconButton, Tooltip, useDisclosure,NumberInput, NumberInputField, InputGroup, InputLeftAddon, Collapse} from '@chakra-ui/react'
import { BsBagFill,BsFillTrashFill} from "react-icons/bs";
import Link from 'next/link'
import emptycart from "@/dosyalar/empty-cart.json";
import dynamic from 'next/dynamic';
import { TbCreditCardPay } from "react-icons/tb";
import {useDispatch,useSelector} from 'react-redux';
import {sepetAzalt} from '@/redux/slices/sepetSlice';
import { useModal } from '../../app/[locale]/ModalContext';
import {SepeteEkleFetch} from "@/main/utilities/bagisFunc";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import { useAuth } from '@/components/LayoutProvider';
import {oturumGuncelle} from '@/redux/slices/oturumSlice';
import {sepetTemizle} from '@/redux/slices/sepetSlice';
import { FaCheck } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";

import Swal from 'sweetalert2'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function SepetItems() {
    const [SepetSayisiq,setSepetSayisiq] = useState(1);
    const [sepetLoading,setSepetLoading] = useState(true);
    const [productDetails, setProductDetails] = useState([]); // Ürün detayları
    const [sepetBilgisi,setSepetBilgisi] = useState();
    const [Sepetlerd,setSepetlerd] = useState();
    const [sepetVerisi,setSepetVerisi] = useState({});
    const [sepetVerisiOrj,setSepetVerisiOrj] = useState({});
    const [adettetikle,setAdetTetikle] = useState(0);
    const [totalPrice,setTotalPrice] = useState(0);
    const [sepetBagisKaldirDurum,setBagisKaldirDurum] = useState(0);
    const [editedItem, setEditedItem] = useState(null);
    const [yeniFiyat, setYeniFiyat] = useState(null);
    const {bagisDuzenle,isModalOpen} = useModal();
    const { isOpen, onToggle } = useDisclosure();
    const flexRef = useRef(null); // Flex alanını takip etmek için


    const [sepetItemIslem,setSepetItemIslem] = useState({
        status: false,
        index: null
    });
    let messages = useLanguage();
    let dil = useLanguageBelirtec();
    let dilfetch = dil.replace("/","");;
    if(dilfetch==""){
        dilfetch = "tr";
    }
    
    let odemelinki = dil+"/odeme";
    if(dil!=""){odemelinki = dil+"/payment";}

    const Toast = useToast();
    const dispatch = useDispatch();
    const {name,email,mtoken,gsm,paymenttoken,membertoken,membertype} = useSelector((state) => state.oturum);
    const {parabirimLabel,parabirimi} = useAuth();

  
    const sepettenkaldir = async (index, basketitem) => {
        /*const newSepet = [...sepetVerisi];
        newSepet.splice(index, 1);
        setSepetVerisi(newSepet);*/
        setSepetItemIslem({status:true,index:index});
        try{
        let sepetaddbody = {};
        sepetaddbody['paymenttoken'] = paymenttoken;
        sepetaddbody['membertoken'] = membertoken;
        sepetaddbody['membertype'] = membertype;
        sepetaddbody['baskettoken'] = basketitem.baskettoken;
        sepetaddbody['key'] = basketitem.key;
        sepetaddbody['events'] = 'remove';
        const response_ham = await fetch('/api/sepet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Verinin JSON formatında olduğunu belirt
                'Accept-Language': dilfetch,
            },
            body: JSON.stringify(sepetaddbody),
        });
        let response = await response_ham.json();
        if(response.status){
            dispatch(sepetAzalt());
            Toast({
                title: messages.itemsuccessfullremoved,
                status: "success",
                isClosable: true,
                position: 'bottom-right',
            });
            setSepetItemIslem({status:false,index:null});
            setBagisKaldirDurum(sepetBagisKaldirDurum+1);
           // tumSepetFetch();
        }else{
            Toast({
                title: messages.itemfailedremoved,
                status: "error",
                isClosable: true,
                position: 'bottom-right',
            })
            setSepetItemIslem({status:false,index:null});
        }
        }catch(error){
        console.log(error)
        }
    };

    const fiyatDegistirmeChange = (index,value) => {
        setEditedItem(index);
        setYeniFiyat(value);
    };
  
    const adetsayisidegistir = async (tip,index,mevcutadet,bagisItem) => {
        const newSepet = [...sepetVerisi];
        setSepetItemIslem({status:true,index:index});
        let yeniadet = tip === 0 ? mevcutadet-1 : mevcutadet+1;
        let bagisname = bagisItem.personname;
        let bagisphone = bagisItem.personphone;
        let bagisemail = bagisItem.personemail;
        let bagiskimadina = bagisItem.persontype;

        try{
        let sepetresponse = await sepetguncellemefetch(bagisname,bagisemail,bagisphone,bagiskimadina,bagisItem,yeniadet);
        if(sepetresponse.status){
            Toast({
                title: `Bağış başarıyla güncellenmiştir`,
                status: "success",
                isClosable: true,
                position: 'bottom-right',
            });
            setAdetTetikle(adettetikle+1);
            setSepetItemIslem(false);
            setSepetItemIslem({status:false,index:null});

        }else{
            Toast({
                title: `Bağış güncellenememiştir`,
                status: "error",
                isClosable: true,
                position: 'bottom-right',
            })
            setSepetItemIslem({status:false,index:null});
        }
        }catch(error){
        console.log(error)
        }

        newSepet[index].quantity = yeniadet;
        setSepetVerisi(newSepet);
    };

    const fiyatDegistirme = async (index,mevcutadet,bagisItem) => {
        let yfiyat = yeniFiyat;
        let bagisname = bagisItem.personname;
        let bagisphone = bagisItem.personphone;
        let bagisemail = bagisItem.personemail;
        let bagiskimadina = bagisItem.persontype;

        if(yfiyat == "" || yfiyat == "0"){
            Swal.fire({
                icon: "error",
                html: "<strong>"+messages.pleaseentertheamount+"</strong>",
                padding: "0px 0px 20px 0px",
                showConfirmButton: false,
                width: "350px",
                timer: 1500,
                allowOutsideClick: () => {
                Swal.close();
                return false; // Explicitly return false to handle `allowOutsideClick`.
                }
            });
            return false;
        }

        setSepetItemIslem({status:true,index:index});

        try{
        let sepetresponse = await sepetguncellemefetch(bagisname,bagisemail,bagisphone,bagiskimadina,bagisItem,yfiyat);
        if(sepetresponse.status){
            Toast({
                title: messages.donatesuccessfullupdate,
                status: "success",
                isClosable: true,
                position: 'bottom-right',
            });
            setAdetTetikle(adettetikle+1);
            setSepetItemIslem({status:false,index:null});
            setEditedItem(null);

        }else{
            Toast({
                title: messages.donatefailedupdate,
                status: "error",
                isClosable: true,
                position: 'bottom-right',
            })
            setSepetItemIslem({status:false,index:null});
            setEditedItem(null);
        }
        }catch(error){
          console.log(error)
        }
    };
      

    const tumSepetFetch = async () => {
        if(paymenttoken && membertoken && membertype && parabirimi){
        const response_ham = await fetch('/api/sepetall', { // 'api/sepetall' olarak düzelttim
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
                'Accept-Language': dilfetch,
            },
            cache: 'no-store',
            body: JSON.stringify({
                paymenttoken: paymenttoken,
                membertoken: membertoken,
                membertype: membertype,
                currency: parabirimi
            }),
        });
        const response = await response_ham.json();


        if(response.status==true){
            setSepetBilgisi(response.summary);
            setSepetVerisi(response.basket);
            setSepetVerisiOrj(response.basket);
            setSepetLoading(false);

        }else if(response.status=="clean"){
            dispatch(oturumGuncelle({paymenttoken:""}));
            dispatch(sepetTemizle());
            localStorage.setItem('paymenttoken',"");
        }else{
            Toast({
                title: `Server Error`,
                status: "error",
                isClosable: true,
                position: 'bottom-right',
            });
        }
        }
    };

    useEffect(() => {
        tumSepetFetch();
    }, []);

    useEffect(() => {
    }, [sepetVerisi]);

    useEffect(() => {
        tumSepetFetch();
    }, [adettetikle,isModalOpen,sepetBagisKaldirDurum]);
      
    const sepetguncellemefetch = async (bname,bemail,bgsm,kimadina,bagisItem,price='0') => {
    let bagisprice;
    if(price == 0){
        bagisprice = bagisItem.price;
    }else{
        bagisprice = price;
    }
    let bagistipi = bagisItem.priceType;
    if(bagistipi == "1"){
        bagisprice = price;
    }
    let bagiskey = bagisItem.key;
    let bagisbaskettoken = bagisItem.baskettoken;
    let duzenlibagisBilgileri = "";
    if(bagisItem.regular_payment=="1"){
        duzenlibagisBilgileri = {
            regular_repeat: bagisItem.regular_repeat,
            regular_repeatDay: bagisItem.regular_repeatDay
        }
    }
    let sepetGuncelle = await SepeteEkleFetch(dilfetch,bname,bemail,bgsm,kimadina,bagisprice,parabirimi,dispatch,paymenttoken,membertoken,membertype,bagistipi,bagiskey,'change',bagisbaskettoken,duzenlibagisBilgileri);
    return sepetGuncelle;
    }
    
    const modalac = async (index,kimadina,basketitem,bagisitem,bagistipi) => {
    let bagiskey = basketitem.key;
    if(kimadina == 0){
        let sepetresponse = await sepetguncellemefetch(name,email,gsm,kimadina,basketitem);
        if(sepetresponse.status){
            let sepetyeni = [...sepetVerisi];
            sepetyeni[index]['persontype'] = kimadina;
            setSepetVerisi(sepetyeni);
            Toast({
                title: `Bağış başarıyla güncellenmiştir`,
                status: "success",
                isClosable: true,
                position: 'bottom-right',
            });
        }else{
            Toast({
                title: `Bağış güncellenememiştir`,
                status: "error",
                isClosable: true,
                position: 'bottom-right',
            });
        }
    }else{
        bagisDuzenle(bagiskey,basketitem,kimadina,bagisitem,bagistipi);    
    }
        
    }

    const handleKeyDown = (event) => {
        const invalidChars = ['+', '-']; // + ve - karakterlerine izin verme
        if (invalidChars.includes(event.key)) {
        event.preventDefault();
        }
    };

if (sepetLoading || (!sepetVerisi || sepetVerisi.length < 1)) {
    return (
        <Flex direction={"column"} justifyContent={"center"} alignItems={"center"}>
        <Lottie renderer='svg' style={{width:180}} fontSize="12" animationData={emptycart} loop={false} />
        <Text fontSize={24} fontWeight={500} mt={-5}>{messages.cartisemptytitle}</Text>
        <Text w={"40%"} fontSize={15} fontWeight={400} mt={4} mb={10} textAlign={"center"} >{messages.cartemptywarn}</Text>
        </Flex>
    )
}else{
  return (
    <>
    <Flex style={{width:"100%",borderBottomWidth:1,borderColor:"#eee"}} direction="column" justify={"space-between"} gap={3}>
    {  sepetVerisi &&
        sepetVerisi.length > 0 && sepetVerisi.map((basketItem, index) => {
    let bagisItem = "";
    let itembaslik = basketItem.name;
    let bagistipi = basketItem.priceType;
    let itemgorsel = basketItem.picture;
    let bagispersontype = basketItem.persontype;
    let bagisbaskettoken = basketItem.baskettoken;
    let quantity = parseInt(basketItem.quantity);
    let orjFiyat = basketItem.price;
    if(itemgorsel == ""){
        itemgorsel = "https://minberiaksa.org/uploads/bagis1.jpg";
    }else{
        itemgorsel = "https://minberiaksa.org/uploads/"+itemgorsel;
    }
    return (
    <Flex key={index} width={"100%"} direction={{base:"column",lg:"row"}} alignItems={"center"} p={3} justifyContent={"space-between"} position={'relative'}>
        <Flex alignItems={"center"} width={"100%"} gap={5}>
            <Image src={itemgorsel} width={{base:'90px',lg:90}} style={{borderRadius:5,}} borderWidth={2} borderStyle={'solid'} borderColor={basketItem.regular_payment=="1" ? 'purple':'#ce8b2b'} fit={"cover"} />
            <Box marginLeft={["0","0"]}>
                <Flex direction={"row"} alignItems={'center'} justifyContent={'flex-start'} gap={1}><Text fontWeight={500} fontSize={16} color={'#ce8b2b'}>{itembaslik}</Text>{basketItem.regular_payment=="1" && <Text color={"purple"} fontWeight={700} fontSize={14}>| {messages.regulardonate}</Text>}</Flex>
                {/*<Text mt={1} fontWeight={400} fontSize={16} color= {basketItem.bagisturu === "2" ? 'purple' : '#ccc'}>{basketItem.bagisturu === "2" ? "Hediye Bağışı" : "Standart Bağış"}</Text>*/}
                <Flex direction="row" gap={0} mt={2}>
                    <Button color={bagispersontype==0 ? 'white' : 'black'} bgColor={bagispersontype==0 ? '#ce8b2b' : '#eee'} borderRightRadius={0} onClick={() => modalac(index,'0',basketItem,basketItem,bagistipi)} size={'xs'}>{messages.ownname}</Button>
                    <Button color={bagispersontype==1 ? 'white' : 'black'} bgColor={bagispersontype==1 ? '#ce8b2b' : '#eee'} borderLeftRadius={0} onClick={() => modalac(index,'1',basketItem,basketItem,bagistipi)} size={'xs'}>{messages.someoneelsename}</Button>
                </Flex>
            </Box>
        </Flex>
        <Flex w={{base:'100%',lg:'auto'}} direction={"row"} mt={{base:5,lg:0}} gap={{base:2,lg:20}} alignItems={"center"} justifyContent={"space-between"}>
        {basketItem.priceType == "1" ?
        <>
        <Box>
        <InputGroup>
        <InputLeftAddon style={{background:'#ce8b2b', color:'white', fontWeight:600, padding:'0px 10px', borderTopRightRadius:0, borderBottomRightRadius:0}}>
        {parabirimLabel}
        </InputLeftAddon>
        <NumberInput width={93} defaultValue={basketItem.price} disabled={true}>
        <NumberInputField  style={{fontSize:19,fontWeight:600,color:'#ccc',padding:'10px',borderTopLeftRadius:0,borderBottomLeftRadius:0}} _focusVisible={{border:'1px solid #ccc'}} _disabled={{color:'#ccc'}}/>
        </NumberInput>
        </InputGroup>
        </Box>
        <Box>
            <Flex direction={"row"} justify={"center"} alignItems={"center"} bgColor={'#F3F3F3'} borderRadius={25} p={0} gap={[2,0]}>
                <Button variant={"none"} px={[2,1]} color={'#ce8b2b'} borderRadius={0} borderRightWidth={2} borderStyle={'solid'} borderColor={'#EAEAEA'} onClick={() => adetsayisidegistir(0,index,quantity,basketItem)} style={{fontSize:16,fontWeight:600}} disabled={quantity==1 ? true : false}>-</Button>
                <Text py={1} px={[2,5]} fontSize={16} fontWeight={500} color={'#ce8b2b'}>{quantity}</Text>
                <Button variant={"none"} px={[2,1]} color={'#ce8b2b'} borderRadius={0} borderLeftWidth={2} borderStyle={'solid'} borderColor={'#EAEAEA'} onClick={() => adetsayisidegistir(1,index,quantity,basketItem)} style={{fontSize:16,fontWeight:600}}>+</Button>
            </Flex>
        </Box>
        </>
        :
        <Flex width={180} overflow={'hidden'} direction={'row'} position={'relative'}  precision={2} alignItems={'center'}>
        <InputGroup>
        <InputLeftAddon style={{background:'#ce8b2b', color:'white', fontWeight:600, padding:'0px 10px', borderTopRightRadius:0, borderBottomRightRadius:0}}>
        {parabirimLabel}
        </InputLeftAddon>
        <NumberInput id={index} width={93} value={editedItem === index ? yeniFiyat : basketItem.price} onFocus={()=>{fiyatDegistirmeChange(index,basketItem.price)}} onChange={(value) => fiyatDegistirmeChange(index, value)} onKeyDown={handleKeyDown}>
        <NumberInputField style={{fontSize:19,fontWeight:600,color:'#ccc',padding:'10px',borderTopLeftRadius:0,borderBottomLeftRadius:0}} _focusVisible={{border:'1px solid #ccc'}}/>
        </NumberInput>
        {editedItem === index && (
        <>
        <Tooltip label="Confirm">
            <IconButton
            variant={'outline'} 
            icon={<FaCheck />}
            colorScheme="green"
            size="sm"
            aria-label="Confirm"
            height={35}
            ml={2}
            onClick={()=>{fiyatDegistirme(index,quantity,basketItem)}}
            />
        </Tooltip>
        <Tooltip label="Cancel">
            <IconButton
            variant={'outline'} 
            icon={<IoCloseSharp />}
            colorScheme="red"
            size="sm"
            aria-label="Cancel"
            height={35}
            ml={2}
            onClick={()=>{setEditedItem(null)}}
            />
        </Tooltip>
        </>
        )}
         </InputGroup>
        </Flex>
        }
        <Box direction={"row"} alignItems={"center"} justify={"center"}>
        <Tag cursor={"pointer"} size={"lg"} key={"lg"} borderRadius={25} fontSize={11} px={3} variant='subtle' bgColor={'#FBD8D9'} color={'#DC696D'} onClick={() => sepettenkaldir(index,basketItem)}>
            <TagLeftIcon boxSize='12px' as={BsFillTrashFill} />
            <TagLabel>{messages.remove}</TagLabel>
        </Tag>
        </Box>
        </Flex>
        {sepetItemIslem.status==true &&  sepetItemIslem.index == index && 
        <Flex position={'absolute'} zIndex={5} background={'#eeeeeead'} width={"100%"} height={'100%'} justifyContent={'center'} alignItems={'center'} top={0} left={0} borderRadius={10}>
            <Spinner size='xl' color={'#ce8b2b'} />
        </Flex>
        }
    </Flex>

    );
    })}
   
   
    </Flex>
    {sepetVerisi && sepetVerisi.length > 0 ? (
    <Flex direction={"column"} justify={"flex-end"} alignSelf={"flex-end"}>
        <Flex my={8} direction={"column"} alignItems={"flex-end"} justify={"flex-end"}>
            <Text fontSize={{base:14,lg:18}} fontWeight={600}>{messages.totalprice}: &nbsp; <span style={{color:'#ce8b2b'}}>{parabirimLabel}{sepetBilgisi.showprice}</span></Text>
            <Link href={odemelinki}><Button bgColor='#ce8b2b' rightIcon={<TbCreditCardPay size={20}/>} color={'white'} my={5} fontWeight={500} fontSize={{base:13,lg:16}} py={7} px={4}>{messages.gopaymentpage}</Button></Link>
        </Flex>
    </Flex>
    ): ''}
    </>
  )
}
}
