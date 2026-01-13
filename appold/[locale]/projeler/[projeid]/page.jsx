import React from 'react'
import { Box,Image,Container,Flex,Text,Grid,Link} from '@chakra-ui/react'
import BagisKutuButtonComponent from '../../BagisKutuButtonComponent';
import BagisKutuComp from '../../components/BagisKutuComp';

const dataq = [
    {
        id:1,
        image: "https://eldenele.org.tr//upload/arsiv/opt-health-K00R5SS9BTY21PUU9I90.jpg",
        title: "Sağlık Merkezi Programı",
    }
];

export default function ProjeId() {
  return (
    <main style={{background:'#f8f8f8'}}>
    <Flex alignItems={"flex-end"} justifyContent={"center"} height="320" backgroundImage="url('https://eldenele.org.tr//images/onlinebagis-banner.jpg')" backgroundPosition="center">
    <Text style={{marginBottom:"40px",textAlign:'center',fontSize:32,color:'white',fontWeight:"500"}}>SAĞLIK PROJELERİ</Text>
    </Flex>
    <Container maxW={1200} py={10}>
        <Text align={"center"}>Dünya genelinde ve coğrafyamızda, her gün binlerce insan, temel sağlık hizmetlerine erişimleri olmadığı için hayatını kaybediyor.<br/><br/>
        Kötü yaşam koşulları, salgın hastalıklar, yetersiz beslenme ve krizler nedeniyle ‘ilaç ve tedaviye’ ulaşamayan insanlara yardım etmek için çeşitli projeler geliştirdik.
        <br/><br/>Bu bağlamda, desteklediğimiz ve sürdürülebilir hizmet vermelerine katkı sunduğumuz sağlık kuruluşları bulunuyor. Yoksul bölgelere doktor ve ilaç temini ise önceliklerimiz arasında yer alıyor.</Text>

    <Grid templateColumns={['repeat(1, 1fr)','repeat(3, 1fr)']} gap={6} mt={8}>
    {dataq.map((post, index) => (
        <BagisKutuComp key={post.id} bagid={post.id} baslik={post.title} img={post.image} />
    ))}
    </Grid>
    </Container>
    </main>
  )
}
