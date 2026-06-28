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

async function sendOrderConfirmation(email, { orderItems, storeName, pickupDate, totalAmount }) {
  const itemRows = orderItems
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px">${i.product.name} × ${i.quantity}</td><td style="padding:4px 8px;text-align:right">${(i.unitPrice * i.quantity).toFixed(2)} €</td></tr>`
    )
    .join('');

  const dateStr = new Date(pickupDate).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Votre commande est confirmée — Click & Collect',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#16a34a">Commande confirmée !</h2>
        <p>Voici le récapitulatif de votre commande chez <strong>${storeName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:6px 8px;text-align:left">Article</th>
              <th style="padding:6px 8px;text-align:right">Prix</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td style="padding:8px;font-weight:bold">Total payé</td>
              <td style="padding:8px;text-align:right;font-weight:bold;color:#16a34a">${Number(totalAmount).toFixed(2)} €</td>
            </tr>
          </tfoot>
        </table>
        <p><strong>Retrait prévu :</strong> ${dateStr}</p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px">Merci pour votre commande. À bientôt !</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmation };
