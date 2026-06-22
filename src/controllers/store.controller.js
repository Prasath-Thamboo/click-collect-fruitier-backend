const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getStores = async (req, res) => {
  try {
    const where = {};
    if (!req.user || req.user.role !== 'ADMIN') where.isActive = true;
    const stores = await prisma.store.findMany({ where, orderBy: { name: 'asc' } });
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.getStore = async (req, res) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) return res.status(404).json({ error: "Magasin introuvable." });
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.createStore = async (req, res) => {
  try {
    const { name, address } = req.body;
    const store = await prisma.store.create({ data: { name, address } });
    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.updateStore = async (req, res) => {
  try {
    const { name, address, isActive } = req.body;
    const store = await prisma.store.update({
      where: { id: req.params.id },
      data: { name, address, isActive },
    });
    res.json(store);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Magasin introuvable." });
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.deleteStore = async (req, res) => {
  try {
    await prisma.store.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: "Magasin désactivé." });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Magasin introuvable." });
    res.status(500).json({ error: "Erreur serveur." });
  }
};
