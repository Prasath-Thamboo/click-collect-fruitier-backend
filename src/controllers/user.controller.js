const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/prisma');

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        managedStoreId: true,
        managedStore: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, role, storeId } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Cet email est déjà utilisé." });

    const allowedRoles = ['CLIENT', 'MANAGER', 'ADMIN'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ error: "Rôle invalide." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'CLIENT',
        managedStoreId: role === 'MANAGER' ? (storeId || null) : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        managedStoreId: true,
        managedStore: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { role, storeId } = req.body;

    const allowedRoles = ['CLIENT', 'MANAGER', 'ADMIN'];
    if (role && !allowedRoles.includes(role)) return res.status(400).json({ error: "Rôle invalide." });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        role,
        managedStoreId: role === 'MANAGER' ? (storeId || null) : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        managedStoreId: true,
        managedStore: { select: { id: true, name: true } },
      },
    });
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Utilisateur introuvable." });
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    const orderCount = await prisma.order.count({ where: { userId: req.params.id } });
    if (orderCount > 0) {
      return res.status(400).json({ error: `Impossible : cet utilisateur a ${orderCount} commande(s).` });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "Utilisateur supprimé." });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Utilisateur introuvable." });
    res.status(500).json({ error: "Erreur serveur." });
  }
};
