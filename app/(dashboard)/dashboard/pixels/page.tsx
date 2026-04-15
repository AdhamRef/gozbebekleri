"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function GoogleAnalyticsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface TrackingSettings {
  id?: string;
  facebookPixelId: string | null;
  facebookAccessToken: string | null;
  gaMeasurementId: string | null;
  tiktokPixelId: string | null;
  tiktokAccessToken: string | null;
  googleAdsConversionId: string | null;
  googleAdsConversionLabel: string | null;
  xPixelId: string | null;
}

const defaultSettings: TrackingSettings = {
  facebookPixelId: null,
  facebookAccessToken: null,
  gaMeasurementId: null,
  tiktokPixelId: null,
  tiktokAccessToken: null,
  googleAdsConversionId: null,
  googleAdsConversionLabel: null,
  xPixelId: null,
};

export default function PixelsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TrackingSettings>(defaultSettings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/admin/tracking");
      setSettings({
        id: res.data.id,
        facebookPixelId:          res.data.facebookPixelId          ?? "",
        facebookAccessToken:      res.data.facebookAccessToken      ?? "",
        gaMeasurementId:          res.data.gaMeasurementId          ?? "",
        tiktokPixelId:            res.data.tiktokPixelId            ?? "",
        tiktokAccessToken:        res.data.tiktokAccessToken        ?? "",
        googleAdsConversionId:    res.data.googleAdsConversionId    ?? "",
        googleAdsConversionLabel: res.data.googleAdsConversionLabel ?? "",
        xPixelId:                 res.data.xPixelId                 ?? "",
      });
    } catch {
      toast.error("فشل تحميل إعدادات التتبع");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put("/api/admin/tracking", {
        facebookPixelId:          settings.facebookPixelId          || null,
        facebookAccessToken:      settings.facebookAccessToken      || null,
        gaMeasurementId:          settings.gaMeasurementId          || null,
        tiktokPixelId:            settings.tiktokPixelId            || null,
        tiktokAccessToken:        settings.tiktokAccessToken        || null,
        googleAdsConversionId:    settings.googleAdsConversionId    || null,
        googleAdsConversionLabel: settings.googleAdsConversionLabel || null,
        xPixelId:                 settings.xPixelId                 || null,
      });
      toast.success("تم حفظ إعدادات البكسل بنجاح");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إعدادات البكسلات والتتبع</h1>
        <p className="text-muted-foreground mt-1">
          إدارة معرّفات البكسل ورمز وصول فيسبوك (Conversion API). التغييرات تُطبّق فوراً على الموقع.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FacebookIcon className="w-5 h-5 text-[#1877F2]" />
            فيسبوك (Meta)
          </CardTitle>
          <CardDescription>
            معرّف البكسل يظهر في الموقع. رمز الوصول يُستخدم فقط من الخادم (Conversion API) ولا يُرسل للمتصفح.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-pixel">معرّف بكسل فيسبوك (Pixel ID)</Label>
            <Input
              id="fb-pixel"
              type="text"
              placeholder="1234567890123456"
              value={settings.facebookPixelId ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, facebookPixelId: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-token">رمز الوصول (Access Token) — Conversion API</Label>
            <Input
              id="fb-token"
              type="password"
              placeholder="إخفاء عند عدم التغيير"
              value={settings.facebookAccessToken ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, facebookAccessToken: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GoogleAnalyticsIcon className="w-5 h-5" />
            Google Analytics 4
          </CardTitle>
          <CardDescription>
            معرّف القياس (G-XXXXXXXXXX) من إعدادات تدفق GA4.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ga-id">معرّف القياس (Measurement ID)</Label>
            <Input
              id="ga-id"
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={settings.gaMeasurementId ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, gaMeasurementId: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TikTokIcon className="w-5 h-5 text-foreground" />
            TikTok Pixel + Events API
          </CardTitle>
          <CardDescription>
            معرّف البكسل يظهر في الموقع. رمز الوصول يُستخدم فقط من الخادم (Events API) لتحسين المطابقة وإزالة التكرار.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tiktok-pixel">معرّف بكسل TikTok (Pixel Code)</Label>
            <Input
              id="tiktok-pixel"
              type="text"
              placeholder="XXXXXXXXXXXX"
              value={settings.tiktokPixelId ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, tiktokPixelId: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok-token">رمز الوصول (Access Token) — Events API</Label>
            <Input
              id="tiktok-token"
              type="password"
              placeholder="إخفاء عند عدم التغيير"
              value={settings.tiktokAccessToken ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, tiktokAccessToken: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GoogleAnalyticsIcon className="w-5 h-5" />
            Google Ads — Enhanced Conversions
          </CardTitle>
          <CardDescription>
            معرّف التحويل والتسمية من إعدادات Google Ads. يُستخدم مع Enhanced Conversions لرفع دقة القياس والمزايدة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gads-id">معرّف التحويل (AW-XXXXXXXXX)</Label>
            <Input
              id="gads-id"
              type="text"
              placeholder="AW-1234567890"
              value={settings.googleAdsConversionId ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, googleAdsConversionId: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gads-label">تسمية التحويل (Conversion Label)</Label>
            <Input
              id="gads-label"
              type="text"
              placeholder="AbCdEfGh1234"
              value={settings.googleAdsConversionLabel ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, googleAdsConversionLabel: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XTwitterIcon className="w-5 h-5 text-foreground" />
            X (تويتر) Pixel
          </CardTitle>
          <CardDescription>
            معرّف بكسل X (Twitter) من إعدادات أحداث X.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="x-pixel">معرّف بكسل X</Label>
            <Input
              id="x-pixel"
              type="text"
              placeholder="xxxxxxxx"
              value={settings.xPixelId ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, xPixelId: e.target.value || null }))
              }
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
