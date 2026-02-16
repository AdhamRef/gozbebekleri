import { Metadata } from "next";
import axios from "axios";
import MainPage from "../_components/MainPage";
import MainPageDummy from "../_components/MainPageDummy";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

interface Campaign {
  title: string;
  description: string;
  images: string[];
}

// Helper function to load messages
async function getMessages(locale: string) {
  try {
    const messages = await import(`../../../../i18n/messages/${locale}.json`);
    return messages.default;
  } catch {
    const messages = await import(`../../../../i18n/messages/ar.json`);
    return messages.default;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  
  // Fetch campaign data using axios
  const fetchCampaignData = async (): Promise<Campaign | null> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await axios.get(`${baseUrl}/api/campaigns/${id}?locale=${locale}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch campaign data:", error);
      return null;
    }
  };

  const campaign = await fetchCampaignData();
  const messages = await getMessages(locale);
  const campaignMsg = messages?.Campaign || {};

  // Provide fallback metadata if campaign data fails to load
  if (!campaign) {
    return {
      title: `${campaignMsg.notFound || 'Campaign Not Found'} - قرة العيون`,
      description: campaignMsg.errorOccurred || 'An error occurred',
    };
  }

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
      url: `https://gozbebekleri.vercel.app/${locale}/campaigns/${id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${campaign.title} - قرة العيون`,
      description: campaign.description,
      images: [campaign.images[0] || "/placeholder.jpg"],
    },
    alternates: {
      canonical: `https://gozbebekleri.vercel.app/${locale}/campaigns/${id}`,
    },
  };
}

export default async function CampaignPage({ params }: Props) {
  const { id, locale } = await params;
  return <MainPageDummy id={id} locale={locale} />;
}