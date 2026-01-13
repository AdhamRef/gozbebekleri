"use client";
import React, { createContext, useContext, useState,useEffect  } from 'react';

const ModalContext = createContext();
export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [sepeteEkleAlert, setSepeteEkleAlert] = useState(false);
  const [priceModal, setPriceModal] = useState(0);
  const [bagisTipi, setBagisTipi] = useState(0);
  const [basketItem, setBasketItem] = useState();
  const [bagisItem, setBagisItem] = useState();
  const [duzenlibagisBilgileri, setDuzenliBagisBilgileri] = useState({});
  const [donateInfoModal, setDonateInfoModal] = useState(0);
  const [modalKimAdina, setModalKimAdina] = useState(0);
  const [duzenlemeEkrani, setDuzenlemeEkrani] = useState(false);
  const [sadeceFiyatGoster, setSadeceFiyatGoster] = useState(false);
  const [yonlendirmeDurumu, setYonlendirmeDurumu] = useState(false);

  const showModal = (price,donationid,bagistipi,bagisItem,duzenlibagisBilgileriInput,kimAdina) => { setPriceModal(price); setDonateInfoModal(donationid); setModalOpen(true); setBagisTipi(bagistipi); setBagisItem(bagisItem);setDuzenlemeEkrani(false);setDuzenliBagisBilgileri(duzenlibagisBilgileriInput); setModalKimAdina(kimAdina);}
  const sepeteEkle = (price,donationid,bagistipi,bagisItem,duzenlibagisBilgileriInput,yonlendirmeDurumu) => { setSepeteEkleAlert(false); setPriceModal(price); setDonateInfoModal(donationid); setSepeteEkleAlert(true); setBagisTipi(bagistipi); setBagisItem(bagisItem); setDuzenliBagisBilgileri(duzenlibagisBilgileriInput);setYonlendirmeDurumu(yonlendirmeDurumu);}
  const hideModal = () => {setModalOpen(false); setBasketItem(); setModalKimAdina(0);}
  const hideSepeteEkle = () => {setSepeteEkleAlert(false);}
  const bagisDuzenle = (donationid,basketitem,kimAdina,bagisitem,bagistipi) => {setModalOpen(true); setDonateInfoModal(donationid); setBasketItem(basketitem); setModalKimAdina(kimAdina); setBagisItem(bagisitem);setBagisTipi(bagistipi);setDuzenlemeEkrani(true);}

  return (
    <ModalContext.Provider value={{ isModalOpen, showModal, hideModal, priceModal, donateInfoModal, bagisTipi,sepeteEkle,sepeteEkleAlert,hideSepeteEkle,basketItem,bagisDuzenle,modalKimAdina,bagisItem,duzenlemeEkrani,duzenlibagisBilgileri,yonlendirmeDurumu,sadeceFiyatGoster}}>
      {children}
    </ModalContext.Provider>
  );
};