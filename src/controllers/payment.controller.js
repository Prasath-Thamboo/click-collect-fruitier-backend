const Stripe = require('stripe');
const { prisma } = require('../lib/prisma');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const { storeId, pickupDate, items, guestEmail, guestPhone } = req.body;

    if (!req.user) {
      if (!guestEmail || !guestPhone) {
        return res.status(400).json({ error: "Email et numéro de téléphone requis pour commander sans compte." });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        return res.status(400).json({ error: "Adresse email invalide." });
      }
      const existing = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (existing) {
        return res.status(409).json({ error: "Un compte existe déjà avec cet email. Veuillez vous connecter." });
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Le panier est vide." });
    }
    if (!pickupDate) {
      return res.status(400).json({ error: "La date de retrait est requise." });
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

    // Stripe amount is in cents
    const amountCents = Math.round(totalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata: {
        storeId,
        userId: req.user?.userId ?? 'guest',
        guestEmail: guestEmail ?? '',
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('Stripe createPaymentIntent error:', error);
    res.status(500).json({ error: "Erreur lors de la création du paiement." });
  }
};
