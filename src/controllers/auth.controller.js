const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const { validatePassword } = require('../utils/password.utils');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email.service');

const prisma = new PrismaClient();

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'CLIENT',
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      message: "Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse e-mail.",
    });
  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
};

// GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: { gt: new Date() },
        isEmailVerified: false,
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Lien de vérification invalide ou expiré." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    res.status(200).json({ message: "Adresse e-mail confirmée avec succès ! Vous pouvez maintenant vous connecter." });
  } catch (error) {
    console.error("Erreur verify-email:", error);
    res.status(500).json({ error: "Erreur serveur lors de la vérification." });
  }
};

// POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis." });

    const user = await prisma.user.findUnique({ where: { email } });

    // Réponse identique même si l'email n'existe pas (sécurité)
    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: "Si ce compte existe et n'est pas vérifié, un e-mail a été envoyé." });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken, emailVerificationExpiry: verificationExpiry },
    });

    await sendVerificationEmail(email, verificationToken);

    res.status(200).json({ message: "Si ce compte existe et n'est pas vérifié, un e-mail a été envoyé." });
  } catch (error) {
    console.error("Erreur resend-verification:", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Veuillez confirmer votre adresse e-mail avant de vous connecter.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, storeId: user.managedStoreId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: "Connexion réussie !",
      token,
      user: { id: user.id, email: user.email, role: user.role, storeId: user.managedStoreId },
    });
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email requis." });

    const user = await prisma.user.findUnique({ where: { email } });

    // Réponse identique même si l'email n'existe pas (sécurité)
    if (user && user.isEmailVerified) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    res.status(200).json({ message: "Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé." });
  } catch (error) {
    console.error("Erreur forgot-password:", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Lien de réinitialisation invalide ou expiré." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter." });
  } catch (error) {
    console.error("Erreur reset-password:", error);
    res.status(500).json({ error: "Erreur serveur lors de la réinitialisation." });
  }
};
