"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sepetAzalt, sepetTemizle } from "@/redux/slices/sepetSlice";
import { oturumGuncelle } from "@/redux/slices/oturumSlice";
import { useRouter } from "next/navigation";
import { useLanguageBelirtec } from "@/main/utilities/language";

export default function Page({ params, searchParams }) {
  let param_token = searchParams.token;
  const [token, setToken] = useState();
  const dispatch = useDispatch();
  const { name, email, mtoken, gsm, paymenttoken, membertoken, membertype } =
    useSelector((state) => state.oturum);
  const router = useRouter();

  let dil = useLanguageBelirtec();
  let dilfetch = dil.replace("/", "");
  if (dilfetch == "") {
    dilfetch = "tr";
  }

  useEffect(() => {
    const getFetch = async (token) => {
      const response = await fetch("/api/paymentcheck", {
        cache: "no-store",
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": dilfetch,
        },
        body: JSON.stringify({ checkouttoken: token }),
      });
      const data = await response.json();

      if (data.status == "success") {
        dispatch(oturumGuncelle({ paymenttoken: "" }));
        dispatch(sepetTemizle());
        localStorage.setItem("paymenttoken", "");
        router.push(dil + "/basarili?token=" + token);
      } else {
        router.push(dil + "/basarisiz?check=" + token);
      }
      return data;
    };

    let data = getFetch(param_token);
  }, []);

  return <div>Kontrol Ediliyor</div>;
}
