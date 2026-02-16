"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Edit2,
  Trash2,
  Send,
  Loader2,
  MoreHorizontal,
  Play,
  Bell,
  Info,
  Book,
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

// Types
interface Category {
  nameAr?: string;
  nameEn?: string;
  nameFr?: string;
  name?: string;
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
  targetAmount: number;
  amountRaised?: number;
  currentAmount?: number;
  donationCount: number;
  progress: number;
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

// Main Component
const IntegratedCampaignPage = ({ id, locale: propLocale }: { id: string; locale?: string }) => {
  const t = useTranslations("Campaign");
  const localeFromHook = useLocale() as "ar" | "en" | "fr";
  const locale = (propLocale as any) || localeFromHook;
  const { data: session } = useSession();

  // State management
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
  const [modalContent, setModalContent] = useState<{
    type: "image" | "video";
    src: string;
    alt?: string;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "description" | "updates" | "comments" | "info"
  >("description");
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    if (!obj) return "";
    
    // First try to get the main property (already localized from API)
    if (obj[key]) return obj[key];
    
    // Fallback to locale-specific property
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    if (obj[localeKey]) return obj[localeKey];
    
    // Final fallback to Arabic
    const arKey = `${key}Ar`;
    return obj[arKey] || "";
  };

  // Fetch campaign data
  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Campaign>(`/api/campaigns/${id}`, {
          headers: {
            "x-locale": locale, // Pass locale in header
          },
        });
        if (!response.data) {
          throw new Error("Campaign not found");
        }
        console.log("Fetched campaign:", response.data);
        setCampaign(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
        toast.error(
          err instanceof Error ? err.message : "Failed to load campaign"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [id, locale]); // Add locale to dependencies

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(`/api/campaigns/${id}/comments`);
        setComments(response.data);
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast.error("Failed to load comments");
      }
    };

