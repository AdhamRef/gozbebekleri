"use client";
import { useState } from "react";
import Image from "next/image";
import {
  RenderImageContext,
  RenderImageProps,
  RowsPhotoAlbum,
} from "react-photo-album";
import "react-photo-album/rows.css";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

function renderNextImage({ alt = "", title, sizes }, { photo, width, height }) {
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <Image
        fill
        src={photo}
        alt={alt}
        title={title}
        sizes={sizes}
        placeholder={photo.blurDataURL ? "blur" : undefined}
      />
    </div>
  );
}

export default function FotoGaleriListe({ photodata }) {
  const [index, setIndex] = useState(-1);

  const photosd = photodata.map((picture) => ({
    src: "https://minberiaksa.org/uploads/" + picture, // Dinamik URL oluşturma
    width: 800, // Orijinal genişlik
    height: 600, // Orijinal yükseklik
  }));


  return (
    <>
      <RowsPhotoAlbum
        photos={photosd}
        render={{ image: renderNextImage }}
        defaultContainerWidth={1200}
        onClick={({ index }) => setIndex(index)}
        sizes={{
          size: "1168px",
          sizes: [
            { viewport: "(max-width: 1200px)", size: "calc(100vw - 32px)" },
          ],
        }}
      />
      <Lightbox
        slides={photosd}
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
      />
    </>
  );
}
