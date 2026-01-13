import {
  Container,
  Image,
  Box,
  Text,
  Heading,
  Center,
  Button,
} from "@chakra-ui/react";
import styles from "./page.module.css";
import Slider from "./SliderComponent";
import Slider2 from "./SliderComponent2";
import BagisDonenKutu from "./BagisDonenKutuComponent";
import HaberlerAlanComponent from "./HaberlerAlanComponent";
import FotoVideoGaleriServer from "@/components/anasayfa/FotoVideoGaleriServer";
import BagisKategoriler from "@/components/BagisKategoriler";
import HedefliBagislar from "@/components/HedefliBagislar";
import ProjelerVitrin from "@/components/ProjelerVitrin";
import FooterBanner from "@/components/FooterBanner";
export default function Home() {
  return (
    <main>
      <Box>
        <Slider2 />
      </Box>

      <Box
        mt={5}
        py={"1em"}
        borderTopWidth={1}
        borderColor={"#E8E8E8"}
        borderBottomWidth={1}
        borderStyle={"solid"}
        backgroundColor={"#fff"}
      >
        <Container maxW="1200" p={0} px={{ base: 3, lg: 0 }}>
          <BagisKategoriler />
        </Container>
      </Box>

      <Box
        bgImage="url('/hedefliprojelerbg.jpg')"
        bgPosition={"center center"}
        bgSize={"cover"}
        my={0}
        py={2}
        pb={{ base: "2em", lg: "2em" }}
        pt={{ base: 2, lg: "2em" }}
      >
        <Container maxW="1200">
          <HedefliBagislar />
        </Container>
      </Box>

      <Box
        bgImage="url('/haberlertanitimbg.jpg')"
        bgPosition={"center center"}
        bgSize={"cover"}
        py={{ base: 2, lg: "2em" }}
      >
        <Container maxW="1200" p={0} px={{ base: 3, lg: 0 }}>
          <HaberlerAlanComponent />
        </Container>
      </Box>

      <Box py={{ base: 2, lg: "2em" }}>
        <Container maxW="1200" p={0} px={{ base: 3, lg: 0 }}>
          <FotoVideoGaleriServer />
        </Container>
      </Box>

      <Box>
        <FooterBanner />
      </Box>
    </main>
  );
}
