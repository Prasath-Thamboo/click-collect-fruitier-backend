const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getOrders = async (req, res) => {
  try {
    let where = {};
    if (req.user.role === 'CLIENT') where.userId = req.user.userId;
    else if (req.user.role === 'MANAGER') where.storeId = req.user.storeId;
    // ADMIN voit tout

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true } },
        store: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true } },
        store: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });
    if (!order) return res.status(404).json({ error: "Commande introuvable." });

    const isOwner = order.userId === req.user.userId;
    const isManagerOfStore = req.user.role === 'MANAGER' && req.user.storeId === order.storeId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isManagerOfStore && !isAdmin) {
      return res.status(403).json({ error: "Accès interdit." });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { storeId, pickupDate, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Le panier est vide." });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: "Un ou plusieurs produits sont indisponibles." });
    }

    const priceMap = Object.fromEntries(products.map((p) => [p.id, p.price]));
    const totalAmount = items.reduce(
      (sum, item) => sum + priceMap[item.productId] * item.quantity,
      0
    );

    const order = await prisma.order.create({
      data: {
        userId: req.user.userId,
        storeId,
        totalAmount,
        pickupDate: new Date(pickupDate),
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: priceMap[item.productId],
          })),
        },
      },
      include: {
        store: true,
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'ACCEPTED', 'READY', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Statut invalide. Valeurs : ${validStatuses.join(', ')}` });
    }

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Commande introuvable." });

    if (req.user.role === 'MANAGER' && req.user.storeId !== existing.storeId) {
      return res.status(403).json({ error: "Accès interdit à cette commande." });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Commande introuvable." });

    const isOwner = existing.userId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Accès interdit." });
    }
    if (isOwner && existing.status !== 'PENDING') {
      return res.status(400).json({ error: "Seules les commandes en attente peuvent être annulées." });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur." });
  }
};
