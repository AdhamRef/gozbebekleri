"use client"; // Bu dosyanın bir Client Component olduğunu belirtir
import { useSelector, useDispatch } from "react-redux";
import Swal from 'sweetalert2'
import {oturumGuncelle} from '@/redux/slices/oturumSlice';
import {sepetArtir, sepetBelirle, sepetTemizle} from '@/redux/slices/sepetSlice';
export const SepeteEkleFetch = async (dilfetch,name,email,phone,kimadina,price,currency,dispatch,paymenttoken,membertoken,membertype,bagisTipi,sb,events='add',baskettoken,duzenlibagisBilgileri)  =>{
    try{

          let sepetaddbody = {};
          if(paymenttoken != ""){
            sepetaddbody['paymenttoken'] = paymenttoken;
          }
          if(membertoken != ""){
            sepetaddbody['membertoken'] = membertoken;
            sepetaddbody['membertype'] = membertype;
          }
          sepetaddbody['name'] = name;
          sepetaddbody['email'] = email;
          sepetaddbody['phone'] = phone;
          sepetaddbody['persontype'] = kimadina;
          if(bagisTipi == "1"){
            sepetaddbody['quantity'] = price;
          }else{
            sepetaddbody['price'] = price;
          }
          sepetaddbody['pricetype'] = bagisTipi;
          sepetaddbody['key'] = sb;
          sepetaddbody['events'] = events;
          sepetaddbody['currency'] = currency;
          if(events=='change'){
            sepetaddbody['baskettoken']=baskettoken;
          }

          if (duzenlibagisBilgileri && Object.keys(duzenlibagisBilgileri).length > 0) {
            sepetaddbody['regular_payment']="1";
            sepetaddbody['regular_repeat']=duzenlibagisBilgileri.regular_repeat;
            sepetaddbody['regular_repeatDay']=duzenlibagisBilgileri.regular_repeatDay;
            sepetaddbody['msg']=duzenlibagisBilgileri.msg;

          }
          
          const response_ham = await fetch('/api/sepet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Verinin JSON formatında olduğunu belirt
                'Accept-Language': dilfetch,
            },
            body: JSON.stringify(sepetaddbody),
          });

        const response = await response_ham.json();

        if(response.status==true){
          let paytoken = response.paymenttoken;
          let memtoken = response.membertoken;
          let memtype = response.membertype;
          let basketcount = response.basketcount;
          if(kimadina=="0"){
            dispatch(oturumGuncelle({paymenttoken:paytoken,membertoken:memtoken,membertype:memtype}));
          }
          if(events == "add"){
            dispatch(sepetBelirle(basketcount));
          }
          localStorage.setItem('paymenttoken',paytoken);
        }else if(response.status=="clean"){
          dispatch(oturumGuncelle({paymenttoken:""}));
          if(events == "add"){
            dispatch(sepetTemizle());
          }
          localStorage.setItem('paymenttoken',"");
        }
        return response;
    }catch(error){
        console.log(error);
    }
}