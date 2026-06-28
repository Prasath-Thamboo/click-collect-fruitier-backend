const { prisma } = require('../lib/prisma');

exports.getProducts = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {};

    if (!req.user || (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN')) {
      where.isAvailable = true;
    }

    if (req.user?.role === 'MANAGER') {
      where.storeId = req.user.storeId;
    } else if (storeId) {
      where.storeId = storeId;
    }

    const products = await prisma.product.findMany({
      where,
      include: { store: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: "Produit introuvable." });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, imageUrl, storeId } = req.body;

    // Un manager ne peut créer des produits que dans son propre magasin
    if (req.user.role === 'MANAGER' && req.user.storeId !== storeId) {
      return res.status(403).json({ error: "Accès interdit à ce magasin." });
    }

    const product = await prisma.product.create({
      data: { name, description, price, imageUrl, storeId },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, imageUrl, isAvailable } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Produit introuvable." });

    if (req.user.role === 'MANAGER' && req.user.storeId !== existing.storeId) {
      return res.status(403).json({ error: "Accès interdit à ce magasin." });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, price, imageUrl, isAvailable },
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Produit introuvable." });

    if (req.user.role === 'MANAGER' && req.user.storeId !== existing.storeId) {
      return res.status(403).json({ error: "Accès interdit à ce magasin." });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: "Produit supprimé." });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};