    if (campaign) {
      fetchComments();
    }
  }, [id, campaign]);

  // Add a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!session) {
      setIsSignInOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`/api/campaigns/${id}/comments`, {
        text: newComment,
      });
      setComments([response.data, ...comments]);
      setNewComment("");
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit a comment
  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await axios.patch(
        `/api/campaigns/${id}/comments/${commentId}`,
        {
          text: editText,
        }
      );
      setComments(
        comments.map((comment) =>
          comment.id === commentId ? response.data : comment
        )
      );
      setEditingComment(null);
      toast.success("Comment updated successfully");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      await axios.delete(`/api/campaigns/${id}/comments/${commentId}`);
      setComments(comments.filter((comment) => comment.id !== commentId));
      toast.success("Comment deleted successfully");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Tab configuration
  const tabs = [
    { id: "description", labelAr: "القصة", labelEn: "Story", labelFr: "Histoire", icon: Book },
    {
      id: "updates",
      labelAr: "التحديثات",
      labelEn: "Updates",
      labelFr: "Mises à jour",
      icon: Bell,
      badge: campaign?.updates?.length || 0,
    },
    {
      id: "comments",
      labelAr: "التعليقات",
      labelEn: "Comments",
      labelFr: "Commentaires",
      icon: MessageCircle,
      badge: comments.length,
    },
    { id: "info", labelAr: "معلومات", labelEn: "Info", labelFr: "Informations", icon: Info },
  ];

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {t("campaignNotFound") || "Campaign Not Found"}
          </h2>
          <p className="text-gray-600 mb-8">
            {error || "The campaign you're looking for doesn't exist."}
          </p>
          <Button
            onClick={() => window.history.back()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {t("goBack") || "Go Back"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 pb-6 max-lg:pt-4">
        <div className="max-w-7xl mx-auto sm:px-4 py-6 sm:py-8">
          {/* Hero Section */}
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 mb-8">
            {/* Left Side - Images and Content */}
            <div className="lg:col-span-8 sm:bg-white sm:border sm:rounded-lg overflow-hidden">
              {/* Mobile Hero Image */}
              <div className="relative -mx-3 sm:mx-0 sm:hidden">
                <div className="relative h-[65vh] w-full overflow-hidden">
                  <img
                    src={campaign.images[selectedImage] || "/placeholder.jpg"}
                    alt={getLocalizedProperty(campaign, "title")}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Black Fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

                  {/* Text Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <span className="inline-block mb-2 bg-white/20 backdrop-blur text-xs font-bold px-3 py-1 rounded-full">
                      {getLocalizedProperty(campaign.category, "name")}
                    </span>

                    <h1 className="text-2xl font-extrabold leading-snug">
                      {getLocalizedProperty(campaign, "title")}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Desktop Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="relative rounded-lg overflow-hidden shadow-lg mb-4 group hidden sm:block"
              >
                <img
                  src={campaign.images[selectedImage] || "/placeholder.jpg"}
                  alt={getLocalizedProperty(campaign, "title")}
                  className="w-full h-[360px] lg:h-[420px] object-cover"
                />

                {/* Soft gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                {/* Desktop overlay content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <span className="inline-block mb-2 bg-white/20 backdrop-blur text-xs font-bold px-3 py-1 rounded-full">
                    {getLocalizedProperty(campaign.category, "name")}
                  </span>

                  <h1 className="text-2xl lg:text-3xl font-extrabold leading-tight max-w-[90%]">
                    {getLocalizedProperty(campaign, "title")}
                  </h1>
                </div>
              </motion.div>

              {/* Image Thumbnails */}
              <div className="mt-4 sm:mx-4">
                {campaign.images.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-visible pb-2">
                    {campaign.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                          selectedImage === index
                            ? "ring-2 ring-blue-500"
                            : "ring-2 ring-gray-200 hover:ring-blue-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${t("image")} ${index + 1}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="bg-white max-sm:border sm:border-y max-sm:rounded-lg shadow-md mb-6 -mt-8 relative top-8 z-30">
                <div className="grid grid-cols-4 border-b border-gray-200">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                          flex flex-col sm:flex-row
                          items-center justify-center
                          gap-1 sm:gap-1.5
                          px-1 sm:px-3
                          py-3
                          min-w-0
                          text-[10.5px] sm:text-sm
                          font-semibold
                          leading-tight
                          transition-all
                          relative
                          rounded-t-2xl
                          ${
                            isActive
                              ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />

                        <span className="truncate max-w-full text-center">
                          {getLocalizedProperty(tab, "label")}
                        </span>

                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span
                            className="
                              absolute top-1 right-1
                              sm:static sm:ml-1
                              bg-blue-100 text-blue-700
                              text-[9px] sm:text-xs
                              font-bold
                              px-1 py-0.5
                              rounded-full
                              leading-none
                            "
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-5">
                  <AnimatePresence mode="wait">
                    {activeTab === "description" && (
                      <motion.div
                        key="description"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                          {getLocalizedProperty(campaign, "description")}
                        </p>
                      </motion.div>
                    )}

                    {activeTab === "updates" && (
                      <motion.div
                        key="updates"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {campaign.updates && campaign.updates.length > 0 ? (
                          campaign.updates.map((update, index) => (
                            <motion.div
                              key={update.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="border-b border-gray-200 pb-4 last:border-0"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Bell className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                                    {getLocalizedProperty(update, "title")}
                                  </h3>
                                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(update.createdAt).toLocaleDateString(
                                      locale === "ar"
                                        ? "ar-SA"
                                        : locale === "fr"
                                        ? "fr-FR"
                                        : "en-US",
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      }
                                    )}
                                  </p>
                                  <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-line">
                                    {getLocalizedProperty(update, "description")}
                                  </p>
                                  <div className="flex gap-4 mt-4">
                                    {update.image && (
                                      <button
                                        onClick={() => {
                                          setModalContent({
                                            type: "image",
                                            src: update.image!,
                                            alt: getLocalizedProperty(update, "title"),
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        className="relative group"
                                      >
                                        <img
                                          src={update.image}
                                          alt={getLocalizedProperty(update, "title")}
                                          className="rounded-xl shadow-md w-28 h-28 object-cover group-hover:opacity-90 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-xl" />
                                      </button>
                                    )}
                                    {update.videoUrl && (
                                      <button
                                        onClick={() => {
                                          setModalContent({
                                            type: "video",
                                            src: `${update.videoUrl}?autoplay=1`,
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        className="relative group"
                                      >
                                        <img
                                          src={`https://img.youtube.com/vi/${
                                            new URL(update.videoUrl).pathname.split("/")[2]
                                          }/hqdefault.jpg`}
                                          alt="Video thumbnail"
                                          className="rounded-xl shadow-md w-28 h-28 object-cover group-hover:opacity-90 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-xl opacity-90 group-hover:opacity-100 transition-opacity">
                                          <Play className="w-8 h-8 text-white" />
                                        </div>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-8">
                            {t("noUpdates") || "No updates yet"}
                          </p>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "comments" && (
                      <motion.div
                        key="comments"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Add Comment Form */}
                        <div className="mb-5">
                          {session ? (
                            <form
                              onSubmit={handleAddComment}
                              className="flex gap-2.5 bg-gray-50 rounded-lg p-3 border border-gray-200 focus-within:border-blue-500 transition-all"
                            >
                              <Avatar className="w-9 h-9">
                                <AvatarImage src={session.user?.image || ""} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                                  {session.user?.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <Textarea
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder={t("commentPlaceholder") || "Write a comment..."}
                                  className="w-full resize-none border-none focus:ring-0 text-sm bg-transparent"
                                  rows={2}
                                />
                                <div className="flex justify-end mt-1.5">
                                  <Button
                                    type="submit"
                                    disabled={!newComment.trim() || isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-sm h-8 text-white"
                                  >
                                    {isSubmitting ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {t("send") || "Send"}
                                  </Button>
                                </div>
                              </div>
                            </form>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg text-center mb-5">
                              <p className="text-gray-600 mb-2">
                                {t("signInToComment") || "Sign in to add a comment"}
                              </p>
                              <Button
                                onClick={() => setIsSignInOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {t("signIn") || "Sign In"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4">
                          {comments.length > 0 ? (
                            comments.map((comment, index) => (
                              <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Avatar className="w-9 h-9 flex-shrink-0">
                                  <AvatarImage src={comment.user.image} />
                                  <AvatarFallback className="text-sm">
                                    {comment.user.name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900 text-sm">
                                        {comment.user.name}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.createdAt).toLocaleDateString(
                                          locale === "ar"
                                            ? "ar-SA"
                                            : locale === "fr"
                                            ? "fr-FR"
                                            : "en-US"
                                        )}
                                      </span>
                                    </div>
                                    {session?.user?.email === comment.user.email && (
                                      <div className="relative">
                                        <button
                                          className="p-2 text-gray-600 hover:text-gray-800"
                                          onClick={() =>
                                            setOpenDropdownId(
                                              openDropdownId === comment.id
                                                ? null
                                                : comment.id
                                            )
                                          }
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        {openDropdownId === comment.id && (
                                          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                            <button
                                              className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                              onClick={() => {
                                                setEditingComment(comment.id);
                                                setEditText(comment.text);
                                                setOpenDropdownId(null);
                                              }}
                                            >
                                              <Edit2 className="w-4 h-4" />
                                              {t("edit") || "Edit"}
                                            </button>
                                            <button
                                              className="flex gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100"
                                              onClick={() => {
                                                handleDeleteComment(comment.id);
                                                setOpenDropdownId(null);
                                              }}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              {t("delete") || "Delete"}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {editingComment === comment.id ? (
                                    <div className="mt-2">
                                      <Textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="mb-2"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => handleEditComment(comment.id)}
                                          disabled={isSubmitting}
                                          size="sm"
                                        >
                                          {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            t("save") || "Save"
                                          )}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setEditingComment(null)}
                                        >
                                          {t("cancel") || "Cancel"}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                      {comment.text}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">
                              {t("noComments") || "No comments yet. Be the first to comment!"}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "info" && (
                      <motion.div
                        key="info"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5"
                      >
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-3">
                            {t("campaignStats") || "Campaign Statistics"}
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-blue-600 mb-0.5">
                                {campaign.donationCount}
                              </div>
                              <div className="text-xs text-gray-600">
                                {t("donor") || "Donors"}
                              </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-2xl font-bold text-blue-600 mb-0.5">
                                {campaign.progress.toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {t("completed") || "Completed"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Donation Stats */}
                        {campaign.donationStats && (
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">
                              {t("topDonors") || "Notable Donations"}
                            </h3>
                            <div className="space-y-2">
                              {campaign.donationStats.first && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {t("firstDonor") || "First Donor"}
                                  </div>
                                  <div className="font-semibold">
                                    {campaign.donationStats.first.donor}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {campaign.donationStats.first.amount.toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {campaign.donationStats.largest && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {t("largestDonor") || "Largest Donor"}
                                  </div>
                                  <div className="font-semibold">
                                    {campaign.donationStats.largest.donor}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {campaign.donationStats.largest.amount.toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {campaign.donationStats.last && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {t("latestDonor") || "Latest Donor"}
                                  </div>
                                  <div className="font-semibold">
                                    {campaign.donationStats.last.donor}
                                  </div>
                                  <div className="text-sm text-gray-700">
                                    {campaign.donationStats.last.amount.toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Desktop */}
            <div className="lg:col-span-4 max-sm:hidden">
              <div className="sticky top-24">
                <DonationSidebar campaign={campaign} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="sm:hidden">
          <DonationSidebar campaign={campaign} isMobileSticky />
        </div>
      </main>

      {/* Modal for image/video preview */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        content={modalContent}
      />

      {/* Sign In Dialog */}
      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
    </>
  );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-100 pb-6">
    <div className="max-w-7xl mx-auto sm:px-4 py-6 sm:py-8">
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg overflow-hidden">
            {/* Image skeleton */}
            <div className="w-full h-[360px] lg:h-[420px] bg-gray-200 animate-pulse" />

            {/* Thumbnails skeleton */}
            <div className="flex gap-2 p-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"
                />
              ))}
            </div>

            {/* Tabs skeleton */}
            <div className="border-t border-gray-200">
              <div className="grid grid-cols-4 gap-4 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>

            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 max-sm:hidden">
          <div className="bg-white rounded-lg p-6">
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default IntegratedCampaignPage;