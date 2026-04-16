"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MessageCircle,
  Edit2,
  Trash2,
  Send,
  Loader2,
  MoreHorizontal,
  Bell,
  Info,
  Book,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Trophy,
  Heart,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import Modal from "@/app/[locale]/components/Modal";
import { useCurrency } from "@/context/CurrencyContext";
import SignInDialog from "@/components/SignInDialog";
import DonationSidebar from "../_components/DonationSidebar";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import CategoryIcon from "@/components/CategoryIcon";

// Types
interface Category {
  id?: string;
  nameAr?: string;
  nameEn?: string;
  nameFr?: string;
  name?: string;
  icon?: string;
}

interface Campaign {
  id: string;
  titleAr?: string;
  titleEn?: string;
  titleFr?: string;
  title?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionFr?: string;
  description?: string;
  images: string[];
  videoUrl?: string | null;
  targetAmount: number;
  amountRaised?: number;
  currentAmount?: number;
  donationCount: number;
  progress: number;
  showProgress?: boolean;
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[] };
  category: Category;
  donationStats: {
    first: DonationStat | null;
    largest: DonationStat | null;
    last: DonationStat | null;
  };
  updates: Array<{
    id: string;
    titleAr?: string;
    titleEn?: string;
    titleFr?: string;
    title?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    descriptionFr?: string;
    description?: string;
    image: string | null;
    videoUrl?: string;
    createdAt: string;
  }>;
}

interface DonationStat {
  amount: number;
  donor: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    name: string;
    image: string;
    email?: string;
  };
}

const FALLBACK = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg";

