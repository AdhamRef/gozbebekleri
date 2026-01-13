"use client";
import React, { useState,useRef,useEffect } from 'react';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading,NumberInput,NumberInputField,NumberInputStepper,NumberIncrementStepper,NumberDecrementStepper,Spinner,useToast,IconButton} from '@chakra-ui/react'
import { BsCreditCardFill, BsFillPersonFill } from "react-icons/bs";
import { BsFillTrashFill, BsArrowRight } from "react-icons/bs";

import {useDispatch,useSelector} from 'react-redux';
import OdemeAdimlariWizard from '../components/OdemeAdimlariWizard';
import {useLanguage} from "@/main/utilities/language";
import InputMask from "react-input-mask";
import {useLanguageBelirtec} from "@/main/utilities/language";
import Swal from 'sweetalert2'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import {oturumGuncelle} from '@/redux/slices/oturumSlice';
import {sepetTemizle} from '@/redux/slices/sepetSlice';
import {useAuth} from '@/components/LayoutProvider';
import { FaRegCreditCard } from "react-icons/fa";
import { FaPaypal } from "react-icons/fa";
import ReCAPTCHA from "react-google-recaptcha";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import {sepetAzalt} from '@/redux/slices/sepetSlice';
import { FaEdit,FaRegTimesCircle,FaShoppingBasket } from "react-icons/fa";

