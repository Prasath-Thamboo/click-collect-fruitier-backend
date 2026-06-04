const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Fonction d'inscription (Register)
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'CLIENT',
      },
    });

    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès !",
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });

  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
};

// Fonction de connexion (Login)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, storeId: user.managedStoreId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: "Connexion réussie !",
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
};