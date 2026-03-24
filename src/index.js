require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globaux
app.use(helmet());
app.use(cors());
app.use(express.json()); // Indispensable pour lire le JSON envoyé par Thunder Client

// Route de test simple
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API FruityCollect 🍎🥤" });
});

// Import et utilisation des routes d'authentification
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});