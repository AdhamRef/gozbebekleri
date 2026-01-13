"use client";
import React from 'react'
import {Breadcrumb,BreadcrumbItem,BreadcrumbLink} from '@chakra-ui/react';
import { FaArrowRightLong } from "react-icons/fa6";
import {useLanguage,useLanguageBelirtec} from "@/main/utilities/language";

export default function Breadcrumbs({line,color="#C98624"}) {
    let lang = useLanguage();
    let dil = useLanguageBelirtec();
    return (
    <Breadcrumb separator={<FaArrowRightLong className='arrowiconrtl' color={color} />} color={color} mt={4} fontSize={12} p={0} style={{padding:'0px !important',}} sx={{'ol':{padding:0}}}>
        <BreadcrumbItem>
            <BreadcrumbLink href={dil+'/'}>{lang.homepage}</BreadcrumbLink>
        </BreadcrumbItem>
        {line.anakategori && (
        <BreadcrumbItem>
            <BreadcrumbLink href='#'>{line.anakategori}</BreadcrumbLink>
        </BreadcrumbItem>
        )}
        
        {line.kategori && (
        <BreadcrumbItem>
            <BreadcrumbLink href='#' className="textCapitalize">{line.kategori}</BreadcrumbLink>
        </BreadcrumbItem>
        )}
        
        {line.sayfa && (
        <BreadcrumbItem>
            <BreadcrumbLink href='#'>{line.sayfa}</BreadcrumbLink>
        </BreadcrumbItem>
        )}
        
    </Breadcrumb>
    )
}
