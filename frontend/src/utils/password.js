export function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 1, label: 'Weak' };
  if (score <= 3) return { level: 2, label: 'Fair' };
  if (score <= 5) return { level: 3, label: 'Strong' };
  return { level: 4, label: 'Very Strong' };
}

export function getPasswordChecks(password, username, email) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
    {
      label: 'Different from your username/email',
      met: password.length > 0
        && password.toLowerCase() !== (username || '').toLowerCase()
        && password.toLowerCase() !== (email || '').toLowerCase(),
    },
  ];
}

export function isPasswordValid(password, username, email) {
  return getPasswordChecks(password, username, email).every((c) => c.met);
}
