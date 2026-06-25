const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// POST /api/admin/invites — crée un code d'invitation manager pour un store
exports.createInvite = async (req, res) => {
  try {
    const { storeId, expiresInDays } = req.body;
    if (!storeId) return res.status(400).json({ error: 'storeId requis.' });

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).json({ error: 'Magasin introuvable.' });

    const code = crypto.randomBytes(6).toString('hex').toUpperCase(); // ex: A3F9B2
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invite = await prisma.managerInvite.create({
      data: { code, storeId, expiresAt },
      include: { store: { select: { name: true } } },
    });

    res.status(201).json(invite);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET /api/admin/invites — liste tous les codes
exports.listInvites = async (req, res) => {
  try {
    const invites = await prisma.managerInvite.findMany({
      include: { store: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// DELETE /api/admin/invites/:id — supprime un code
exports.deleteInvite = async (req, res) => {
  try {
    const invite = await prisma.managerInvite.findUnique({ where: { id: req.params.id } });
    if (!invite) return res.status(404).json({ error: 'Invitation introuvable.' });

    await prisma.managerInvite.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invitation supprimée.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
