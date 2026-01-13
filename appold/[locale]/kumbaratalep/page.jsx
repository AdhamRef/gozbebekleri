import React from 'react'
import { Box,Image,Container,Flex,Text,Input,InputGroup,InputLeftElement,Button,Heading} from '@chakra-ui/react'
import {customFetch} from "@/main/utilities/customFetch";
import Breadcrumbs from "@/components/breadcrumbs";
import AsideOtherPages from "@/components/AsideOtherPages";
import { cache } from "react";
import Head from 'next/head';
import '@/dosyalar/css/bootstrap.min.css';
import '@/dosyalar/css/bootstrapform.css';
import Formlar from "@/components/Formlar/formlar";

const getPost = cache(async ({detayid}) => {
    /*const slugToken = await customFetch({type:'slug',text:detayid});
    let token = slugToken.data.keyID;*/
    return await customFetch({ type: 'forms'});
});

export async function generateMetadata({ params }) {
    const posts = await getPost({ detayid: params.detayid }); // detayid'i doğrudan geçiriyoruz
    const poststatus = posts.status;
    const postdata = posts.data[0];

    return {
        title: poststatus ? postdata.title : "Varsayılan Başlık",
        description: poststatus ? postdata.title : "Varsayılan Açıklama",
    };
}
export default async function page({params}) {
    const posts = await getPost({ detayid: params.detayid });
    let poststatus = posts.status;
    let postdata = posts.data[0];
    let formdata = '<form method="post" action="" autocomplete="off" id="volunteerForm"> <div class="form-section"> <div class="form-section-title">Gönüllü Başvuru Formu</div> <div class="row mb-3"> <div class="col-md-6"> <div class="mb-3"> <label for="adsoyad" class="form-label">Ad Soyad *</label> <input type="text" class="form-control" name="adsoyad" id="adsoyad" maxlength="50" required> </div> <div class="mb-3"> <label for="telefon" class="form-label">Telefon Numarası</label> <input type="tel" class="form-control" name="telefon" id="telefon" maxlength="17"> </div> <div class="mb-3"> <label for="eposta" class="form-label">E-posta Adresi *</label> <input type="email" class="form-control" name="eposta" id="eposta" maxlength="50" required> </div> <div class="mb-3"> <label for="dogumyil" class="form-label">Doğum Yılı *</label> <input type="number" class="form-control" name="dogumyil" id="dogumyil" min="1944" max="2006" required> </div> <div class="mb-3"> <label for="sehir" class="form-label">Şehir *</label> <input type="text" class="form-control" name="sehir" id="sehir" maxlength="50" required> </div> <div class="mb-3"> <label for="meslek" class="form-label">Meslek *</label> <input type="text" class="form-control" name="meslek" id="meslek" maxlength="50" required> </div> <div class="mb-3"> <label for="yabancidil" class="form-label">Yabancı Dil</label> <input type="text" class="form-control" name="yabancidil" id="yabancidil" maxlength="50"> </div> <div class="mb-3"> <label for="ogrenim" class="form-label">Öğrenim Durumu *</label> <input type="text" class="form-control" name="ogrenim" id="ogrenim" maxlength="50" required> </div> </div> <div class="col-md-6"> <div class="mb-3"> <label for="kudusziyaret" class="form-label">Daha Önce Kudüse Gittiniz mi? *</label> <select name="kudusziyaret" id="kudusziyaret" class="form-control" required> <option value="">Lütfen Seçiniz...</option> <option value="evet">Evet</option> <option value="hayir">Hayır</option> </select> </div> <div class="mb-3"> <label for="gonullualan" class="form-label">Gönüllü Olmak İstediğiniz Alan *</label> <select name="gonullualan" id="gonullualan" class="form-control" required> <option value="">Lütfen Seçiniz...</option> <option value="Gençlik Birimi">Gençlik Birimi</option> <option value="Kadın Birimi">Kadın Birimi</option> <option value="Araştırma Ekibi">Araştırma Ekibi</option> <option value="Sosyal Medya">Sosyal Medya</option> <option value="Grafik Tasarım">Grafik Tasarım</option> <option value="Diğer">Diğer</option> </select> </div> <div class="mb-3"> <label for="gonulludurum" class="form-label">Gönüllülük Durumunuz *</label> <select name="gonulludurum" id="gonulludurum" class="form-control" required> <option value="">Lütfen Seçiniz...</option> <option value="aktif">Çalışmalara Aktif Katılmak İstiyorum</option> <option value="pasif">Gönüllü Temsilciniz Olmak İstiyorum</option> </select> </div> <div class="mb-3"> <label for="digeruyelik" class="form-label">Üyesi Olduğunuz Sivil Toplum Kuruluşları</label> <input type="text" class="form-control" name="digeruyelik" id="digeruyelik" maxlength="150"> </div> <div class="mb-3"> <label for="whatsappgrup" class="form-label">Whatsapp Gruplarımızda Yer Almak İstiyor musunuz? *</label> <select name="whatsappgrup" id="whatsappgrup" class="form-control" required> <option value="">Lütfen Seçiniz...</option> <option value="evet">Evet</option> <option value="hayir">Hayır</option> </select> </div> <div class="mb-3"> <label for="haberdar" class="form-label">Derneğimizden Nasıl Haberdar Oldunuz? *</label> <select name="haberdar" id="haberdar" class="form-control" required> <option value="">Lütfen Seçiniz...</option> <option value="Whatsapp">Whatsapp</option> <option value="Twitter">Twitter</option> <option value="Instagram">Instagram</option> <option value="Facebook">Facebook</option> <option value="Linkedin">Linkedin</option> <option value="Reklam">Reklam</option> <option value="Diğer">Diğer</option> </select> </div> <div class="mb-3"> <label for="dusunceler" class="form-label">Düşünceler</label> <textarea class="form-control" name="dusunceler" id="dusunceler" style="height: 69px;"></textarea> </div> </div> </div> </div> <div class="text-center">  </div> </form>';
    return (
    <>
    <Head>
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auUjK/fz97hZVxan2hwD8D91jjt8dFYh9D6aK7"
        crossOrigin="anonymous"
    />
    <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+P3P4EaG7h09gTTfj0I5qPcKz3xU/"
        crossOrigin="anonymous"
        defer
    ></script>
    </Head>
    <main>
    <Container maxW={1020} p={0}>
    <Flex direction={'column'} bgColor={'#FFF'} borderRadius={25} p={'2em'} py={'2.5em'} mt={10} style={{boxShadow:'0px 0px 10px -1px rgba(0,0,0,0.19)'}} >
        <Heading as='h1' fontSize='22' noOfLines={1} color={'#04819C'} fontWeight={600}>
        {postdata.formadi}
        </Heading>
        <Breadcrumbs line={{kategori:postdata.formadi}} />
    </Flex>
    <Formlar postdata={postdata} formdata={formdata} />
    </Container>
    </main>
    </>
  )
}
