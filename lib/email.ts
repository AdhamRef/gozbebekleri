import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

type Texts = {
  subject: string;
  preheader: string;
  title: string;
  greeting: string;
  body: string;
  btnLabel: string;
  orCopy: string;
  note: string;
  expires: string;
  ignore: string;
  footer: string;
};

const copy: Record<string, Texts> = {
  ar: {
    subject: "أكّد بريدك الإلكتروني وابدأ العطاء عبر منبر الأقصى",
    preheader: "خطوة واحدة فقط لتفعيل حسابك",
    title: "تأكيد بريدك الإلكتروني",
    greeting: "مرحباً،",
    body: "شكراً لتسجيلك في منبر الأقصى. انقر الزر أدناه لتأكيد بريدك الإلكتروني وسيتم تسجيل دخولك تلقائياً.",
    btnLabel: "تأكيد الحساب وتسجيل الدخول",
    orCopy: "أو انسخ هذا الرابط في متصفحك",
    note: "الرابط صالح لمرة واحدة فقط.",
    expires: "ينتهي هذا الرابط خلال 24 ساعة",
    ignore: "إذا لم تنشئ حساباً، يمكنك تجاهل هذا البريد بأمان.",
    footer: "© 2026 منبر الأقصى · جميع الحقوق محفوظة",
  },
  tr: {
    subject: "E-postanı Onayla ve Minber-i Aksa'da Bağışa Başla",
    preheader: "Hesabını etkinleştirmek için tek bir adım kaldı",
    title: "E-posta Adresinizi Onaylayın",
    greeting: "Merhaba,",
    body: "Minber-i Aksa'ya kaydolduğunuz için teşekkürler. Aşağıdaki butona tıklayarak e-posta adresinizi onaylayın; ardından otomatik olarak giriş yapacaksınız.",
    btnLabel: "Hesabı Onayla ve Giriş Yap",
    orCopy: "Ya da bu bağlantıyı tarayıcınıza kopyalayın",
    note: "Bu bağlantı yalnızca bir kez kullanılabilir.",
    expires: "Bağlantı 24 saat içinde geçerliliğini yitirir",
    ignore: "Bir hesap oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.",
    footer: "© 2026 Minber-i Aksa · Tüm hakları saklıdır",
  },
  fr: {
    subject: "Confirmez votre e-mail et commencez à donner avec Minber-i Aksa",
    preheader: "Plus qu'une étape pour activer votre compte",
    title: "Confirmez votre adresse e-mail",
    greeting: "Bonjour,",
    body: "Merci de vous être inscrit à Minber-i Aksa. Cliquez sur le bouton ci-dessous pour confirmer votre adresse — vous serez connecté automatiquement.",
    btnLabel: "Confirmer et se connecter",
    orCopy: "Ou copiez ce lien dans votre navigateur",
    note: "Ce lien n'est utilisable qu'une seule fois.",
    expires: "Ce lien expire dans 24 heures",
    ignore: "Si vous n'avez pas créé de compte, ignorez cet e-mail.",
    footer: "© 2026 Minber-i Aksa · Tous droits réservés",
  },
  es: {
    subject: "Confirma tu correo y empieza a donar con Minber-i Aksa",
    preheader: "Solo un paso más para activar tu cuenta",
    title: "Confirma tu dirección de correo",
    greeting: "Hola,",
    body: "Gracias por registrarte en Minber-i Aksa. Haz clic en el botón de abajo para confirmar tu correo; iniciarás sesión automáticamente.",
    btnLabel: "Confirmar cuenta e iniciar sesión",
    orCopy: "O copia este enlace en tu navegador",
    note: "Este enlace solo puede usarse una vez.",
    expires: "Este enlace caduca en 24 horas",
    ignore: "Si no creaste una cuenta, ignora este correo.",
    footer: "© 2026 Minber-i Aksa · Todos los derechos reservados",
  },
  pt: {
    subject: "Confirme o seu e-mail e comece a doar com Minber-i Aksa",
    preheader: "Só mais um passo para ativar a sua conta",
    title: "Confirme o seu endereço de e-mail",
    greeting: "Olá,",
    body: "Obrigado por se registar na Minber-i Aksa. Clique no botão abaixo para confirmar o seu endereço — ficará automaticamente com sessão iniciada.",
    btnLabel: "Confirmar conta e entrar",
    orCopy: "Ou copie este link para o seu navegador",
    note: "Este link só pode ser usado uma vez.",
    expires: "Este link expira em 24 horas",
    ignore: "Se não criou uma conta, ignore este e-mail.",
    footer: "© 2026 Minber-i Aksa · Todos os direitos reservados",
  },
  id: {
    subject: "Konfirmasi Email & Mulai Berdonasi dengan Minber-i Aksa",
    preheader: "Satu langkah lagi untuk mengaktifkan akun Anda",
    title: "Konfirmasi Alamat Email Anda",
    greeting: "Halo,",
    body: "Terima kasih telah mendaftar di Minber-i Aksa. Klik tombol di bawah untuk mengonfirmasi alamat email Anda — Anda akan masuk secara otomatis.",
    btnLabel: "Konfirmasi Akun & Masuk",
    orCopy: "Atau salin tautan ini ke browser Anda",
    note: "Tautan ini hanya dapat digunakan sekali.",
    expires: "Tautan ini berlaku selama 24 jam",
    ignore: "Jika Anda tidak membuat akun, abaikan email ini.",
    footer: "© 2026 Minber-i Aksa · Semua hak dilindungi",
  },
  en: {
    subject: "Confirm Your Email & Start Giving with Minber-i Aksa",
    preheader: "One step away from activating your account",
    title: "Confirm Your Email Address",
    greeting: "Hello,",
    body: "Thanks for signing up with Minber-i Aksa. Click the button below to confirm your email address — you'll be signed in automatically.",
    btnLabel: "Confirm Account & Sign In",
    orCopy: "Or copy this link into your browser",
    note: "This link can only be used once.",
    expires: "This link expires in 24 hours",
    ignore: "If you didn't create an account, you can safely ignore this email.",
    footer: "© 2026 Minber-i Aksa · All rights reserved",
  },
};

