import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function buildVerificationHtml(verificationUrl: string, locale: string): string {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const texts: Record<string, { title: string; greeting: string; body: string; btnLabel: string; or: string; warning: string; expires: string; footer: string }> = {
    ar: {
      title: "تأكيد البريد الإلكتروني",
      greeting: "مرحباً،",
      body: "شكراً لتسجيلك. انقر على الزر أدناه لتفعيل حسابك.",
      btnLabel: "تأكيد البريد الإلكتروني",
      or: "أو انسخ الرابط التالي في متصفحك",
      warning: "إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.",
      expires: "ينتهي هذا الرابط خلال 24 ساعة",
      footer: "© 2024 قرة العيون. جميع الحقوق محفوظة.",
    },
    tr: {
      title: "E-posta Doğrulama",
      greeting: "Merhaba,",
      body: "Kayıt olduğunuz için teşekkürler. Hesabınızı etkinleştirmek için aşağıdaki düğmeye tıklayın.",
      btnLabel: "E-postamı Doğrula",
      or: "Veya aşağıdaki bağlantıyı tarayıcınıza kopyalayın",
      warning: "Eğer bir hesap oluşturmadıysanız bu e-postayı görmezden gelebilirsiniz.",
      expires: "Bu bağlantı 24 saat içinde sona erer",
      footer: "© 2024 Gözbebekleri. Tüm hakları saklıdır.",
    },
    fr: {
      title: "Vérification de l'e-mail",
      greeting: "Bonjour,",
      body: "Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour activer votre compte.",
      btnLabel: "Vérifier mon adresse e-mail",
      or: "Ou copiez le lien suivant dans votre navigateur",
      warning: "Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail en toute sécurité.",
      expires: "Ce lien expire dans 24 heures",
      footer: "© 2024 Gözbebekleri. Tous droits réservés.",
    },
    es: {
      title: "Verificación de correo electrónico",
      greeting: "Hola,",
      body: "Gracias por registrarte. Haz clic en el botón de abajo para activar tu cuenta.",
      btnLabel: "Verificar mi correo electrónico",
      or: "O copia el siguiente enlace en tu navegador",
      warning: "Si no creaste una cuenta, puedes ignorar este correo.",
      expires: "Este enlace expira en 24 horas",
      footer: "© 2024 Gözbebekleri. Todos los derechos reservados.",
    },
    pt: {
      title: "Verificação de e-mail",
      greeting: "Olá,",
      body: "Obrigado por se registar. Clique no botão abaixo para ativar a sua conta.",
      btnLabel: "Verificar o meu e-mail",
      or: "Ou copie o seguinte link para o seu navegador",
      warning: "Se não criou uma conta, pode ignorar este e-mail.",
      expires: "Este link expira em 24 horas",
      footer: "© 2024 Gözbebekleri. Todos os direitos reservados.",
    },
    id: {
      title: "Verifikasi Email",
      greeting: "Halo,",
      body: "Terima kasih telah mendaftar. Klik tombol di bawah untuk mengaktifkan akun Anda.",
      btnLabel: "Verifikasi Email Saya",
      or: "Atau salin tautan berikut ke browser Anda",
      warning: "Jika Anda tidak membuat akun, Anda dapat mengabaikan email ini.",
      expires: "Tautan ini berlaku selama 24 jam",
      footer: "© 2024 Gözbebekleri. Semua hak dilindungi.",
    },
    en: {
      title: "Verify Your Email",
      greeting: "Hello,",
      body: "Thank you for signing up. Click the button below to activate your account.",
      btnLabel: "Verify My Email",
      or: "Or copy this link into your browser",
      warning: "If you didn't create an account, you can safely ignore this email.",
      expires: "This link expires in 24 hours",
      footer: "© 2024 Gözbebekleri. All rights reserved.",
    },
  };

  const tx = texts[locale] ?? texts.en;

  return `
<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tx.title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(2,94,184,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#025EB8 0%,#0471d6 100%);padding:36px 40px 28px;text-align:center;">
              <img src="https://i.ibb.co/ZwcJcN1/logo.webp" alt="Logo" height="48" style="height:48px;width:auto;filter:brightness(0) invert(1);display:block;margin:0 auto 20px;" />
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">${tx.title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;" dir="${dir}">
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">${tx.greeting}</p>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 36px;">${tx.body}</p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#025EB8 0%,#0471d6 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:14px;letter-spacing:0.3px;">
                      ${tx.btnLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expires badge -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <span style="display:inline-flex;align-items:center;gap:6px;background:#fff7ed;border:1px solid #fa5d17;border-radius:999px;padding:6px 16px;color:#fa5d17;font-size:13px;font-weight:600;">
                      ⏱ ${tx.expires}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">${tx.or}:</p>
              <p style="word-break:break-all;font-size:12px;color:#025EB8;margin:0 0 32px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;">${verificationUrl}</p>

              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 24px;" />

              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;text-align:center;">${tx.warning}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">${tx.footer}</p>
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
  const subjects: Record<string, string> = {
    ar: "تأكيد البريد الإلكتروني - قرة العيون",
    tr: "E-posta Doğrulama – Gözbebekleri",
    fr: "Vérification de l'e-mail – Gözbebekleri",
    es: "Verifica tu correo – Gözbebekleri",
    pt: "Verificação de e-mail – Gözbebekleri",
    id: "Verifikasi Email – Gözbebekleri",
    en: "Verify Your Email – Gözbebekleri",
  };
  const subject = subjects[locale] ?? subjects.en;
  const from = process.env.SENDGRID_FROM ?? "noreply@gozbebekleri.org.tr";

  if (!process.env.SENDGRID_API_KEY) {
    // Dev fallback — no SendGrid key configured
    console.log(`\n[VERIFY EMAIL - DEV]\nTo: ${to}\nSubject: ${subject}\nLink: ${verificationUrl}\n`);
    return;
  }

  await sgMail.send({
    to,
    from,
    subject,
    html: buildVerificationHtml(verificationUrl, locale),
  });
}
