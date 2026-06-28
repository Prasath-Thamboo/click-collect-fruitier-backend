const Stripe = require('stripe');
const { prisma } = require('../lib/prisma');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DISCOUNT_PERCENT = 15;
const WEEKS_PER_MONTH = 4.33;

function calcMonthlyAmount(items, priceMap, schedulesCount) {
  const orderTotal = items.reduce((sum, i) => sum + priceMap[i.productId] * i.quantity, 0);
  const pickupsPerMonth = Math.round(schedulesCount * WEEKS_PER_MONTH);
  return {
    monthlyAmount: Math.round(orderTotal * pickupsPerMonth * (1 - DISCOUNT_PERCENT / 100) * 100) / 100,
    pickupsPerMonth,
  };
}

exports.createSubscriptionIntent = async (req, res) => {
  try {
    const { storeId, items, schedules } = req.body;
    const userId = req.user.userId;

    if (!storeId || !items?.length || !schedules?.length) {
      return res.status(400).json({ error: 'Boutique, produits et planning requis.' });
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true, storeId },
    });
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Un ou plusieurs produits sont indisponibles.' });
    }

    const priceMap = Object.fromEntries(products.map((p) => [p.id, p.price]));
    const { monthlyAmount } = calcMonthlyAmount(items, priceMap, schedules.length);
    const amountCents = Math.round(monthlyAmount * 100);

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
    }

    // Create Stripe Product + Price for this subscription
    const stripeProduct = await stripe.products.create({
      name: `Abonnement Click & Collect — ${schedules.length}×/sem. (-${DISCOUNT_PERCENT}%)`,
    });
    const stripePrice = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'eur',
      recurring: { interval: 'month' },
      product: stripeProduct.id,
    });

    // Create incomplete Stripe Subscription
    const stripeSub = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: stripePrice.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, storeId },
    });

    res.json({
      clientSecret: stripeSub.latest_invoice.payment_intent.client_secret,
      stripeSubscriptionId: stripeSub.id,
      monthlyAmount,
      discountPercent: DISCOUNT_PERCENT,
    });
  } catch (error) {
    console.error('createSubscriptionIntent:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'abonnement." });
  }
};

exports.confirmSubscription = async (req, res) => {
  try {
    const { stripeSubscriptionId, storeId, items, schedules } = req.body;
    const userId = req.user.userId;

    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    if (!['active', 'trialing'].includes(stripeSub.status)) {
      return res.status(402).json({ error: "Le paiement de l'abonnement n'a pas été validé." });
    }

    // Idempotent
    const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
    if (existing) return res.json(existing);

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const priceMap = Object.fromEntries(products.map((p) => [p.id, p.price]));
    const { monthlyAmount } = calcMonthlyAmount(items, priceMap, schedules.length);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        storeId,
        status: 'ACTIVE',
        monthlyAmount,
        discountPercent: DISCOUNT_PERCENT,
        stripeSubscriptionId,
        stripeCustomerId: user.stripeCustomerId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: priceMap[item.productId],
          })),
        },
        schedules: {
          create: schedules.map((s) => ({ dayOfWeek: s.dayOfWeek, pickupTime: s.pickupTime })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        store: true,
      },
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('confirmSubscription:', error);
    res.status(500).json({ error: "Erreur lors de la confirmation de l'abonnement." });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.userId },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        store: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) return res.status(404).json({ error: 'Abonnement introuvable.' });
    if (sub.userId !== req.user.userId) return res.status(403).json({ error: 'Accès interdit.' });
    if (sub.status === 'CANCELLED') return res.status(400).json({ error: 'Abonnement déjà annulé.' });

    if (sub.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  } catch (error) {
    console.error('cancelSubscription:', error);
    res.status(500).json({ error: "Erreur lors de l'annulation." });
  }
};
