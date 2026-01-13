import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

export async function customFetch(param) {
  const API_URL = "http://localhost:3000/";
  //const API_URL = "https://minberiaksa.org/";
  let url, urlbody;

  const heads = headers();
  const pathname = heads.get("x-pathname");
  const ipaddress = heads.get("x-forwarded-for");
  const userAgent = heads.get("user-agent");
  const referer = heads["referer"];

  let dil;
  if (pathname != "ar" && pathname != "en") {
    dil = "tr";
  } else {
    dil = pathname;
  }

  let cachesett;
  cachesett = "no-store";
  if (param.type == "detail") {
    url = API_URL + "/api/icerikDetay";
    urlbody = JSON.stringify({ type: "contents", id: param.id });
  } else if (param.type == "list") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ id: param.id });
  } else if (param.type == "subcatlist") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "contentsCat", id: param.id });
  } else if (param.type == "listallcats") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "contentsCat" });
  } else if (param.type == "sliderlist") {
    url = API_URL + "/api/sliderList";
    urlbody = JSON.stringify({ id: "0" });
  } else if (param.type == "donatecat") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "donatecat" });
  } else if (param.type == "donates") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "donates" });
  } else if (param.type == "mainsettings") {
    url = API_URL + "/api/settings";
    urlbody = JSON.stringify({ type: "settings" });
    cachesett = "force-cache";
  } else if (param.type == "statics") {
    url = API_URL + "/api/statics";
    urlbody = JSON.stringify({
      type: "statics",
      key: param.key,
      url: param.url,
      staticstype: param.staticstype,
      modulkey: param.modulkey,
      name: param.name,
    });
    cachesett = "force-cache";
  } else if (param.type == "search") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "search", text: param.text });
  } else if (param.type == "donateswcatid") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "donates", id: param.id });
  } else if (param.type == "slug") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "slug", text: param.text });
  } else if (param.type == "donatedetail") {
    cachesett = "force-cache";
    url = API_URL + "/api/icerikDetay";
    urlbody = JSON.stringify({ type: "donates", id: param.id });
  } else if (param.type == "customerdetail") {
    url = API_URL + "/api/checklogin";
    urlbody = JSON.stringify({ type: "customerdetail", token: "1" });
  } else if (param.type == "forms") {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ type: "forms" });
  } else {
    url = API_URL + "/api/kategoriListe";
    urlbody = JSON.stringify({ id: param.id });
  }

  let tags;
  if (param.type == "mainsettings") {
    tags = ["settings"];
  } else {
    tags = ["b"];
  }

  let response = await fetch(url, {
    // URL'yi tam formatta kullanın
    cache: "no-store",
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": dil,
      ipaddress: ipaddress,
      userAgent: userAgent,
      referer: referer,
    },
    body: urlbody,
    next: { tags: tags },
  });
  // Veriyi JSON formatına dönüştür
  let posts = await response.json();
  return posts; // veya `posts` tamamını döndürmek istiyorsanız `return posts;` kullanın
}
