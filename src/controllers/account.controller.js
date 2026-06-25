const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { validatePassword } = require('../utils/password.utils');
const { sendVerificationEmail } = require('../services/email.service');

const prisma = new PrismaClient();

// GET /api/account — données personnelles de l'utilisateur connecté
exports.getAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isEmailVerified: true,
        managedStoreId: true,
        orders: {
          select: { id: true, status: true, totalAmount: true, createdAt: true, pickupDate: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// PUT /api/account/password — changer le mot de passe
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.userId }, data: { password: hashed } });

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// PUT /api/account/email — changer l'adresse email
exports.changeEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: 'Nouvel email et mot de passe requis.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    if (newEmail === user.email) {
      return res.status(400).json({ error: 'Le nouvel email est identique à l\'actuel.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        email: newEmail,
        isEmailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    await sendVerificationEmail(newEmail, verificationToken);

    res.json({ message: 'Email modifié. Vérifiez votre nouvelle boîte mail pour confirmer.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET /api/account/export — export RGPD de toutes les données
exports.exportData = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        isEmailVerified: true,
        orders: {
          include: {
            store: { select: { name: true, address: true } },
            items: {
              include: { product: { select: { name: true, price: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      notice: 'Export de vos données personnelles conformément au RGPD (art. 20).',
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.isEmailVerified,
        accountCreatedAt: user.createdAt,
      },
      orders: user.orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        pickupDate: o.pickupDate,
        createdAt: o.createdAt,
        store: o.store,
        items: o.items.map((i) => ({
          product: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      })),
    };

    res.setHeader('Content-Disposition', 'attachment; filename="mes-donnees-click-collect.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// DELETE /api/account — suppression du compte et de toutes les données
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis pour confirmer la suppression.' });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    const orders = await prisma.order.findMany({ where: { userId: req.user.userId }, select: { id: true } });
    const orderIds = orders.map((o) => o.id);

    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { userId: req.user.userId } });
    await prisma.managerInvite.deleteMany({ where: { storeId: user.managedStoreId ?? undefined } });
    await prisma.user.delete({ where: { id: req.user.userId } });

    res.json({ message: 'Votre compte et toutes vos données ont été supprimés.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
