function validatePassword(password) {
  if (!password || password.length < 8)
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Z]/.test(password))
    return 'Le mot de passe doit contenir au moins une lettre majuscule.';
  if (!/[a-z]/.test(password))
    return 'Le mot de passe doit contenir au moins une lettre minuscule.';
  if (!/\d/.test(password))
    return 'Le mot de passe doit contenir au moins un chiffre.';
  if (!/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]/.test(password))
    return 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...).';
  return null;
}

module.exports = { validatePassword };
