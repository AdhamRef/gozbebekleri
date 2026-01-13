import { Metadata } from "next";
import axios from "axios";
import MainPageDummy from "./_components/MainPageDummy";

interface Props {
  params: {
    id: string;
  };
}

interface Campaign {
  title: string;
  description: string;
  images: string[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch campaign data using axios

  // Return metadata
  return {
    title: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
    description: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
    openGraph: {
      title: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
      description: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
      images: [
        {
          url: "/placeholder.jpg",
          width: 1200,
          height: 630,
          alt: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
        },
      ],
      url: `https://alafiya.org/ar/campaigns/${params.id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `مساعدة عائلة أبو أحمد لبناء منزل جديد`,
      description: `امساعدة عائلة أبو أحمد لبناء منزل جديد`,
      images: ["/placeholder.jpg"],
    },
    alternates: {
      canonical: `https://alafiya.org/ar/campaigns/${params.id}`,
    },
  };
}

const CampaignPage = ({ params }: Props) => {
  return <MainPageDummy id={params.id} />;
};

export default CampaignPage;