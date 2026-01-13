import React from 'react';
import "./styles/styles.css"
import { Container} from '@chakra-ui/react'
import { cache } from "react";
import {customFetch} from "@/main/utilities/customFetch";
import SliderBox from "@/components/anasayfa/SliderBox";

const getPost = cache(async () => {
    return await customFetch({type:'sliderlist'});
});
const getPost_kurumsal = cache(async () => {
  return await customFetch({type:'list',id:'672230bc012d3f025450d1fa'});
});

const SliderComponent = async () => {
    const posts = await getPost(); // Veriyi al
    let poststatus = posts.status;
    let postdata = posts.data;

    const posts_kurumsal = await getPost_kurumsal(); // Veriyi al
    let poststatus_kurumsal = posts_kurumsal.status;
    let postdata_kurumsal = posts_kurumsal.data;
    let multiparams = postdata_kurumsal.find(param => param.token == "67223650012d3f025450d215").multiparams;
    let tanitimvideomuz = multiparams.find(param => param.type.key === "673c8fecada526e2a5841a88").value;
    let tanitimvideomuz_metin = multiparams.find(param => param.type.key === "6779715f9d2dfc5d7ebb2da8").value;
  

  return (
   
    <Container maxW='100%' p={0}>
    <SliderBox data={postdata} tanitimvideomuz={tanitimvideomuz} tanitimvideomuz_metin={tanitimvideomuz_metin} />
    
    {/*loaded && instanceRef.current && (
     <Flex direction="row" justify="flex-end" gap="2" style={{marginTop:"-35px",right:40,position:"absolute",zIndex:5}}>
      {[
        ...Array(instanceRef.current.track.details.slides.length).keys(),
      ].map((idx) => {
        return (
          <Box
            key={idx}
            onClick={() => {
              instanceRef.current?.moveToIdx(idx)
            }}
            style={{width:13,height:13,background: currentSlide == idx ? "red" : "#eee",borderRadius:10,borderWidth:2,borderColor:"#ccc",borderStyle:"solid"}}
            className={"dot" + (currentSlide === idx ? " active" : "")}
          ></Box>
        )
      })}
    </Flex>
    )*/}
    
    </Container>
  );
};

export default SliderComponent;