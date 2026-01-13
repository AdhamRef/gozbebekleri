import React from 'react'
import { Box,Image,Heading,Center,Container,Flex,Text} from '@chakra-ui/react'
import { headers } from "next/headers";
import AylikBagisForm from '@/components/AylikBagisForm';

export default function page() {
    const heads = headers();
    const pathname = heads.get("x-pathname"); 
    let dil;
    if(pathname != "ar" && pathname != "en"){
      dil = "tr";
    }else{
      dil = pathname;
    }

if(dil=="tr"){
  return (
    <main className='duzenlibagissayfa' style={{margin:'60px 0px'}}>
        <Container maxW={1200}>
            
        <Heading as='h1' size='xl' noOfLines={1} color={'#b12120'} fontWeight={600} textAlign={'center'}>
        Devamlı bir bağışın... <span style={{color:'orange'}}>olması için.</span>
        </Heading>

        <Flex direction={'column'} style={{margin:'40px 0px'}}>
        <AylikBagisForm />
        </Flex>

        <Flex direction={'row'} gap={5} bg={'#fbfbfb'} p={7}>
            <Text fontSize={18}>{"Allah için bir ticaret istiyorsanız Allah yolunda yatırım yapmak en büyük fırsatlardan biridir. Allah’ın izniyle paranız her ay bereketli olur ve sonsuza kadar garantili kazanç elde edersiniz. Yapacağınız bağışlar bereketin merkezi mübarek Kudüs’e yönelik olduğu için elde edeceğiniz sevap da bereketli olacaktır."}</Text>
            <Image src={'/duzenlibagis/elektronikkuduscuzdani.png'} width={'40%'} />
        </Flex>
        

        <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
            <Text fontSize={28} color={'#b07117'} fontWeight={'700'}>Kudüs için ayrılan kesinti ne kadar?</Text>
            <Text>{"Aylık kesintinin amacı, aylık gelirin küçük bir kısmını Mescid-i Aksa'ya, Kudüs ve halkına hizmet edecek projelere destek olacak bir sadaka olarak tahsis etmektir. Ebu Hureyre’den. (Allah ondan razı olsun) rivayet edildiğine göre o şöyle demiştir: Resulullah (sav) buyurdu ki: Her günün sabahında iki melek iner. Bunlardan biri: \"Allah’ım! Malını verene ardından yenisini ver!\" diye dua eder. Diğeri de: \"Allah'ım! Cimrilik edenin malını yok et!\" diye beddua eder."}</Text>
        </Flex>

        <Box py={10}>
            <Text textAlign={'center'} fontSize={28} color={'#b07117'} fontWeight={'700'}>Kesintinin faydası nedir?</Text>
            <Flex direction={'row'} wrap={'wrap'} gap={5} mt={10}>
                <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                    <Text fontSize={18}>{"Kesintiniz aydan aya değişen projelere hizmet edeceğinden, aylık vermeye devam ederek projelerin sürekliliğini ve çeşitliliğini sağlayın."}</Text>
                    <Image src={'/duzenlibagis/kesintininfaydasi1.png'} height={'137px'} />
                </Flex>
                <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                    <Text fontSize={18}>{"Görevimiz olan Kudüs ve Mescid-i Aksa’ya yönelik sorumluluklarımızı yerine getirerek Peygamber Efendimizin vasiyetine bir kandil yağ hediye edelim"}</Text>
                    <Image src={'/duzenlibagis/kesintininfaydasi2.png'} height={'137px'} />
                </Flex>
            </Flex>
            <Flex direction={'row'} wrap={'wrap'} gap={5} mt={5}>
                <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                    <Text fontSize={18}>{"Derneğin projeleri aracılığıyla Kudüs'ün desteklenmesine katkıda bulunan sürekli bir mali kaynak oluşturmak."}</Text>
                    <Image src={'/duzenlibagis/kesintininfaydasi3.png'} height={'137px'} />
                </Flex>
                <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                    <Text fontSize={18}>{"Müslümanı, hem dünyada hem de ahirette mutluluk ve bereketi getirecek bağışı vermeye alıştırmak."}</Text>
                    <Image src={'/duzenlibagis/kesintininfaydasi4.png'} height={'137px'} />
                </Flex>
            </Flex>
        </Box>

        <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
            <Text textAlign={'center'}  fontSize={28} color={'#b07117'} fontWeight={'700'}>Kesintinin hizmet edeceği projeler?</Text>
            <Image src={'/duzenlibagis/kesintininhizmetedecegiprojeler.png'} width={'100%'} />
            <Text textAlign={'center'} fontSize={24}>{"Ve unutmayın ki Allah katında amellerin en sevimlisi, az da olsa devamlı olanıdır."}</Text>
            <Center><iframe src="https://charitygiving.net/iframe/eyJpdiI6IjJBOWlONEJhN3U4VC9iZlI0R0FCemc9PSIsInZhbHVlIjoiZEZBQytTVU5ZSitRMy9WZkJONEt4dz09IiwibWFjIjoiZGM3MDRiOTUyMTc5YzYxNzMzMmZhY2NkNDU5NWVmZGM4MzAwNWNlMjM1ODNhN2Q1ZDkxN2NiZGRhY2M3NTBjMyIsInRhZyI6IiJ9" allow="payment" frameborder="0" height="700" width="400"></iframe></Center>
        </Flex>
        </Container>
    </main>
  )
}


if(dil=="en"){
    return (
      <main className='duzenlibagissayfa' style={{margin:'60px 0px'}}>
          <Container maxW={1200}>
          <Heading as='h1' size='xl' noOfLines={1} color={'#b12120'} fontWeight={600} textAlign={'center'}>
          Let there be for you... <span style={{color:'orange'}}>continuous generosity.</span>
          </Heading>
          <Flex direction={'column'} style={{margin:'40px 0px'}}>
            <AylikBagisForm />
          </Flex>
  
          <Flex direction={'row'} gap={5} bg={'#fbfbfb'} p={7}>
              <Text fontSize={18}>{"In front of you is one of the greatest opportunities for investment with God in a trade that will not incur losses. Your wealth will be blessed monthly, and it will bring you guaranteed and multiplied profits with the honor of the place, and it will be enduring, God willing, throughout time. The returns will multiply, and the benefit of the share will rise because it is in Jerusalem, where the rewards are multiplied, and the blessings are continuous."}</Text>
              <Image src={'/duzenlibagis/en/elektronikkuduscuzdani.png'} width={'40%'} />
          </Flex>

          <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
              <Text fontSize={28} color={'#b07117'} fontWeight={'700'}>What is the deduction for Jerusalem?</Text>
              <Text>{"The concept of monthly deduction involves allocating a small portion of monthly income as continuous charity for projects that serve Al-Aqsa Mosque, the city of Jerusalem, and its inhabitants. As narrated by Abu Huraira, may Allah be pleased with him, the Prophet (peace be upon him) said: \"There is no day in which the servants get up that two angels come down. One of them says, 'O Allah, give to the one who spends a substitute (for what he has given in charity).' The other one says, 'O Allah, give to the one who withholds (his money) destruction!'\" (Agreed upon)"}</Text>
          </Flex>
  
          <Box py={10}>
              <Text textAlign={'center'} fontSize={28} color={'#b07117'} fontWeight={'700'}>What is the benefit of the deduction?</Text>
              <Flex direction={'row'} wrap={'wrap'} gap={5} mt={10}>
                  <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>{"Ensuring the continuity and ongoing diversification of projects through monthly contributions, as your deduction will serve projects that vary from month to month"}</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi1.png'} height={'137px'} />
                  </Flex>
                  <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>{"Fulfilling the duty and compensating for shortcomings towards the city of Jerusalem and its Al-Aqsa Mosque, and adhering to the Prophet's directive by dedicating olive oil to Al-Aqsa"}</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi2.png'} height={'137px'} />
                  </Flex>
              </Flex>
              <Flex direction={'row'} wrap={'wrap'} gap={5} mt={5}>
                  <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>{"Creating a consistent financial stream that contributes to supporting Jerusalem through the foundation's projects"}</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi3.png'} height={'137px'} />
                  </Flex>
                  <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>{"Accustoming Muslims to generosity and giving, achieving blessings in sustenance, and happiness in both worlds for the donor"}</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi4.png'} height={'137px'} />
                  </Flex>
              </Flex>
          </Box>
  
          <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
              <Text textAlign={'center'}  fontSize={28} color={'#b07117'} fontWeight={'700'}>Which projects will the deduction serve?</Text>
              <Image src={'/duzenlibagis/en/kesintininhizmetedecegiprojeler.png'} width={'100%'} />
              <Text textAlign={'center'} fontSize={24}>{"And do not forget that the deeds most beloved to Allah are those performed consistently, even if they are few."}</Text>
              <Center><iframe src="https://charitygiving.net/iframe/eyJpdiI6IjJBOWlONEJhN3U4VC9iZlI0R0FCemc9PSIsInZhbHVlIjoiZEZBQytTVU5ZSitRMy9WZkJONEt4dz09IiwibWFjIjoiZGM3MDRiOTUyMTc5YzYxNzMzMmZhY2NkNDU5NWVmZGM4MzAwNWNlMjM1ODNhN2Q1ZDkxN2NiZGRhY2M3NTBjMyIsInRhZyI6IiJ9" allow="payment" frameborder="0" height="700" width="400"></iframe></Center>
          </Flex>
          </Container>
      </main>
    )
  }
  if(dil=="ar"){
    return (
      <main className='duzenlibagissayfa' style={{margin:'60px 0px'}}>
          <Container maxW={1200}>
          <Heading as='h1' size='xl' noOfLines={1} color={'#b12120'} fontWeight={600} textAlign={'center'}>
          <span style={{color:'orange'}}>ليكن لك </span> ، عطاء مستمر 
          </Heading>
          
          <Flex direction={'column'} style={{margin:'40px 0px'}}>
            <AylikBagisForm />
          </Flex>
  
          <Flex direction={'row'} gap={5} bg={'#fbfbfb'} p={7}>
              <Text fontSize={18}>{"بين يديك واحدة من أعظم فرص الاستثمار مع الله في تجارة لن تبور، تُبارك مالك شهرياً، وتعود عليك بأرباح مضمونة مضاعفة بشرف المكان ودائمة بإذن الله مدى الزمان ويتضاعف العائد وتعلو منفعة السهم لكونه في القدس حيث الأجور المضاعفة والحسنات المُباركة"}</Text>
              <Image src={'/duzenlibagis/ar/elektronikkuduscuzdani.png'} width={'40%'} />
          </Flex>

          <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
              <Text fontSize={28} color={'#b07117'} fontWeight={'700'}>ما هو الاستقطاع للقدس؟</Text>
              <Text>{"تقوم فكرة الاستقطاع الشهري على تخصيص جزء يسير من الدخل الشهري ليكون صدقة مستمرة لمشاريع تخدم المسجد الأقصى ومدينة القدس وأهلها “عن أبي هُريرة رضي الله عنه قَالَ: قالَ رَسُول اللَّه: (مَا مِنْ يَوْمٍ يُصبِحُ العِبادُ فِيهِ إِلَّا مَلَكَانِ يَنْزِلانِ، فَيَقُولُ أَحَدُهُمَا: اللَّهُمَّ أَعْطِ مُنْفِقًا خَلَفًا، وَيَقُولُ الآخَرُ: اللَّهُمَّ أَعْطِ مُمْسِكًا تَلَفًا). متفقٌ عَلَيْهِ”"}</Text>
          </Flex>
  
          <Box py={10}>
              <Text textAlign={'center'} fontSize={28} color={'#b07117'} fontWeight={'700'}>ما الفائدة من الاستقطاع؟</Text>
              <Flex direction={'row'} wrap={'wrap'} gap={5} mt={10}>
                  <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>ضمان استمرارية المشاريع وتنوعها باستمرار العطاء شهريا، فاستقطاعك سيخدم مشاريع تختلف من شهر لآخر.</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi1.png'} height={'137px'} />
                  </Flex>
                  <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>القيام بالواجب وجبران القصور نحو مدينه القدس ومسجدها الأقصى والعمل بوصية الرسول بإهداء الأقصى زيتا</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi2.png'} height={'137px'} />
                  </Flex>
              </Flex>
              <Flex direction={'row'} wrap={'wrap'} gap={5} mt={5}>
                  <Flex flex={1} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>إيجاد رافد مالي مستمر يساهم في دعم القدس عبر مشاريع المؤسسة.</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi3.png'} height={'137px'} />
                  </Flex>
                  <Flex flex={1}  width={'45%'} direction={'row'} bg={'#f7f7f7'} padding={8}>
                      <Text fontSize={18}>تعويد المسلم على البذل والعطاء بما يحقق للمتبرع البركة في الرزق والسعادة في الدارين</Text>
                      <Image src={'/duzenlibagis/kesintininfaydasi4.png'} height={'137px'} />
                  </Flex>
              </Flex>
          </Box>
  
          <Flex direction={'column'} gap={5} bg={'#fbfbfb'} p={7} mt={7}>
              <Text textAlign={'center'}  fontSize={28} color={'#b07117'} fontWeight={'700'}>المشاريع التي سيخدمها الاستقطاع؟</Text>
              <Image src={'/duzenlibagis/ar/kesintininhizmetedecegiprojeler.png'} width={'100%'} />
              <Text textAlign={'center'} fontSize={24}>ولا تنسى أن أحب الأعمال إلى الله ما داوم عليه صاحبه وإن كان قليلاً</Text>
              <Center><iframe src="https://charitygiving.net/iframe/eyJpdiI6IjJBOWlONEJhN3U4VC9iZlI0R0FCemc9PSIsInZhbHVlIjoiZEZBQytTVU5ZSitRMy9WZkJONEt4dz09IiwibWFjIjoiZGM3MDRiOTUyMTc5YzYxNzMzMmZhY2NkNDU5NWVmZGM4MzAwNWNlMjM1ODNhN2Q1ZDkxN2NiZGRhY2M3NTBjMyIsInRhZyI6IiJ9" allow="payment" frameborder="0" height="700" width="400"></iframe></Center>
          </Flex>
          </Container>
      </main>
    )
  }
}
