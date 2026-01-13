'use client';
import React, {useState,useEffect} from 'react'
import { Box,Image,Container,Flex,Text,Center,Select,Input,Textarea,Heading,Breadcrumb,BreadcrumbItem,BreadcrumbLink,Button} from '@chakra-ui/react'
import Swal from 'sweetalert2'
import { useModal } from '@/main/ModalContext';
import {useSelector} from 'react-redux';
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";
import { useAuth } from '@/components/LayoutProvider';
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSquareFull } from "react-icons/fa";
import { IoIosArrowForward } from "react-icons/io";
import { CiBank } from "react-icons/ci";
import { MdAddShoppingCart } from "react-icons/md";

export default function AylikBagisForm() {
    const [bagislar,setBagislar] = useState({});
    const [aylikBagisIcerik,setAylikBagisIcerik] = useState({});
    const [fiyat,setFiyat] = useState();
    const [secilenFiyat,setSecilenFiyat] = useState("");
    const [secilenBagis,setSecilenBagis] = useState("");
    const [secilenBagisTipi,setSecilenBagisTipi] = useState();
    const [secilenBagisItem,setSecilenBagisItem] = useState();
    const [secilenBagisItemJSON,setSecilenBagisItemJSON] = useState();
    const [onerilenFiyatlar,setOnerilenFiyatlar] = useState("");
    const [secilenBitisSuresi,setSecilenBitisSuresi] = useState();
    const [secilenGun,setSecilenGun] = useState();
    const [notunuz,setNotunuz] = useState("");

    let message = useLanguage();
    let dil = useLanguageBelirtec();
    let dilfetch = dil.replace("/","");
    if(dilfetch==""){
        dilfetch = "tr";
    }

    const {showModal,sepeteEkle} = useModal();
    const {name,email,gsm,parabirimi} = useSelector((state) => state.oturum);
    const {settings} = useAuth();

    const renkler = {
    parabirimi: "#FFFFFF",
    fiyat: '#EDF9FF',
    fiyattext: '#22678D',
    fiyathover: '#EDF9FF',
    fiyattexthover: '#EDF9FF',
    input: '#FFFFFF',
    inputplaceholder: '#22678D',
    };
    
    let parabirimLabel = 
    settings.parabirimi == 0 ? "₺" : 
    settings.parabirimi == 1 ? "$" : 
    settings.parabirimi == 2 ? "€" : "₺";

    const fetchAylikBagisDetay = async () => {
        let urlbody = JSON.stringify({ type:"contentsCat", id: "67a0c6705d2b0e23d47235a8" });
        let response = await fetch("/api/kategoriListe", {
            cache: 'no-store',
            method: "POST",
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Accept-Language': dilfetch,
            },
            body: urlbody
        });
        let posts = await response.json();
        let cdatatumu = posts['data'];
        setAylikBagisIcerik(cdatatumu);
    };

    useEffect(() => {
        const bagislarfetch = async () => {
            let urlbody = JSON.stringify({ type: "donates" });
            let response = await fetch("/api/kategoriListe", {
                cache: 'no-store',
                method: "POST",
                headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': dilfetch,
                },
                body: urlbody
            });
            
            let posts = await response.json();

            return posts; 
        };
        
        const fetchData = async () => {
            let bdata = await bagislarfetch();
            let bdatatumu = bdata['data'];
            const filteredData = bdatatumu.filter(item => item.odemeperiyodu === "1");
            setBagislar(filteredData);
        };

        fetchData(); // Fetch işlemini başlat
        fetchAylikBagisDetay();

    }, [])

    const fiyatguncelle = (fiyat, index, e = null) => {
        setFiyat(fiyat);
        if (secilenFiyat === index) {
        } else {
            setSecilenFiyat(index);
        }
    };

    const fiyatguncelleinput = (e) => {
        const inputValue = e.target.value;
        setFiyat(inputValue);
        fiyatguncelle(inputValue, null, e); // fiyatguncelle'ye değerleri geçir
    };

    const modalac = (bagisyapmatipi=0) => {
        let duzenlibagisBilgileri = {
            regular_repeat: secilenBitisSuresi,
            regular_repeatDay: secilenGun
        }
        showModal(fiyat,secilenBagis,secilenBagisTipi,secilenBagisItem,duzenlibagisBilgileri);
    }

    const sepeteekle = () => {
        let duzenlibagisBilgileri = {
            regular_repeat: secilenBitisSuresi,
            regular_repeatDay: secilenGun,
            msg: notunuz
        }
        if(!secilenBagis){
            Swal.fire({
                icon: "error",
                html: "<strong>Lütfen bir bağış türü seçiniz</strong>",
                padding: "0px 0px 20px 0px",
                showConfirmButton: false,
                width: "350px",
                allowOutsideClick: () => {
                    Swal.close();
                    return false;
                }
                });
                return false;
        }

        sepeteEkle(fiyat,secilenBagis,secilenBagisTipi,secilenBagisItem,duzenlibagisBilgileri,true); //fiyat,bagistoken,bagistipi,bagisItem,düzenlibağışbilgileri,yönlendirme
        /*
        if(name == "" && email == "" && gsm == ""){
            modalac();
        }else{
            sepeteEkle(fiyat,secilenBagis,secilenBagisTipi,secilenBagisItem,duzenlibagisBilgileri); //fiyat,bagistoken,bagistipi,bagisItem,düzenlibağışbilgileri
        }*/
    }

    const secilenbagisiayarla = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if(e.target.value){
        // data_tip ve data_item değerlerini almak
        const dataTip = selectedOption.getAttribute("data_tip");
        const dataItem = selectedOption.getAttribute("data_item");
        const dataItemJson = JSON.parse(dataItem);
        let onerilenFiyatlardata = dataItemJson.onerilenfiyatlar ? dataItemJson.onerilenfiyatlar.split(",") : {};
        
        // state güncellemeleri
        setSecilenBagisTipi(dataTip);
        setSecilenBagisItem(JSON.parse(dataItem));
        setSecilenBagisItemJSON(dataItem);
        setSecilenBagis(e.target.value);
        setOnerilenFiyatlar({
            status: dataItemJson.onerilenfiyatlar ? true : false,
            data: onerilenFiyatlardata
        });
        }
    }

  return (
<Flex direction={'column'} bg={'#cd8b2c'} p={10} gap={5} borderRadius={15} mt={{base:0}}>
            <Flex direction={'row'} gap={3} alignItems={'center'}>
                <CiBank size={40} color={'#fff'}/>
                <Text fontSize={28} color={'#fff'} fontWeight={600} textTransform={'uppercase'}>{message.regulardonate}</Text>
            </Flex>
            <Flex direction={{base:'column',lg:"row"}} gap={5}>
                <Flex flex={1} direction={'column'} gap={"3"}>
                    <Text color={'#fff'} fontSize={12} fontWeight={600}>{message.donate}</Text>
                    <Select bg={'#EDF9FF'} color='22678D' variant='filled' placeholder={message.choose} onChange={(e) => secilenbagisiayarla(e)} _expanded={{ bg: "#FFF",color:'#000'}} _focusVisible={{border:0,}}>
                    {bagislar && bagislar.length > 0 &&
                    bagislar.map((post,index) => (
                        <option key={index} data_tip={post.kind} data_item={JSON.stringify(post)}  value={post.token}>{post.name}</option>
                    ))}
                    </Select>
                </Flex>

                <Flex flex={1} direction={'column'} gap={"3"}>
                    <Text color={'#fff'} fontSize={12} fontWeight={600}>{message.donateperiod}</Text>
                    <Select bg={'#EDF9FF'} color='22678D' variant='filled' placeholder={message.choose} onChange={(e) => setSecilenBitisSuresi(e.target.value)} _expanded={{ bg: "#FFF",color:'#000'}} _focusVisible={{border:0,}}>
                        {secilenBagisItemJSON && 
                            secilenBagisItemJSON.odemesureleri ?
                            secilenBagisItemJSON.odemesureleri.map((post,index) => {
                                <option value={post.key}>{post.key} {message.month}</option>
                            })
                            :
                            <>
                            <option value='3'>3 {message.month}</option>
                            <option value='4'>4 {message.month}</option>
                            <option value='5'>5 {message.month}</option>
                            <option value='6'>6 {message.month}</option>
                            <option value='7'>7 {message.month}</option>
                            <option value='8'>8 {message.month}</option>
                            <option value='9'>9 {message.month}</option>
                            <option value='10'>10 {message.month}</option>
                            <option value='11'>11 {message.month}</option>
                            <option value='12'>12 {message.month}</option>
                            </>
                        }
                        
                    </Select>
                </Flex>

                <Flex flex={1} direction={'column'} gap={"3"}>
                    <Text color={'#fff'} fontSize={12} fontWeight={600}>{message.whichdayofthemonth}</Text>
                    <Select bg={'#EDF9FF'} color='22678D' variant='filled' placeholder={message.choose} onChange={(e) => setSecilenGun(e.target.value)} _expanded={{ bg: "#FFF",color:'#000'}} _focusVisible={{border:0,}}>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="13">13</option>
                        <option value="14">14</option>
                        <option value="15">15</option>
                        <option value="16">16</option>
                        <option value="17">17</option>
                        <option value="18">18</option>
                        <option value="19">19</option>
                        <option value="20">20</option>
                        <option value="21">21</option>
                        <option value="22">22</option>
                        <option value="23">23</option>
                        <option value="24">24</option>
                        <option value="25">25</option>
                        <option value="26">26</option>
                        <option value="27">27</option>
                        <option value="28">28</option>
                    </Select>
                </Flex>

                <Flex flex={1} direction={'column'} gap={3}>
                    <Text color={'#fff'} fontSize={12} fontWeight={600}>{message.donateamount}</Text>
                    <Flex direction="row" gap={"1"}>
                        <Text color={"secondcolor"} fontSize={14} className={"parabirimi"}>{parabirimLabel}</Text>
                        {onerilenFiyatlar.status ?
                        <>
                        {onerilenFiyatlar.data.slice(0,5).map((post, index) => (
                        <Box key={index} bg={secilenFiyat === index ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === index ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle(post,index)}>{post}</Box>
                        ))}
                        </>
                        : 
                        <>
                        <Box bg={secilenFiyat === 0 ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === 0 ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle("20",0)}>20</Box>
                        <Box bg={secilenFiyat === 1 ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === 1 ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle("50",1)}>50</Box>
                        <Box bg={secilenFiyat === 2 ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === 2 ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle("100",2)}>100</Box>
                        <Box bg={secilenFiyat === 3 ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === 3 ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle("150",3)}>150</Box>
                        <Box bg={secilenFiyat === 4 ? 'secondcolor' : '#DAF1F4'} padding={'5px 7px'} fontSize={12} borderRadius={5} transition={'all .5s'} color={secilenFiyat === 4 ? '#fff' : 'secondcolor'} fontWeight={600} alignContent={'center'} _hover={{background:'secondcolor',color:'#fff'}} onClick={() => fiyatguncelle("200",4)}>200</Box>
                        </>
                        }
                        <Input placeholder={message.entertheamount} bg={"#DBF8FC"} _placeholder={{color: 'secondcolor',fontSize:12,}} color={"secondcolor"} width={90} height={30} p={4} px={2} borderWidth={0} value={fiyat} onChange={fiyatguncelleinput} />
                    </Flex>
                </Flex>
            </Flex>
            <Flex direction="row" gap={5}>
                <Flex flex={2} direction={'column'} gap={"3"}>
                    <Text color={'#fff'} fontSize={12} fontWeight={600}>{message.yournote}</Text>
                    <Textarea bg={'#EDF9FF'} placeholder={message.yournote} onChange={(e) => setNotunuz(e.target.value)} />
                </Flex>
            </Flex>
            <Flex direction="row" gap={5}>
                <Button rightIcon={<MdAddShoppingCart size={18}/>} bg={'secondcolor'} colorScheme='blue' p={6} px={4} fontSize={12} onClick={()=>sepeteekle()} textTransform={'uppercase'}>{message.donatenow}</Button>
            </Flex>
        </Flex>
  )
}
