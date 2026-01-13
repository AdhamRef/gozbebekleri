'use client';
  import React, { useState, useRef, useEffect } from 'react';
  import { Modal,ModalOverlay,ModalContent,ModalHeader,ModalFooter,ModalBody,ModalCloseButton,Button,Image,Select,Divider,Input,Text,InputGroup,InputLeftElement,NumberInput,NumberInputField,NumberInputStepper,NumberIncrementStepper,NumberDecrementStepper,Alert,AlertIcon,AlertTitle,AlertDescription,HStack,useNumberInput,Flex,Box } from '@chakra-ui/react'
  import { BsFillHeartFill,BsEnvelopeFill,BsFillPersonFill,BsFillTelephoneFill} from "react-icons/bs";
  import { useDispatch, useSelector} from 'react-redux';
  import { useModal } from './ModalContext';
  import {SepeteEkleFetch} from "@/main/utilities/bagisFunc";
  import Swal from 'sweetalert2'
  import { oturumGuncelle } from '@/redux/slices/oturumSlice';
  import {useLanguage, useLanguageBelirtec} from "@/main/utilities/language";
  import PhoneInput from 'react-phone-input-2'
  import 'react-phone-input-2/lib/style.css'
  import { FaLiraSign,FaDollarSign,FaEuroSign  } from "react-icons/fa";
  import { useRouter } from 'next/navigation';
  const utilsScriptUrl = "https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.0/build/js/utils.js";
  import { useAuth } from '@/components/LayoutProvider';


