const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Accès refusé. Aucun token fourni." });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // On stocke les infos de l'utilisateur dans la requête
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token invalide ou expiré." });
  }
};

exports.isManagerOrAdmin = (req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
    next();
  } else {
    return res.status(403).json({ error: "Accès interdit. Réservé aux managers et admins." });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ error: "Accès interdit. Réservé aux admins." });
  }
};