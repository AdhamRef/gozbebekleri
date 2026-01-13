import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Cairo } from "next/font/google";
import "./styles/globals.css";
import "./styles/styles.css";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import Head from "next/head";
import { RtlProvider } from "./rtl-provider";
import { ReduxProvider } from "../../redux/provider";
import { LayoutProvider } from "../../components/LayoutProvider";
import { ModalProvider } from "./ModalContext";
import { CustomChakraProvider } from "./CustomChakraProvider";
import { headers } from "next/headers";
import Script from "next/script";
import Modalim from "./ModalimComponent";
import { cache } from "react";
import { customFetch } from "@/main/utilities/customFetch";
import { GoogleAnalytics } from "@next/third-parties/google";

const getPost = cache(async () => {
  return await customFetch({ type: "mainsettings" });
});

export async function generateMetadata() {
  const posts = await getPost(); // Veriyi al
  let poststatus = posts.status;
  let postdata = posts.data[0];

  return {
    title: poststatus ? postdata.title : "Varsayılan Başlık",
    description: poststatus ? postdata.title : "Varsayılan Açıklama",
    icons: {
      icon: "/favicon.png",
    },
  };
}

const inter = Inter({ subsets: ["latin"] });
const cairo = Cairo({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const posts = await getPost();
  let postdata = posts.data[0];

  const heads = headers();
  let dil;
  const pathname = heads.get("x-pathname");
  const ipaddress = heads.get("x-forwarded-for");
  if (pathname != "ar" && pathname != "en") {
    dil = "tr";
  } else {
    dil = pathname;
  }
  const dir = dil === "ar" ? "rtl" : "ltr";
  let clasn = "lang_" + dil;
  let selectedfont;
  if (dil == "ar") {
    selectedfont = cairo;
  } else {
    selectedfont = inter;
  }
  const settingobj = {
    title: postdata.title,
    logo: postdata.logo,
    favicon: postdata.favicon,
    slogan: postdata.slogan,
    parabirimi: postdata.parabirimi,
    adres: postdata.adres,
    email: postdata.email,
    telefon: postdata.telefon,
    faks: postdata.faks,
    gsm: postdata.gsm,
    bakimmod: postdata.bakimmod,
    facelink: postdata.facelink,
    twitterlink: postdata.twitterlink,
    instagramlink: postdata.instagramlink,
    youtubelink: postdata.youtubelink,
    linkedinlink: postdata.linkedinlink,
    seobaslik: postdata.seobaslik,
    seodesc: postdata.seodesc,
    map: postdata.map,
    sitekeywords: postdata.sitekeywords,
    whatsappfixno: postdata.whatsappfixno,
    yoltarifi: postdata.yoltarifi,
    banstatus: posts.banstatus,
    ipaddress: ipaddress,
  };

  return (
    <html dir={dir} lang={dil}>
      <head>
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-TSGD8D2S');
            `,
          }}
        />

        <GoogleAnalytics gaId="G-X5Q34MHK5F" />
      </head>

      <body className={`${clasn} ${selectedfont.className}`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TSGD8D2S"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>

        <CustomChakraProvider>
          <ReduxProvider>
            <ModalProvider>
              <LayoutProvider langdata={""} settings={settingobj}>
                <Modalim sb={0} sbf={1} />
                <RtlProvider>{children}</RtlProvider>
              </LayoutProvider>
            </ModalProvider>
          </ReduxProvider>
        </CustomChakraProvider>
      </body>
    </html>
  );
}