const ModalimComponent = ({sb, sbf }) => {

  let messages = useLanguage();
  let languageCode = useLanguageBelirtec();
  const router = useRouter();
  
  let dilfetch = languageCode.replace("/","");
  if(dilfetch==""){
      dilfetch = "tr";
  }
  const { isModalOpen, hideModal, priceModal, donateInfoModal, bagisTipi, sepeteEkleAlert,hideSepeteEkle,basketItem,modalKimAdina,bagisItem,duzenlemeEkrani,duzenlibagisBilgileri,yonlendirmeDurumu,sadeceFiyatGoster} = useModal();
  const [statesepetId,setstateSepetId]= useState();
  const dispatch = useDispatch();
  const {name,email,mtoken,gsm,paymenttoken,membertoken,membertype,oturumdurumu} = useSelector((state) => state.oturum);
  const {parabirimi,parabirimLabel} = useAuth();
  
  const [kimAdina,setKimAdina] = useState(0);
  const [actionType,setActionType] = useState('add');
  const [adetliToplamTutar,setAdetliToplamTutar] = useState();
  const [isValid, setIsValid] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [formHatalari,setFormHatalari] = useState({});


  const initialInputs = [
    { id:1,name:'adsoyad',icon: <BsFillPersonFill color='#ccc' />, type:"text", placeholder: messages['bagislar'].namesurname, isInvalid: true, value: "", readonly:false },
    { id:2,name:'emailadres',icon: <BsEnvelopeFill color='#ccc' />, type:"text",placeholder: messages['bagislar'].emailaddress, isInvalid: true, value: "", readonly:false},
    { id:3,name:'telefonnumarasi', type:"tel", placeholder:messages['bagislar'].phonenumber, isInvalid:true, value: "+90", readonly:false},
    { id:4,name:'tutar',icon: <BsFillTelephoneFill color='#ccc' />,type:"text", placeholder:"0", isInvalid:false,value: priceModal,},
  ];
  let initialInputsq =initialInputs // [ 4, 3, 2, 1 ]
  const [inputs, setInputs] = useState(initialInputsq);

  const adetliTutarDegistir = (valueAsNumber) => {
    let yeniTutar = valueAsNumber * bagisItem.tutar;
    setAdetliToplamTutar(yeniTutar);
  }

  useEffect(() => {
    const fetchData = async () => {
      if (sepeteEkleAlert) {
        let loading = true;
        Swal.fire({
            html: '<img src="/loading.gif" width="120" height="120" alt="Loading..."/>',
            showConfirmButton: false,
            allowOutsideClick: false, 
            width: '140px',
        });
        let hb_name = name;
        let hb_email = email;
        let hb_phone = gsm;
        let priceHizliBagis;
        if(priceModal == "" || priceModal == undefined){

          Swal.fire({
            icon: "error",
            html: "<strong>"+messages.pleaseentertheamount+"</strong>",
            padding: "0px 0px 20px 0px",
            showConfirmButton: false,
            width: "350px",
            timer: 1500,
            allowOutsideClick: () => {
              Swal.close();
              return false;
            }
          }).then(() => {
            hideSepeteEkle();
          });
          return false;

          if(bagisItem.mintutar != ""){
            priceHizliBagis = bagisItem.mintutar;
          }else{
            priceHizliBagis = bagisTipi === "1" ? "1" : "5";
          }
        }else{
          priceHizliBagis = priceModal;
        }
        let price = priceHizliBagis;
  
        let bagisyapsonuc = await SepeteEkleFetch(
          dilfetch,hb_name, hb_email, hb_phone, kimAdina, price,parabirimi,dispatch, paymenttoken, membertoken, membertype, bagisTipi, donateInfoModal,"add","",duzenlibagisBilgileri 
        );

        loading=false;
        if(!loading){
          Swal.close();
        }
  
        if (bagisyapsonuc.status==true) {
          Swal.fire({
            icon: "success",
            html: "<strong>"+messages.addedtocart+"</strong>",
            padding: "0px 0px 20px 0px",
            showConfirmButton: false,
            width: "350px",
            timer: 1500,
            allowOutsideClick: () => {
              Swal.close();
              return false; // Explicitly return false to handle `allowOutsideClick`.
            }
          }).then(() => {
            hideSepeteEkle();
          });
          if(yonlendirmeDurumu){
            router.push(languageCode+'/odeme');
          }
        }else {
          Swal.fire({
            icon: "error",
            html: "<strong>"+messages.addedtocartfailed+"</strong>",
            padding: "0px 0px 20px 0px",
            showConfirmButton: false,
            width: "350px",
            timer: 1500,
            allowOutsideClick: () => {
              Swal.close();
              return false;
            }
          }).then(() => {
            hideSepeteEkle();
          });
        }
      }
    };
  
    fetchData();

  }, [sepeteEkleAlert]);

  const bagisDuzenleFetch = async () => {

  }

  useEffect(() => {
    setFormHatalari({});
    setInputs(initialInputs);
    setKimAdina(modalKimAdina);

    if(modalKimAdina == 0 && name!='' && email != "" && gsm != ""){
      let yenidegerler = [...inputs];
      yenidegerler[0].value = name;
      yenidegerler[1].value = email;
      yenidegerler[2].value = gsm;
      setInputs(yenidegerler);
    }


    
    if(modalKimAdina == '0' && membertype == '0'){
      let yenidegerler = [...inputs];
      yenidegerler[0].readonly = true;
      yenidegerler[1].readonly = true;
      yenidegerler[2].readonly = true;
      setInputs(yenidegerler);
    }

    if(modalKimAdina == '1'){
      let yenidegerler = [...inputs];
      yenidegerler[0].value = '';
      yenidegerler[1].value = '';
      yenidegerler[2].value = '';
      yenidegerler[0].readonly = false;
      yenidegerler[1].readonly = false;
      yenidegerler[2].readonly = false;
      setInputs(yenidegerler);
    }

    if(priceModal != "" || priceModal != undefined){
      let yenidegerler = [...inputs];
      yenidegerler[3].value = priceModal;
      setInputs(yenidegerler);
    }else{
    }

    if(basketItem){ // DÜZENLEME EKRANI GELDİ
      let yenidegerler = [...inputs];
      if(modalKimAdina==basketItem.persontype){
        yenidegerler[0].value = basketItem.personname;
        yenidegerler[0].readonly = false;
        yenidegerler[1].value = basketItem.personemail;
        yenidegerler[1].readonly = false;
        yenidegerler[2].value = basketItem.personphone;
        yenidegerler[2].readonly = false;

      }
      if(basketItem.priceType=="1"){
      yenidegerler[3].value = basketItem.quantity;
      adetliTutarDegistir(basketItem.quantity);
      }else{
      yenidegerler[3].value = basketItem.price;
      }
      setInputs(yenidegerler);
    }

    if(bagisItem){
      adetliTutarDegistir(priceModal);
    }

  }, [isModalOpen]);
  

  let mbagistipi = bagisTipi;
  let sbtxt;
  sbtxt = "Hızlı Bağış Yap"

  
  /* */
  const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } =
    useNumberInput({
      step: 1,
      value: inputs[3].value, 
      min: 1,
      max: 100,
      onChange: (valueAsString, valueAsNumber) => {
        const newInputs = [...inputs];
        newInputs[3].value = valueAsNumber;
        setInputs(newInputs);
        adetliTutarDegistir(valueAsNumber);
      },
    });

  const inc = getIncrementButtonProps()
  const dec = getDecrementButtonProps()
  const adetinput = getInputProps()
  
  
  /*  */

  const tarafDegistir = (taraf) => {
    setKimAdina(taraf);
    if(taraf==0){
      let yenidegerler = [...inputs];
      yenidegerler[0].value = name;
      yenidegerler[1].value = email;
      yenidegerler[2].value = gsm;

      if(oturumdurumu){
      yenidegerler[0].readonly = true;
      yenidegerler[1].readonly = true;
      yenidegerler[2].readonly = true;
      }
      setInputs(yenidegerler);
    }else{
      let yenidegerler = [...inputs];
      yenidegerler[0].value = "";
      yenidegerler[0].readonly = false;
      yenidegerler[1].value = "";
      yenidegerler[1].readonly = false;
      yenidegerler[2].value = "";
      yenidegerler[2].readonly = false;
      setInputs(yenidegerler);
    }

  }

  const handleInputChange = (index, event) => {
    const newInputs = [...inputs];
    const { name, value } = event.target;

    if (index==3 && /[+-]/.test(value)) {
      return;
    }

    if(index==2){
      newInputs[2].value = value;
      setInputs(newInputs);
    }

    if(newInputs[index].type!="select" && newInputs[index].type!="tel"){
    newInputs[index].isInvalid = event.target.value.trim() === ''; // Örnek geçerlilik kontrolü
    newInputs[index].isInvalid = false;
    }
    
    if(event.target.type == "dropdown"){
      newInputs[index].isInvalid = true;
    }else{
      newInputs[index].isInvalid = false;
    }

    

    if(index==3){
      newInputs[3].value = event.target.value;
      setInputs(newInputs);
    }
    if(!oturumdurumu || kimAdina == 1){
      newInputs[index].value = event.target.value;
      setInputs(newInputs);
    }

  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (!value) {
      setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
    }
    if (name=="telefonnumarasi" && value.length<7) {
      setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
    }
    if (name=="tutar" && value=="0") {
      setFormHatalari((prev) => ({ ...prev, [name]: 'Bu alan zorunludur' }));
    }
  };

  const SepetEkle = async () => {
    const yeniHatalar = {};
   
    inputs.forEach((input) => {
      if (!input.value) {
        yeniHatalar[input.name] = 'Bu alan zorunludur';
      }

      if (input.name === 'telefonnumarasi' && input.value.length < 5) {
        yeniHatalar[input.name] = 'Telefon numarası en az 7 karakter olmalıdır';
      }

      if (input.name === 'tutar' && input.value === "0") {
        yeniHatalar[input.name] = 'Tutar 0 olamaz';
      }
    });

    setFormHatalari(yeniHatalar);

    const hataSayisi = Object.keys(yeniHatalar).length;
    if(hataSayisi>0){
      return false;
    }

    let baskettoken, actiontype;
    let duzenlibagisBilgileriModal = duzenlibagisBilgileri;

    if(basketItem){
      baskettoken = basketItem.baskettoken;
      actiontype = "change";
      if(basketItem.regular_payment=="1"){
        if(!duzenlibagisBilgileriModal){
          duzenlibagisBilgileriModal = {
            regular_repeat: basketItem.regular_repeat,
            regular_repeatDay: basketItem.regular_repeatDay,
            msg: basketItem.msg
          }
        }
      }
    }

    let statename = inputs[0].value;
    let stateemail = inputs[1].value;
    let statephone = inputs[2].value;
    statephone = statephone.replace(/\s+/g, '');
    
    if(name == "" && email == "" && gsm == ""){
      dispatch(oturumGuncelle({name:statename,email:stateemail,gsm:statephone}));
    }
    let bagisyapsonuc = await SepeteEkleFetch(
      dilfetch,statename,stateemail,statephone,kimAdina,inputs[3].value,parabirimi,dispatch,paymenttoken,membertoken,membertype,bagisTipi,donateInfoModal,actiontype,baskettoken,duzenlibagisBilgileriModal
    );

    if(bagisyapsonuc.status==true){
      hideModal();
      Swal.fire({
        icon: "success",
        html: "<strong>"+messages.addedtocart+"</strong>",
        padding: "0px 0px 20px 0px",
        showConfirmButton:false,
        width: "350px",
        timer: 1500,
      }).then(() => {
        if(actiontype=="add"){
        router.push(languageCode+'/odeme');
        }
      });;
    }else{
      hideModal();
      Swal.fire({
        icon: "error",
        html: "<strong>"+messages.addedtocartfailed+"</strong>",
        padding: "0px 0px 20px 0px",
        showConfirmButton:false,
        width: "350px",
        timer: 1500,
      });
    }
    
    
  }

  const handleSetValid = () => {
    inputRef.current.background = false;
  };

  const handleKeyDown = (event) => {
    const invalidChars = ['+', '-']; // + ve - karakterlerine izin verme
    if (invalidChars.includes(event.key)) {
      event.preventDefault();
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={hideModal}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>
      <Text>{ bagisItem ? bagisItem.name : 'Hızlı Bağış Yapın'}</Text>
      {/*<Text>name:{name} -email:{email} -gsm:{gsm} -paymenttoken:{paymenttoken} bagiskey: {sb} - bagistipi: {mbagistipi}</Text>*/}
      </ModalHeader>
      <ModalCloseButton style={{marginTop:8}} />
      <ModalBody>
      
      {/*!duzenlemeEkrani && (
      <Flex direction={"row"} w={'100%'} p={1} borderRadius={35} bg={'#eee'} border={'2px solid #fff'} mb={5} gap={3}>
        <Box flex={1} cursor={'pointer'} textAlign={'center'} bg={kimAdina == 0 ? '#034554' :'transparent'} fontSize={12} fontWeight={600} color={kimAdina == 0 ? '#FFF' :'#000'} borderRadius={35} p={3} py={2} onClick={ () => tarafDegistir(0)}>{messages.ownname}</Box>

        <Box flex={1} cursor={'pointer'} textAlign={'center'} bg={kimAdina == 1 ? '#034554' :'transparent'} color={kimAdina == 1 ? '#FFF' :'#000'} fontSize={12} fontWeight={600} borderRadius={35} p={3} py={2} onClick={ () => tarafDegistir(1)}>{messages.someoneelsename}</Box>
      </Flex>
      )*/}

      {kimAdina == 0 &&
      oturumdurumu != "" && <Alert status='info' mb={5}> <AlertIcon /> {messages.modaleditaccountinfo}</Alert>}

      {kimAdina == 1 && <Alert status='info' mb={5}> <AlertIcon /> {messages.donatepersoninformation}</Alert>}
      
      {inputs.map((input, index) => {
        let inputname = input.name;
        if(input.id==4){
          if(mbagistipi == 1){
            return (
            <Box key={input.id} style={{position:'relative',marginTop:15}}>
              <Flex direction={"row"} mb={3} justifyContent={'space-between'}>
              <Box p={2} bg={'#eee'} borderRadius={10}>
                <Text>1 {messages['bagislar'].quantity}: { bagisItem ? bagisItem.tutar : '0'} {parabirimLabel}</Text>
              </Box>
              <Box p={2} bg={'#eee'} borderRadius={10}>
                <Text>{messages.totalprice}: {adetliToplamTutar ? adetliToplamTutar : bagisItem.tutar} {parabirimLabel}</Text>
              </Box>
              </Flex>
              <HStack HStack w={'100%'} maxW='100%'>
                <Button {...inc}>+</Button>
                <Input {...adetinput} />
                <Button {...dec}>-</Button>
              </HStack>
            </Box>
            )
          }else{
            return (
            <Box key={input.id} style={{position:'relative',marginTop:15}}>
            <InputGroup>
            <InputLeftElement pointerEvents='none'>
                {parabirimLabel=="₺" && <FaLiraSign size={18} color={'#000'}/> }
                {parabirimLabel=="$" && <FaDollarSign size={18} color={'#000'}/> }
                {parabirimLabel=="€" && <FaEuroSign size={18} color={'#000'}/> }
              </InputLeftElement>
              <Input type="number" min="1" name={input.name} key={index} isInvalid={!!formHatalari[inputname]} value={input.value} placeholder={input.placeholder} onChange={(event) => handleInputChange(index, event)} onKeyDown={handleKeyDown}
 color={'#000'} />
            </InputGroup>
            {!!formHatalari[inputname] ? <Text color={"red"} fontSize={12} mt={2}>{messages.fillthisfields}</Text> : <></> }
          </Box>
            )
          }
        }else{
          return (
          <Box key={input.id} position={inputname === "telefonnumarasi" ? "relative" : "static"} zIndex={inputname === "telefonnumarasi" ? 9999 : "auto"}  display={sadeceFiyatGoster ? 'none' : 'block'}>
          <InputGroup flexWrap={'wrap'}>
          {input.icon ? 
          <InputLeftElement pointerEvents='none'>
            {input.icon}
          </InputLeftElement>
          : ""}
          {input.name=="telefonnumarasi" ?
          <>
          <PhoneInput
            inputProps={{
              name:input.name
            }}
            name={input.name}
            value={input.value == "" ? "+90" : input.value}
            country={'tr'}
            onChange={(number,country,event) => handleInputChange(2, event)}
            disabled={oturumdurumu && kimAdina === 0 ? true : false}
            disableDropdown={oturumdurumu && kimAdina === 0 ? true : false}
            countryCodeEditable={false}
            inputStyle={{
              backgroundColor: !!formHatalari[input.name]
                ? '#f8040424' // Hata varsa
                : oturumdurumu && kimAdina === 0 // Hata yok, diğer koşula bak
                ? '#f2f2f2'
                : 'transparent', // Diğer tüm durumlarda
              borderColor:'#e5eaf1'
            }}
            buttonStyle={{
              borderColor: '#e2e8f0',
              backgroundColor: '#fcfcfc',
            }}
            display={sadeceFiyatGoster ? 'none' : 'block'}
          />
          </>
          :
          <Input display={sadeceFiyatGoster ? 'none' : 'block'} name={input.name} key={index} value={input.value} isInvalid={!!formHatalari[inputname]} placeholder={input.placeholder} isReadOnly={oturumdurumu && kimAdina === 0 ? true : false} bg={oturumdurumu & kimAdina==0 ? '#f2f2f2' : 'transparent'} onChange={(event) => handleInputChange(index, event)}  />
          }
          {!!formHatalari[inputname] ? <Text color={"red"} fontSize={12} mt={2}>{messages.fillthisfields}</Text> : <></>}
          </InputGroup>
          <Divider my="3" />
          </Box>
          )
        }
      })}
      
      </ModalBody>

      <ModalFooter gap={3}>
        <Button colorScheme='blue' mr={3} onClick={hideModal} textTransform={'capitalize'}>{messages['bagislar'].close}</Button>
        <Button onClick={e => SepetEkle()} leftIcon={<BsFillHeartFill />} colorScheme='red' textTransform={'capitalize'}>{messages['bagislar'].donatenow}</Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
  );
};

export default ModalimComponent;