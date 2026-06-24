const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"Click & Collect" <${process.env.SMTP_FROM}>`;

async function sendVerificationEmail(email, token) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Confirmez votre adresse e-mail — Click & Collect',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Bienvenue sur Click &amp; Collect !</h2>
        <p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail. Le lien expire dans <strong>24 heures</strong>.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Confirmer mon e-mail
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          Si vous n'avez pas créé de compte, ignorez cet e-mail.
        </p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Réinitialisation de votre mot de passe — Click & Collect',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Réinitialisation de mot de passe</h2>
        <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Le lien expire dans <strong>1 heure</strong>.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">
          Réinitialiser mon mot de passe
        </a>
        <p style="margin-top:24px;color:#6b7280;font-size:13px">
          Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail.
        </p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