/** Convert any video share URL into an embeddable iframe src */
function resolveEmbedUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // YouTube: youtube.com/watch?v=ID  or  youtu.be/ID  or  /shorts/ID
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      let vid = url.searchParams.get("v");
      if (!vid && url.hostname === "youtu.be") vid = url.pathname.slice(1).split("?")[0];
      if (!vid) { const m = url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/); if (m) vid = m[1]; }
      if (vid) return `https://www.youtube.com/embed/${vid}?rel=0`;
    }
    // Facebook: use plugin embed with the resolved (non-share) URL
    if (url.hostname.includes("facebook.com")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=720&allowfullscreen=true`;
    }
  } catch { /* fall through */ }
  return raw;
}

/** Returns true for Facebook short-share URLs that need server-side resolution */
function isFbShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.hostname.includes("facebook.com") && url.pathname.startsWith("/share/");
  } catch { return false; }
}

/** Renders a 16:9 video iframe, resolving Facebook share URLs server-side first */
function VideoEmbed({ rawUrl, title, className }: { rawUrl: string; title?: string; className?: string }) {
  const [src, setSrc] = React.useState<string>(() =>
    isFbShareUrl(rawUrl) ? "" : resolveEmbedUrl(rawUrl)
  );

  React.useEffect(() => {
    if (!isFbShareUrl(rawUrl)) { setSrc(resolveEmbedUrl(rawUrl)); return; }
    fetch(`/api/resolve-url?url=${encodeURIComponent(rawUrl)}`)
      .then(r => r.json())
      .then(({ resolved }: { resolved: string }) => setSrc(resolveEmbedUrl(resolved)))
      .catch(() => setSrc(resolveEmbedUrl(rawUrl)));
  }, [rawUrl]);

  if (!src) return null;

  return (
    <div className={className} style={{ position: "relative", paddingBottom: "56.25%" }}>
      <iframe
        src={src}
        title={title || "video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}


const IntegratedCampaignPage = ({ id, locale: propLocale }: { id: string; locale?: string }) => {
  const t = useTranslations("Campaign");
  const localeFromHook = useLocale() as "ar" | "en" | "fr";
  const locale = (propLocale as any) || localeFromHook;
  const { data: session } = useSession();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: "image" | "video"; src: string; alt?: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "updates" | "comments" | "info">("description");
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const getLocalizedProperty = (obj: any, key: string) => {
    if (!obj) return "";
    if (obj[key]) return obj[key];
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    if (obj[localeKey]) return obj[localeKey];
    return obj[`${key}Ar`] || "";
  };

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Campaign>(
          `/api/campaigns/${id}?locale=${encodeURIComponent(locale)}`,
          { headers: { "x-locale": locale } }
        );
        if (!response.data) throw new Error("Campaign not found");
        setCampaign(response.data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("fetchError");
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaignData();
  }, [id, locale]);


  useEffect(() => {
    if (!campaign) return;
    axios.get(`/api/campaigns/${id}/comments`)
      .then(r => setComments(r.data))
      .catch(() => toast.error(t("failedToLoadComments")));
  }, [id, campaign]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!session) { setIsSignInOpen(true); return; }
    setIsSubmitting(true);
    try {
      const r = await axios.post(`/api/campaigns/${id}/comments`, { text: newComment });
      setComments([r.data, ...comments]);
      setNewComment("");
      toast.success(t("commentAdded"));
    } catch { toast.error(t("failedToAddComment")); }
    finally { setIsSubmitting(false); }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    setIsSubmitting(true);
    try {
      const r = await axios.patch(`/api/campaigns/${id}/comments/${commentId}`, { text: editText });
      setComments(comments.map(c => c.id === commentId ? r.data : c));
      setEditingComment(null);
      toast.success(t("commentUpdated"));
    } catch { toast.error(t("failedToUpdateComment")); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t("confirmDeleteComment"))) return;
    try {
      await axios.delete(`/api/campaigns/${id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      toast.success(t("commentDeleted"));
    } catch { toast.error(t("failedToDeleteComment")); }
  };

  const tabs = [
    { id: "description", labelKey: "story" as const, icon: Book },
    { id: "updates", labelKey: "updates" as const, icon: Bell, badge: campaign?.updates?.length ?? 0 },
    { id: "comments", labelKey: "comments" as const, icon: MessageCircle, badge: comments.length },
    { id: "info", labelKey: "info" as const, icon: Info },
  ];

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

  if (loading) return <LoadingSkeleton />;

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("campaignNotFound")}</h2>
          <p className="text-gray-500 mb-6">{error || t("campaignNotFoundDescription")}</p>
          <Button onClick={() => window.history.back()} className="bg-[#025EB8] hover:bg-[#014fa0]">
            {t("goBack")}
          </Button>
        </div>
      </div>
    );
  }

  const currentImg = campaign.images[selectedImage] || FALLBACK;

  return (
    <>
      <main className="min-h-screen bg-gray-50/80 pb-24 sm:pb-8">
        <div className="max-w-7xl mx-auto sm:px-4 sm:py-8">
          <div className="grid lg:grid-cols-12 gap-0 lg:gap-8">

            {/* ── Left: media + tabs ── */}
            <div className="lg:col-span-8 flex flex-col gap-0 sm:gap-5">

              {/* ── Image block ── */}
              <div className="sm:rounded-2xl overflow-hidden sm:border-gray-100">
                {/* Main image — full-width, no letterbox */}
                <div className="relative w-full aspect-[16/9] sm:aspect-[16/8] overflow-hidden">
                  {/* Blurred background fill for portrait images */}
                  <Image
                    src={currentImg}
                    alt=""
                    aria-hidden
                    fill
                    sizes="100vw"
                    className="object-cover blur-2xl scale-110 opacity-40 pointer-events-none"
                  />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedImage}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={currentImg}
                        alt={getLocalizedProperty(campaign, "title")}
                        fill
                        priority={selectedImage === 0}
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        className="object-cover"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

                  {/* Category + title overlay */}
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 z-10">
                    <Link
                      href={`/category/${campaign.category.id}`}
                      className="inline-flex items-center gap-1.5 mb-2 bg-[#FA5D17] hover:bg-[#e04a08] text-white text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wide transition-colors"
                    >
                      <CategoryIcon name={campaign.category.icon} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {getLocalizedProperty(campaign.category, "name")}
                    </Link>
                    <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
                      {getLocalizedProperty(campaign, "title")}
                    </h1>
                  </div>

                  {/* RTL-aware nav arrows */}
                  {campaign.images.length > 1 && (() => {
                    const isRTL = locale === "ar";
                    const atStart = selectedImage === 0;
                    const atEnd = selectedImage === campaign.images.length - 1;
                    const leftDisabled  = isRTL ? atEnd   : atStart;
                    const rightDisabled = isRTL ? atStart : atEnd;
                    const onLeft  = () => setSelectedImage(i => isRTL ? Math.min(campaign.images.length - 1, i + 1) : Math.max(0, i - 1));
                    const onRight = () => setSelectedImage(i => isRTL ? Math.max(0, i - 1) : Math.min(campaign.images.length - 1, i + 1));
                    return (
                      <>
                        <button
                          onClick={onLeft}
                          disabled={leftDisabled}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/55 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={onRight}
                          disabled={rightDisabled}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/55 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* Thumbnail strip — below the image, glass style */}
                {campaign.images.length > 1 && (
                  <div className="flex gap-2.5 px-3 py-3 overflow-x-auto scrollbar-hide">
                    {campaign.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 ${
                          selectedImage === i
                            ? "ring-2 ring-[#FA5D17] scale-105 opacity-100 shadow-md shadow-black/40"
                            : "ring-1 ring-white/15 opacity-45 hover:opacity-75 hover:ring-white/35"
                        }`}
                      >
                        <Image
                          src={img}
                          alt=""
                          width={64}
                          height={56}
                          className="w-14 h-12 sm:w-16 sm:h-14 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>



              {/* ── Tabs card ── */}
              <div className="bg-white sm:rounded-2xl overflow-hidden">
                {/* Tab bar */}
                <div className="grid grid-cols-4 border-b border-gray-100">
                  {tabs.map(({ id: tabId, labelKey, icon: Icon, badge }) => {
                    const active = activeTab === tabId;
                    return (
                      <button
                        key={tabId}
                        onClick={() => setActiveTab(tabId as "description" | "updates" | "comments" | "info")}
                        className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-3.5 px-1 sm:px-3 text-[10px] sm:text-sm font-semibold transition-all ${
                          active
                            ? "text-[#025EB8] border-b-2 border-[#025EB8]"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/80"
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-[#025EB8]" : ""}`} />
                        <span className="truncate">{t(labelKey)}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className={`absolute top-1.5 right-1.5 sm:static sm:ms-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                            active ? "bg-[#025EB8]/10 text-[#025EB8]" : "bg-gray-100 text-gray-500"
                          }`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="p-4 sm:p-6">
                  <AnimatePresence mode="wait">

                    {/* Description */}
                    {activeTab === "description" && (
                      <motion.div key="desc" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <p className="text-gray-700 text-sm sm:text-base leading-relaxed sm:leading-loose whitespace-pre-line">
                          {getLocalizedProperty(campaign, "description")}
                        </p>
                      </motion.div>
                    )}

                    {/* Updates */}
                    {activeTab === "updates" && (
                      <motion.div key="updates" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
                        {campaign.updates?.length > 0 ? campaign.updates.map((update, i) => (
                          <motion.div key={update.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                            <div className="flex-shrink-0">
                              <div className="w-9 h-9 rounded-full bg-[#025EB8]/10 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-[#025EB8]" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-0.5">
                                {getLocalizedProperty(update, "title")}
                              </h3>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                                <Clock className="w-3 h-3" />
                                {fmtDate(update.createdAt)}
                              </p>
                              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-3">
                                {getLocalizedProperty(update, "description")}
                              </p>
                              {/* Inline video embed */}
                              {update.videoUrl && (
                                <VideoEmbed
                                  rawUrl={update.videoUrl}
                                  title={getLocalizedProperty(update, "title") || "video"}
                                  className="rounded-xl overflow-hidden bg-black mb-3"
                                />
                              )}
                              {/* Image thumbnail */}
                              {update.image && (
                                <button
                                  onClick={() => { setModalContent({ type: "image", src: update.image!, alt: getLocalizedProperty(update, "title") }); setIsModalOpen(true); }}
                                  className="group relative rounded-xl overflow-hidden ring-1 ring-gray-200 hover:ring-[#025EB8] transition-all"
                                >
                                  <Image src={update.image} alt="" width={96} height={96} className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )) : (
                          <div className="text-center py-12">
                            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">{t("noUpdates")}</p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Comments */}
                    {activeTab === "comments" && (
                      <motion.div key="comments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        {/* Add comment */}
                        <div className="mb-5">
                          {session ? (
                            <form onSubmit={handleAddComment} className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 focus-within:border-[#025EB8]/40 focus-within:ring-2 focus-within:ring-[#025EB8]/10 transition-all">
                              <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                                <AvatarImage src={session.user?.image || ""} />
                                <AvatarFallback className="bg-[#025EB8]/10 text-[#025EB8] text-xs font-bold">
                                  {session.user?.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <Textarea
                                  value={newComment}
                                  onChange={e => setNewComment(e.target.value)}
                                  placeholder={t("commentPlaceholder")}
                                  className="w-full resize-none border-none shadow-none focus-visible:ring-0 text-sm bg-transparent p-0 min-h-[40px]"
                                  rows={2}
                                />
                                <div className="flex justify-end mt-2">
                                  <Button type="submit" disabled={!newComment.trim() || isSubmitting} size="sm"
                                    className="bg-[#025EB8] hover:bg-[#014fa0] text-white h-8 gap-1.5 rounded-lg">
                                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    {t("send")}
                                  </Button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setIsSignInOpen(true)}
                              className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3.5 text-sm text-gray-500 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-gray-400" />
                              </div>
                              <span>{t("signInToComment")}</span>
                            </button>
                          )}
                        </div>

                        {/* Comments list */}
                        <div className="space-y-1">
                          {comments.length > 0 ? comments.map((comment, i) => (
                            <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                              className="flex gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={comment.user.image} />
                                <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">
                                  {comment.user.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900">{comment.user.name}</span>
                                    <span className="text-[11px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US")}</span>
                                  </div>
                                  {session?.user?.email === comment.user.email && (
                                    <div className="relative flex-shrink-0">
                                      <button onClick={() => setOpenDropdownId(openDropdownId === comment.id ? null : comment.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </button>
                                      {openDropdownId === comment.id && (
                                        <div className="absolute end-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                                          <button onClick={() => { setEditingComment(comment.id); setEditText(comment.text); setOpenDropdownId(null); }}
                                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />{t("edit")}
                                          </button>
                                          <button onClick={() => { handleDeleteComment(comment.id); setOpenDropdownId(null); }}
                                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />{t("delete")}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {editingComment === comment.id ? (
                                  <div>
                                    <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="mb-2 text-sm" rows={2} />
                                    <div className="flex gap-2">
                                      <Button onClick={() => handleEditComment(comment.id)} disabled={isSubmitting} size="sm" className="bg-[#025EB8] hover:bg-[#014fa0] text-white h-8">
                                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("save")}
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => setEditingComment(null)} className="h-8">{t("cancel")}</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                                )}
                              </div>
                            </motion.div>
                          )) : (
                            <div className="text-center py-12">
                              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                              <p className="text-gray-400 text-sm">{t("noComments")}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Info */}
                    {activeTab === "info" && (
                      <motion.div key="info" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#025EB8]/6 rounded-xl p-4 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[#025EB8] mb-1">
                              <Users className="w-4 h-4" />
                              <span className="text-xs font-semibold uppercase tracking-wide">{t("donor")}</span>
                            </div>
                            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">{campaign.donationCount.toLocaleString()}</span>
                          </div>
                          <div className="bg-[#FA5D17]/6 rounded-xl p-4 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-[#FA5D17] mb-1">
                              <TrendingUp className="w-4 h-4" />
                              <span className="text-xs font-semibold uppercase tracking-wide">{t("completed")}</span>
                            </div>
                            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">{campaign.progress.toFixed(0)}%</span>
                          </div>
                        </div>

                        {/* Top donors */}
                        {/* {campaign.donationStats && (campaign.donationStats.first || campaign.donationStats.largest || campaign.donationStats.last) && (
                          <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">{t("topDonors")}</h3>
                            <div className="space-y-2">
                              {[
                                { stat: campaign.donationStats.first, label: t("firstDonor"), icon: Star, color: "text-amber-500 bg-amber-50" },
                                { stat: campaign.donationStats.largest, label: t("largestDonor"), icon: Trophy, color: "text-[#025EB8] bg-[#025EB8]/8" },
                                { stat: campaign.donationStats.last, label: t("latestDonor"), icon: Heart, color: "text-rose-500 bg-rose-50" },
                              ].filter(d => d.stat).map(({ stat, label, icon: Icon, color }) => (
                                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-gray-400 font-medium">{label}</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{stat!.donor}</p>
                                  </div>
                                  <span className="text-sm font-bold text-[#025EB8] flex-shrink-0">{stat!.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )} */}
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>

                            {/* ── Campaign video ── */}
              {campaign.videoUrl && (
                <VideoEmbed
                  rawUrl={campaign.videoUrl}
                  title={String(campaign.title ?? "")}
                  className="sm:rounded-2xl overflow-hidden sm:shadow-sm sm:border sm:border-gray-100 bg-black"
                />
              )}
            </div>

            {/* ── Right sidebar ── */}
            <div className="lg:col-span-4 max-sm:hidden">
              <div className="sticky top-24">
                <DonationSidebar campaign={campaign} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky donate bar */}
        <div className="sm:hidden">
          <DonationSidebar campaign={campaign} isMobileSticky />
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={modalContent} />
      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
    </>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#f4f6fb] pb-28 sm:pb-10">
    <div className="w-full sm:px-4 sm:py-8">
      <div className="grid lg:grid-cols-12 gap-0 lg:gap-7">

        {/* Left column */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">

          {/* Hero image skeleton */}
          <div className="sm:rounded-3xl overflow-hidden bg-gray-100 animate-pulse aspect-[16/9] sm:aspect-[16/8] w-full" />

          {/* Tabs card skeleton */}
          <div className="bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">
            {/* Tab bar */}
            <div className="flex gap-1 p-2 sm:p-3 bg-gray-50/80 border-b border-gray-100">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-1 h-9 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
            {/* Content lines */}
            <div className="p-4 sm:p-6 lg:p-7 space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`h-3.5 bg-gray-100 rounded-full animate-pulse ${
                  i === 3 ? "w-4/5" : i === 5 ? "w-2/3" : i === 6 ? "w-3/4" : "w-full"
                }`} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="lg:col-span-4 hidden lg:block">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="h-6 bg-gray-100 rounded-full animate-pulse mx-5 mt-5 w-1/2" />
            <div className="p-5 space-y-3 mt-1">
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-full" />
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-5/6" />
              <div className="h-11 bg-gray-100 rounded-2xl animate-pulse mt-4" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
);

export default IntegratedCampaignPage;