export default function Odeme() {
    const serverip = process.env.NEXT_PUBLIC_SERVER_IP;
    let messages = useLanguage();
    let languageCode = useLanguageBelirtec();
    const {name,email,mtoken,gsm,paymenttoken,membertoken,membertype,oturumdurumu} = useSelector((state) => state.oturum);
    const {parabirimLabel,parabirimi} = useAuth();
    const router = useRouter();
    const Toast = useToast();

    const containerRef = useRef(null);
    const [paymentInfo, setPaymentInfo] = useState({
      pname: '',
      pphone: '',
      pemail: '',
    });
    const [Cardinfo, setCardInfo] = useState({
      number: '',
      expiry: '',
      cvc: '',
      name: '',
      focus: '',
    });
    const [sepetBilgisi,setSepetBilgisi] = useState();
    const [sepetVerisi,setSepetVerisi] = useState({});
    const [sepetLoading,setSepetLoading] = useState(true);
    const [formHatalari,setFormHatalari] = useState({});
    const [paymentHtml, setPaymentHtml] = useState('');
    const [odemeYukleniyor,setOdemeYukleniyor] = useState(false);
    const [odemeTipi,setOdemeTipi] = useState(1); // 1=sanalpos 2=paypal
    const [sepetBagisKaldirDurum,setBagisKaldirDurum] = useState(0);

    const recaptchaRef = React.createRef();
    
    const dispatch = useDispatch();

    let dil = useLanguageBelirtec();
    let dilfetch = dil.replace("/","");
    if(dilfetch==""){
        dilfetch = "tr";
    }
  
    const handleBlur = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
        }
    };

    const tumSepetFetch = async () => {
      const response_ham = await fetch("/api/sepetall", { // 'api/sepetall' olarak düzelttim
          method: 'POST',
          headers: {
              'Content-Type': 'application/json', 
              'Accept-Language': dilfetch,
          },
          body: JSON.stringify({
              paymenttoken: paymenttoken,
              membertoken: membertoken,
              membertype: membertype,
              currency:parabirimi
          }),
      });
      const response = await response_ham.json();
      
      if(response.status==true){
        setSepetBilgisi(response.summary);
        setSepetVerisi(response.basket);
        setSepetLoading(false);
      }else if(response.status=="clean"){
        dispatch(oturumGuncelle({paymenttoken:""}));
        dispatch(sepetTemizle());
        localStorage.setItem('paymenttoken',"");
        router.push(dil+'/bagislar');
      }else{
          
      }
      
  };

    useEffect(() => {
        if(name != "" && email != "" && gsm != ""){
          setPaymentInfo({
            pname: name,
            pphone: gsm,
            pemail: email
          });
        }
        if (!paymenttoken) {
          router.push(dil+'/bagislar');
        }
        tumSepetFetch();
    }, []);

    useEffect(() => {
      tumSepetFetch();
    }, [sepetBagisKaldirDurum]);

    useEffect(() => {
      if(sepetVerisi.length<1){
        router.push(dil+'/');
      }
    }, [sepetVerisi]);
    
    const handleInputChange = (evt) => {
      let { name, value } = evt.target;
      setCardInfo((prev) => ({ ...prev, [name]: value }));
      if (formHatalari[name]) {
        setFormHatalari((prev) => ({ ...prev, [name]: '' }));
      }
    }

    const handleInputChangePersInfo = (evt,index) => {
      let { name, value } = evt.target;

      if(evt.target.className=="country-name"||evt.target.className=="country"){
        setPaymentInfo((prev) => ({ ...prev, ['pphone']: "" }));
      }

      if(name=="pname" || name=="pphone" || name=="pemail"){
      setPaymentInfo((prev) => ({ ...prev, [name]: value }));
      }

      if (formHatalari[name]) {
        setFormHatalari((prev) => ({ ...prev, [name]: '' }));
      }
      if (name=="pphone" && value.length<7) {
        setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
      }
     
    }

    
    const handleInputChangePersInfoPhone = (number,country,evt) => {
      let { name,value } = evt.target;

      if(evt.target.className=="country-name"||evt.target.className=="country"){
        setPaymentInfo((prev) => ({ ...prev, ['pphone']: "+"+country.dialCode }));
        setFormHatalari((prev) => ({ ...prev, ['pphone']: 'Bu alan zorunludur' }));
      }

      if(name=="pname" || name=="pphone" || name=="pemail"){
        setPaymentInfo((prev) => ({ ...prev, [name]: value }));
      }
      if (formHatalari[name]) { // form hatası kaldırmak için
        setFormHatalari((prev) => ({ ...prev, [name]: '' }));
      }
      if (value!=undefined&&value.length<7) {  // form hatası eklemek için
        setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
      }

    }

  
    const handleInputFocus = (evt) => {
      setCardInfo((prev) => ({ ...prev, focus: evt.target.name }));
    }

    const sepettenkaldir = async (indexSelect, basketitem) => {
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
          // setSepetItemIslem({status:false,index:null});
          setBagisKaldirDurum(sepetBagisKaldirDurum+1);
          // tumSepetFetch();
      }else{
          Toast({
              title: messages.itemfailedremoved,
              status: "error",
              isClosable: true,
              position: 'bottom-right',
          })
          // setSepetItemIslem({status:false,index:null});
      }
      }catch(error){
      console.log(error)
      }
  };

    const odemetamamla =async () => {

      const recaptchaValue = recaptchaRef.current.getValue();      

      let cardexpiry = Cardinfo.expiry;
      cardexpiry = cardexpiry.replace('/', '');
      let expmonth = cardexpiry.slice(0, 2);
      let expyear = cardexpiry.slice(-2);

      let phonenumber = paymentInfo.pphone;
      phonenumber = phonenumber.replace(/\s+/g, '');

      let Cardinfonumber = Cardinfo.number;
      Cardinfonumber = Cardinfonumber.replace(/\s+/g, '');

      const emptyFields = Object.entries(Cardinfo).filter(
        ([key, value]) => !value.trim()
      );

      const emptyFields_paymentInfo = Object.entries(paymentInfo).filter(
        ([key, value]) => !value.trim()
      );

      

      
      if (emptyFields_paymentInfo.length > 0) {
        const missingFields = emptyFields.map(([key]) => key).join(", ");
        Swal.fire({
          icon: "error",
          html: "<strong>"+messages.pleaseenterpersonalinfo+"</strong>",
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

      if(odemeTipi == 1){
        if (emptyFields.length > 0) {
          const missingFields = emptyFields.map(([key]) => key).join(", ");
          Swal.fire({
            icon: "error",
            html: "<strong>"+messages.pleaseentercardinfo+"</strong>",
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
      }

      if (recaptchaValue==null||recaptchaValue=="") {
        const missingFields = emptyFields.map(([key]) => key).join(", ");
        Swal.fire({
          icon: "error",
          html: "<strong>"+messages.captchaerror+"</strong>",
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

      setOdemeYukleniyor(true);
      dispatch(oturumGuncelle({name:paymentInfo.pname,email:paymentInfo.pemail,gsm:phonenumber}));
      try{
        let postbody = {
          paymenttoken: paymenttoken,
          membertoken: membertoken,
          membertype: membertype,
          cardholder: Cardinfo.name,
          cardNo: Cardinfonumber,
          expDateMonth: expmonth,
          expDateYear: expyear,
          cvv: Cardinfo.cvc,
          personname: paymentInfo.pname,
          personemail: paymentInfo.pemail,
          personphone: phonenumber,
          currency: parabirimi,
          captchavalue: recaptchaValue
          
        };

        if(odemeTipi==2){
          postbody['paymentmethod']='Paypal';
        }

        const response_ham = await fetch('/api/odeme', { // 'api/sepetall' olarak düzelttim
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': dilfetch,
            },
            body: JSON.stringify(postbody),
        });

        const response = await response_ham.json();
        if(response.error){
          Swal.fire({
            icon: "error",
            title: messages.paymentfailedtitle,
            html: "<strong>"+messages.captchaerror+"</strong>",
            padding: "0px 0px 20px 0px",
            confirmButtonText: "Kapat",
            width: "350px",
            timer: 5500,
            allowOutsideClick: () => {
              Swal.close();
              return false; 
            }
          });
          return false;
        }
        if(response.type=="redirect"){
          window.location.href = "https://minberiaksa.org"+dil+"/check?token="+response.checktoken;
        }
        if(response.type=="redirecturl"){
          window.location.href = response.url;
        }
        let message = response.message ? response.message : response.msg;
        if(response.status=="false" || response.status=="fail"){
          setOdemeYukleniyor(false);
          Swal.fire({
            icon: "error",
            title: messages.paymentfailedtitle,
            html: "<strong>"+messages.paymentfaileddesc+" "+message+"</strong>",
            padding: "0px 0px 20px 0px",
            confirmButtonText: "Kapat",
            width: "350px",
            timer: 5500,
            allowOutsideClick: () => {
              Swal.close();
              return false; 
            }
          });
          return false;
        }else{
          if(response.type=="html2"){
            let html = response.html;
            html = html.replace(/\\&quot;/g, '"').replace(/\\/g, '');
            if (containerRef.current) {
                setPaymentHtml(html);
                /*containerRef.current.innerHTML = response.html;
                // input[type="submit"] olan butonu seç ve tıkla
                const button = containerRef.current.querySelector('input[type="submit"][name="submitBtn"]');
                if (button) {
                    button.click();
                } else {
                }*/
            }
          }

          if(response.type=="html"){
            let html = response.html;
            html = html.replace(/\\&quot;/g, '"').replace(/\\/g, '');
            if (containerRef.current) {
                setPaymentHtml(html);
                containerRef.current.innerHTML = response.html;
                const button = containerRef.current.querySelector('input[type="submit"][name="submitBtn"]');
                if (button) {
                    button.click();
                } else {
                }
            }
          }
        
        }
        
      }catch(error){
        
      }
    }

  useEffect(() => {
    const container = document.getElementById('html-container');
    if (!container) return;
  
    const scripts = container.getElementsByTagName('script');
    for (const script of scripts) {
      const newScript = document.createElement('script');
      
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      document.body.appendChild(newScript);
      document.body.removeChild(newScript); //önceki scripti sil
    }
  }, [paymentHtml]);

  return (
    <div>
    <Container maxW={1000} py={8}>
      <OdemeAdimlariWizard adim={2} />
      <Flex direction={"column"} alignItems={"center"}  bg={'white'} p={8} px={[5,10]}>
        <Flex style={{width:"100%"}} borderBottomWidth={1} borderStyle={'solid'} borderColor={'#E9E9E9'} pb={5} direction="row" justify={"space-between"} >
              <Flex w={'100%'} direction={"row"} alignItems={"center"} gap={3} >
                  <Image src={'/carticon.svg'} width={25} style={{filter:'invert(0%) sepia(83%) saturate(1252%) hue-rotate(-53deg) brightness(99%) contrast(119%)'}} />
                  <Text mt={0.5} fontSize={24} fontWeight={600} className='mavitextgradient'>{messages.paymentinformation}</Text>
              </Flex>
        </Flex>
        <Flex direction={["column","row"]} justifyContent={"space-between"} gap={10} style={{width:'100%',}}>
        <Box width={['100%',550]} py={5}>

          <Flex direction={"row"} gap={4} py={4} alignItems={"center"} style={{borderBottomWidth:1,borderColor:'#eee'}}>
            <BsFillPersonFill fontSize={22} color={"#ccc"}/>
            <Text fontSize={20} fontWeight={500} color={"#ccc"}>{messages.personelinformation}</Text>
          </Flex>

          <Flex direction={'column'} gap={7} mt={5}>

          <Flex direction={'column'} gap={2}>
            <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages['bagislar'].namesurname}:</Text>
            <Input name="pname" placeholder={messages['bagislar'].namesurname} value={paymentInfo.pname} onBlur={handleBlur} isInvalid={!!formHatalari["pname"]} onChange={handleInputChangePersInfo} disabled={oturumdurumu ? true : false}/>
            {!!formHatalari.pname ? <Text color={"red"} fontSize={14} mt={2}>{messages.fillthisfields}</Text> : <></> }
          </Flex>

          <Flex direction={'column'} gap={2}>
            <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages['bagislar'].phonenumber}:</Text>
            <PhoneInput
                inputProps={{
                  name:"pphone"
                }}
                name={"pphone"}
                country={'tr'}
                value={paymentInfo.pphone}
                onChange={(number,country,event) => handleInputChangePersInfoPhone(number,country,event)}
                buttonStyle={{borderColor:'#eee'}}
                disabled={oturumdurumu ? true : false}
                disableDropdown={oturumdurumu ? true : false}
                countryCodeEditable={false}
                inputStyle={{
                  width:'100%',borderColor:'#eee',
                  backgroundColor: !!formHatalari["pphone"]
                    ? '#f8040424' // Hata varsa
                    : oturumdurumu // Hata yok, diğer koşula bak
                    ? '#f2f2f2'
                    : 'transparent', // Diğer tüm durumlarda
                  borderColor:'#e5eaf1'
              }}
            />
            {!!formHatalari.pphone ? <Text color={"red"} fontSize={14} mt={2}>{messages.fillthisfields}</Text> : <></> }
          </Flex>

          <Flex direction={'column'} gap={2}>
            <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages['bagislar'].emailaddress}:</Text>
            <Input name="pemail" placeholder={messages['bagislar'].emailaddress} value={paymentInfo.pemail} isInvalid={!!formHatalari["pemail"]} onBlur={handleBlur} onChange={handleInputChangePersInfo} disabled={oturumdurumu ? true : false}/>
            {!!formHatalari.pemail ? <Text color={"red"} fontSize={14} mt={2}>{messages.fillthisfields}</Text> : <></> }
          </Flex>

          </Flex>
            
          <Flex direction={'row'} gap={5} my={5} mt={10}>
            <Flex as={'button'} onClick={() => setOdemeTipi(1)} bg={odemeTipi==1 ? "#c78225" : '#ccc'} color={odemeTipi==1 ? '#fff' : '#000'} direction={'row'} p={3} gap={3} alignItems={'center'} justifyContent={'center'} borderRadius={10} cursor={'pointer'}>
              <FaRegCreditCard size={'20px'} />
              <Text fontSize={15} fontWeight={600}>{messages.paymenttypesanalpos}</Text>
            </Flex>

            <Flex as={'button'} onClick={() => setOdemeTipi(2)} bg={odemeTipi==2 ? "#c78225" : '#ccc'} color={odemeTipi==2 ? '#fff' : '#000'} direction={'row'} p={3} gap={3} alignItems={'center'} justifyContent={'center'} borderRadius={10} cursor={'pointer'}>
              <FaPaypal size={'20px'} />
              <Text fontSize={15} fontWeight={600}>{messages.paymenttypepaypal}</Text>
            </Flex>
          </Flex>
            
          { odemeTipi==1 && 
          <>
          <Flex direction={"row"} gap={4} py={4} alignItems={"center"} style={{borderBottomWidth:1,borderColor:'#eee'}}>
            <BsCreditCardFill fontSize={22} color={"#ccc"}/>
            <Text fontSize={20} fontWeight={500} color={"#ccc"}>{messages.cardinformation}</Text>
          </Flex>
          <Flex direction={'column'} gap={7} mt={5}>
            <Flex direction={'column'} gap={2}>
              <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages.cardnumber}:</Text>
              <Input name="number" type="tel" as={InputMask} mask="9999 9999 9999 9999" maskChar={null} value={Cardinfo.number} onBlur={handleBlur} isInvalid={!!formHatalari.number} onChange={handleInputChange} onFocus={handleInputFocus} placeholder={messages.cardnumber} />
              {!!formHatalari.number ? <Text color={"red"} fontSize={14} mt={2}>{messages.cardalertcardnumber}</Text> : <></> }
            </Flex>
            <Flex direction={'column'} gap={3}>
              <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages.cardholder}:</Text>
              <Input name="name" value={Cardinfo.name} onChange={handleInputChange} onBlur={handleBlur} isInvalid={!!formHatalari.name} onFocus={handleInputFocus} placeholder={messages.cardholder} />
              {!!formHatalari.name ? <Text color={"red"} fontSize={14} mt={2}>{messages.cardalertholdernamesurname}</Text> : <></> }
            </Flex>
            <Flex direction={'column'} gap={3}>
              <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages.expirydate}:</Text>
              <Input name="expiry" type="tel" as={InputMask} mask="99/99" maskChar={null} value={Cardinfo.expiry} onBlur={handleBlur} isInvalid={!!formHatalari.expiry} onChange={handleInputChange} onFocus={handleInputFocus} placeholder={messages.expirydate} />
              {!!formHatalari.expiry ? <Text color={"red"} fontSize={14} mt={2}>{messages.cardalertcardexpdate}</Text> : <></> }
            </Flex>
            <Flex direction={'column'} gap={3}>
              <Text fontSize={12} fontWeight={600} color={'#8e8e8e'}>{messages.cvv}:</Text>
              <Input name="cvc" type="tel" value={Cardinfo.cvc} onChange={handleInputChange} onFocus={handleInputFocus} onBlur={handleBlur} isInvalid={!!formHatalari.cvc} placeholder={messages.cvv} />
              {!!formHatalari.cvc ? <Text color={"red"} fontSize={14} mt={2}>{messages.cardalertcardcvc}</Text> : <></> }
            </Flex>
          </Flex>

          <Box my={[0,10]}>
            <Cards
              number={Cardinfo.number}
              expiry={Cardinfo.expiry}
              cvc={Cardinfo.cvc}
              name={Cardinfo.name}
              focused={Cardinfo.focus}
              width={550}
              w={250}
              placeholders={{ name: messages.cardholder }}
              locale={{valid: messages.monthyear}}
            />
          </Box>
          </>
          }

          { odemeTipi==2 && 
          <Text>{messages.paymenttypepaypaldesc}</Text>
          }
          
        </Box>


        <Flex direction={"column"} alignItems={"center"} >
          <Box className="OdemeSepetAlani" bg={"#f8f8f8"} py={5} px={[5,5]} mt={[0,10]} w={['100%',300]} top={0} style={{position: '-webkit-sticky',position: 'sticky',}}>
            <Flex direction={'row'} alignItems={'center'} justifyContent={'space-between'}  mb={3}>
              <Text fontSize={18} fontWeight={600}>{messages.cart} </Text>
              <Box><Link href={languageCode + "/sepet/"}><FaEdit size={18}/></Link></Box>
            </Flex>
            {  sepetVerisi &&
              sepetVerisi.length > 0 && sepetVerisi.map((basketItem, index) => {
              let itembaslik = basketItem.name;
              let bagistipi = basketItem.priceType;
              let itemgorsel = basketItem.picture;
              if(itemgorsel == ""){
                  itemgorsel = "https://minberiaksa.org/uploads/bagis1.jpg";
              }else{
                  itemgorsel = "https://minberiaksa.org/uploads/"+itemgorsel;
              }
              return (
              <Box key={index} style={{borderBottom:'1px solid #eee',}} py="3">
                <Flex direction="row" gap="10px" mt="0">
                  <Image src={itemgorsel} width="50px" objectFit='cover'  />
                  <Flex direction="column" gap="5px" width={'100%'}>
                    <Flex direction={'row'} flex={1} justifyContent={'space-between'} width={'100%'}>
                      <Text style={{fontSize:14}}>{itembaslik}</Text>
                      <IconButton size={'xs'} colorScheme='red' style={{padding:0,background:'transparent'}} icon={<FaRegTimesCircle size={16} color={'#cf8a2d'} />} onClick={() => sepettenkaldir(index,basketItem)} />
                    </Flex>
                    <Flex direction={"row"} alignItems={'center'} justifyContent={'flex-start'} gap={1}>
                      <Text color="burakmavisi.text" fontWeight={600} style={{alignSelf:'flex-start',fontSize:10,paddingTop:5,paddingBottom:5,paddingLeft:8,paddingRight:8,background:'#eee',borderRadius:10}}>{parabirimLabel}{basketItem.price}</Text> 
                      {basketItem.regular_payment=="1" && <Text color={"purple"} fontWeight={500} fontSize={12}>| {messages.regulardonate}</Text>} 
                    </Flex>
                  </Flex>
                </Flex>
              </Box>
            )})}
            {sepetVerisi && sepetVerisi.length > 0 &&
            <Flex direction="column" gap="10px" mt={5}>
              <Flex direction="row" justify="space-between" className='sepettoplamdegeralan' p={0} style={{marginBottom:10}}>
                <Text className='sepettoplamdeger' p={2} fontSize={15} fontWeight={600}>{messages.totalprice}:</Text>
                <Text className='sepettoplamdeger sepettoplamfiyat' p={2} fontSize={15} color={"burakmavisi.text"} fontWeight={600}>{sepetBilgisi.showprice} {parabirimLabel}</Text>
              </Flex>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6LeqvhYrAAAAAKU3HsrGUOielFvtBpx0DRtHtZ4a"
                style={{transform:'scale(0.9)',marginLeft:'-20px'}}
              />
              {odemeTipi==1 && <Button disabled={odemeYukleniyor} rightIcon={<BsArrowRight/>} colorScheme={"burakmavisi"} py={6} onClick={() => odemetamamla()}>{messages.completepayment}</Button>}
              {odemeTipi==2 && <Button disabled={odemeYukleniyor} bg={'#fcc641'} colorScheme={"blue"} py={6} onClick={() => odemetamamla()} justifyContent={'center'} display={'flex'} gap={2}>{messages.completepaymentwithpaypal1}<Image src={'/paypallogo.png'} width={'80px'} s/>{messages.completepaymentwithpaypal2}</Button>}
              <Button disabled={odemeYukleniyor} leftIcon={<FaShoppingBasket size={18}/>} rightIcon={<FaEdit size={16}/>}  bg={'#e0e0e0'} color={'#222222'} py={1} fontSize={14} onClick={() => router.push(dil+'/sepet')}>{messages.editbasket}</Button>
              {odemeYukleniyor &&
              <Flex direction="column" mt={5} gap={5} justifyContent={'center'} alignItems={'center'}>
                <Spinner
                  thickness='4px'
                  speed='0.65s'
                  emptyColor='gray.200'
                  color='blue.500'
                  size='xl'
                />
                <Text fontSize={16} fontWeight={600} textAlign={'center'} color={'green'}>
                  {messages.redirecttopaymentpage}
                </Text>
              </Flex>
              }
            </Flex>
          }
          </Box>
        </Flex>
        </Flex>
      </Flex>
      <div id="html-container" ref={containerRef} dangerouslySetInnerHTML={{__html:paymentHtml}}></div> {/* HTML içeriği buraya yerleşecek */}
    
    </Container>
    </div>
  )
}
