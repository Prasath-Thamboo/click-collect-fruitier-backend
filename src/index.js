require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, mobile, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin non autorisée : ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORS avant Helmet pour que les headers CORS soient toujours présents
app.use(cors(corsOptions));

app.use(helmet({
  // Helmet v5+ active cross-origin-resource-policy: same-origin par défaut,
  // ce qui bloque les lectures cross-origin même si CORS les autorise.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Webhook Stripe — raw body required, must be registered BEFORE express.json()
const webhookRoutes = require('./routes/webhook.routes');
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API FruityCollect 🍎🥤" });
});

const authRoutes = require('./routes/auth.routes');
const storeRoutes = require('./routes/store.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const accountRoutes = require('./routes/account.routes');
const paymentRoutes = require('./routes/payment.routes');
const subscriptionRoutes = require('./routes/subscription.routes');

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Error handler global — doit être après toutes les routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Erreur non gérée :', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  startScheduler();
});