function buildVerificationHtml(verificationUrl: string, locale: string): string {
  const tx = copy[locale] ?? copy.en;
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${tx.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;">${tx.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F2EA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(16,33,43,0.12);">
          <tr>
            <td style="background:#10212B;padding:34px 48px 30px;text-align:center;">
              <img src="logo-white.png" alt="Minber-i Aksa" height="44" style="height:44px;width:auto;display:block;margin:0 auto 18px;" />
              <h1 style="color:#D39A27;font-size:20px;font-weight:700;margin:0;letter-spacing:-0.3px;">${tx.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px 32px;" dir="${dir}">
              <p style="color:#132C38;font-size:15px;line-height:1.7;margin:0 0 8px;text-align:${align};">${tx.greeting}</p>
              <p style="color:#132C38;font-size:15px;line-height:1.7;margin:0 0 34px;text-align:${align};">${tx.body}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:30px;">
                    <a href="${verificationUrl}" style="display:inline-block;background:#A93428;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:999px;line-height:1;">${tx.btnLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="color:#52616B;font-size:12px;text-align:center;margin:0 0 24px;">${tx.expires} · ${tx.note}</p>
              <hr style="border:none;border-top:1px solid #F1E7D8;margin:0 0 24px;" />
              <p style="color:#52616B;font-size:12px;margin:0 0 6px;text-align:${align};">${tx.orCopy}:</p>
              <p style="word-break:break-all;font-size:11px;color:#10212B;background:#FFFDF8;border:1px solid #E2DACF;border-radius:8px;padding:10px 14px;margin:0 0 28px;">${verificationUrl}</p>
              <p style="color:#52616B;font-size:12px;line-height:1.6;margin:0;text-align:center;">${tx.ignore}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFDF8;padding:18px 48px;border-top:1px solid #F1E7D8;" align="center">
              <p style="color:#52616B;font-size:11px;margin:0;">${tx.footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
  locale = "en"
): Promise<void> {
  const tx = copy[locale] ?? copy.en;
  const from = process.env.SENDGRID_FROM ?? "noreply@minberiaksa.org";

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n[VERIFY EMAIL - DEV]\nTo: ${to}\nSubject: ${tx.subject}\nLink: ${verificationUrl}\n`);
    return;
  }

  await sgMail.send({
    to,
    from,
    subject: tx.subject,
    html: buildVerificationHtml(verificationUrl, locale),
  });
}

/* ===================== BULK / TEMPLATE EMAIL ===================== */

export interface BulkEmailRecipient {
  to: string;
  subject: string;
  html: string;
}

export interface BulkEmailResult {
  sent: number;
  failed: { to: string; error: string }[];
}

export async function sendBulkEmail(
  recipients: BulkEmailRecipient[]
): Promise<BulkEmailResult> {
  const from = process.env.SENDGRID_FROM ?? "noreply@minberiaksa.org";
  const out: BulkEmailResult = { sent: 0, failed: [] };

  if (recipients.length === 0) return out;

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n[BULK EMAIL - DEV] would send to ${recipients.length} recipients`);
    out.sent = recipients.length;
    return out;
  }

  const CONCURRENCY = 8;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= recipients.length) return;
      const r = recipients[i];
      try {
        await sgMail.send({ to: r.to, from, subject: r.subject, html: r.html });
        out.sent += 1;
      } catch (err) {
        out.failed.push({
          to: r.to,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, recipients.length) }, worker));
  return out;
}
