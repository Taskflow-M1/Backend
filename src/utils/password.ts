import bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

// Precomputed hash used to equalize login timing when email does not exist
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'timing-guard-placeholder-secret',
  BCRYPT_SALT_ROUNDS,
);

// Hache un mot de passe avec bcrypt avant son stockage.
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

// Compare un mot de passe avec son hash bcrypt.
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Compare le mot de passe avec un temps similaire même si le compte est absent.
export async function verifyPasswordTimingSafe(
  plainPassword: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const targetHash = passwordHash ?? DUMMY_PASSWORD_HASH;
  const matches = await bcrypt.compare(plainPassword, targetHash);
  return Boolean(passwordHash) && matches;
}
