import { Metadata } from "next";
import axios from "axios";
import MainPage from "../_components/MainPage";

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
  const fetchCampaignData = async (): Promise<Campaign> => {
    try {
      // Use an absolute URL for server-side fetching
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://alafiya.org";
      const response = await axios.get(`${baseUrl}/api/campaigns/${params.id}`);
      console.log("GOTTEN");
      return response.data;
    } catch (error) {
      console.log("NOT GOTTEN");
      console.error("Failed to fetch campaign data:", error);
      throw new Error("Failed to fetch campaign data");
    }
  };

  // Fetch the campaign data
  const campaign = await fetchCampaignData();

  // Return metadata
  return {
    title: `${campaign.title} - قرة العيون`,
    description: campaign.description,
    openGraph: {
      title: `${campaign.title} - قرة العيون`,
      description: campaign.description,
      images: [
        {
          url: campaign.images[0] || "/placeholder.jpg",
          width: 1200,
          height: 630,
          alt: campaign.title,
        },
      ],
      url: `https://alafiya.org/ar/campaigns/${params.id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${campaign.title} - قرة العيون`,
      description: campaign.description,
      images: [campaign.images[0] || "/placeholder.jpg"],
    },
    alternates: {
      canonical: `https://alafiya.org/ar/campaigns/${params.id}`,
    },
  };
}

const CampaignPage = ({ params }: Props) => {
  return <MainPage id={params.id} />;
};

export default CampaignPage;