"use client";
import React from 'react';
import { Box, Image, Flex, Text, IconButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer, useToast } from '@chakra-ui/react';
import { FaRegCopy } from "react-icons/fa";

export default function HesapNumaraComp({ data }) {
  const Toast = useToast();

  // Function to copy text and show toast notification
  const kopyalaText = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        Toast({
          title: 'Bilgiler Kopyalandı',
          position: 'bottom-right',
          isClosable: true,
        });
      })
      .catch((err) => {
        console.error('Metin kopyalanırken bir hata oluştu: ', err);
      });
  };

  // Kopyalama ikon butonu
  const kopyala = (text) => (
    <IconButton aria-label='Kopyala' p={2} minW={'auto'} height={'auto'} icon={<FaRegCopy size={10} />} ml={2} onClick={() => kopyalaText(text)} />
  );

  // Function to get the value of a parameter or return "-"
  const getParamValue = (multiparams, key) => {
    const param = multiparams.find(param => param.type.key === key);
    return param ? param.value : "-";
  };

  return (
    <Flex direction={"column"} gap={10} py={10}>
      {data.map((post, index) => {
        const multiparams = post.multiparams;
        if (!multiparams) return null;

        // Get all the necessary parameters
        const subeadi = getParamValue(multiparams, "672d148dd4edfd5b85672c00");
        const swift = getParamValue(multiparams, "672d14a2d4edfd5b85672c02");
        const hesapadi = getParamValue(multiparams, "672d14b6d4edfd5b85672c04");

        const hesapturutl = getParamValue(multiparams, "672d156dd4edfd5b85672c11");
        const hesapnotl = getParamValue(multiparams, "672d1574d4edfd5b85672c13");
        const hesapeknotl = getParamValue(multiparams, "672d157dd4edfd5b85672c15");
        const hesapibantl = getParamValue(multiparams, "672d1583d4edfd5b85672c17");

        const hesapturudolar = getParamValue(multiparams, "672d1590d4edfd5b85672c19");
        const hesapnodolar = getParamValue(multiparams, "672d1597d4edfd5b85672c1b");
        const hesapeknodolar = getParamValue(multiparams, "672d159ed4edfd5b85672c1d");
        const hesapibandolar = getParamValue(multiparams, "672d15a6d4edfd5b85672c1f");

        const hesapturueuro = getParamValue(multiparams, "672d15c9d4edfd5b85672c21");
        const hesapnoeuro = getParamValue(multiparams, "672d15d0d4edfd5b85672c23");
        const hesapeknoeuro = getParamValue(multiparams, "672d15d8d4edfd5b85672c25");
        const hesapibaneuro = getParamValue(multiparams, "672d15e0d4edfd5b85672c27");

        return (
          <Box key={index} width={"100%"} bg={"#FFF"} p={8} borderRadius={25} style={{ boxShadow: "0px 0px 10px -1px rgba(0,0,0,0.10)" }}>
            <Flex direction={{ base: 'column', lg: "row" }} gap={10}>
              <Flex direction={'column'} gap={4}>
                <Box borderBottomWidth={1} borderColor={'#eee'} pb={5}><Image src={"https://minberiaksa.org/uploads/" + post.picture} height={'60px'} /></Box>
                <Flex direction={'row'} justifyContent={'space-between'}>
                  <Box><Text color={'#04819C'} fontSize={14} fontWeight={700}>ŞUBE ADI</Text><Text fontSize={14} fontWeight={500}>{subeadi} {kopyala(subeadi)}</Text></Box>
                  <Box><Text color={'#04819C'} fontSize={14} fontWeight={700}>SWIFT KODU</Text><Text fontSize={14} fontWeight={500}>{swift} {kopyala(swift)}</Text></Box>
                </Flex>
                <Box><Text color={'#04819C'} fontSize={14} fontWeight={700}>HESAP ADI</Text><Text fontSize={14} fontWeight={500}>{hesapadi} {kopyala(hesapadi)}</Text></Box>
              </Flex>
              <Flex flex={1} mt={5}>
                <TableContainer className="hesapbilgileri" width={'100%'}>
                  <Table variant='unstyled'>
                    <Thead>
                      <Tr>
                        <Th>HESAP TÜRÜ</Th>
                        <Th>HESAP NO</Th>
                        <Th>EK NO</Th>
                        <Th>IBAN</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td borderTopLeftRadius="md">{hesapturutl}</Td>
                        <Td>{hesapnotl} {kopyala(hesapnotl)}</Td>
                        <Td>{hesapeknotl}</Td>
                        <Td>{hesapibantl} {kopyala(hesapibantl)}</Td>
                      </Tr>
                      <Tr>
                        <Td borderTopLeftRadius="md">{hesapturueuro}</Td>
                        <Td>{hesapnoeuro} {kopyala(hesapnoeuro)}</Td>
                        <Td>{hesapeknoeuro}</Td>
                        <Td>{hesapibaneuro} {kopyala(hesapibaneuro)}</Td>
                      </Tr>
                      <Tr>
                        <Td borderTopLeftRadius="md">{hesapturudolar}</Td>
                        <Td>{hesapnodolar} {kopyala(hesapnodolar)}</Td>
                        <Td>{hesapeknodolar}</Td>
                        <Td>{hesapibandolar} {kopyala(hesapibandolar)}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </TableContainer>
              </Flex>
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
}
