"use client";
import React from 'react'
import { Box,Flex,Step,StepDescription,StepIcon,StepIndicator,StepSeparator,StepStatus,StepTitle,Stepper,useSteps } from '@chakra-ui/react'
import { BsBasket3Fill,BsCreditCard2BackFill , BsFillHeartFill } from "react-icons/bs";
import {useLanguage} from "@/main/utilities/language";
export default function OdemeAdimlariWizard({adim}) {
    let messages = useLanguage();
    const steps = [
        { title: messages.cart, description: '', icon: <BsBasket3Fill/>},
        { title: messages.payment, description: '', icon: <BsCreditCard2BackFill/>},
        { title: messages.result, description: '', icon: <BsFillHeartFill/>},
    ]
    const { activeStep } = useSteps({
    index: 0,
    count: steps.length,
    })

  return (
    <Flex w={"100%"} mb={10} direction={"row"} justifyContent={"center"}>
    <Stepper className='OdemeWizard' w={{base:"100%",lg:"80%"}} p={[5,10]} px={{base:8,lg:50}}  size='lg' index={adim} style={{background:'white',borderRadius:50,borderWidth:1,borderColor:'#eee'}} bgColor='#C98624'>
        {steps.map((step, index) => (
            <Step key={index} >
            <Flex direction={"column"} alignItems={"center"}>
                <StepIndicator style={{width:45,height:45,fontSize:22}}>
                    <StepStatus
                    style={{}}
                    complete={step.icon}
                    incomplete={step.icon}
                    active={step.icon}
                    />
                </StepIndicator>

                <Box flexShrink='0' mt={2}>
                    <StepTitle fontSize={16} fontWeight={600} color={'#C98624'}>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                </Box>
            </Flex>
            <StepSeparator />
            </Step>
        ))}
    </Stepper>
    </Flex>
  )
}
