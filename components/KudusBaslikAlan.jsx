import React from 'react'
import { Box,Image,Container,Flex,Text,Center,Grid,Heading} from '@chakra-ui/react'
import { url } from 'inspector'
export default function KudusBaslikAlan({baslik,hadis}) {
    let kudusbgheight;
    if(hadis){
        kudusbgheight="700px";
    }else{
        kudusbgheight="320px";
    }
  return (
    <Flex width={'100%'} height={kudusbgheight} direction={'column'} justifyContent={'center'} borderRadius={25} mt={10} position={'relative'} bgImage={"url(/kudusbgblue.png)"} bgPos={'center'} bgRepeat={'no-repeat'} bgSize={'cover'} py={'10em'}>
        <Container maxW={1020}>
            <Center>
            <Flex direction={'column'}>
                <Heading as='h1' fontSize={{base:32,lg:47}} noOfLines={1} color={'#FFF'} fontWeight={800} textAlign={'center'}>
                    KUDÜS
                </Heading>
                <Heading as='h2' fontSize={{base:26,lg:32}} noOfLines={1} color={'#83E9FF'} fontWeight={800} textAlign={'center'}>
                    {baslik}
                </Heading>
                {hadis && hadis.status &&
                <Center>
                    <Box color={'#fff'} width={{base:'100%',lg:440}} fontSize={14} fontWeight={400} mt={10} p={4} px={6} className='kudusonaciklama' borderRadius={15} borderTopWidth={7} borderRightWidth={7} borderStyle={'solid'} borderColor={'#fff'}>
                    <Text fontWeight={600} fontSize={18}>HADİS-İ ŞERİF</Text>
                    <div dangerouslySetInnerHTML={{__html:hadis.data[0].detail}} />
                    </Box>
                </Center>
                }
            </Flex>
            </Center>
        </Container>
    </Flex>
  )
}
