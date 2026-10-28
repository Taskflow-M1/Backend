import { AppError } from '../../utils/app-error';
import { ERROR_CODES, MESSAGES } from '../../utils/constants';
import { signAccessToken } from '../../utils/jwt';
import {
  hashPassword,
  verifyPasswordTimingSafe,
} from '../../utils/password';
import { PublicUser, toPublicUser, UserModel } from '../users/user.model';
import {
  LoginInput,
  RegisterInput,
  SendVerificationCodeInput,
  VerifyEmailCodeInput,
} from './auth.validation';
import {
  cancelVerificationCode,
  consumeVerificationCode,
  createVerificationCode,
  EMAIL_VERIFICATION_COOLDOWN_SECONDS,
  EMAIL_VERIFICATION_TTL_SECONDS,
} from './email-verification.store';
import { sendVerificationEmail } from './verification-email.service';

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

export interface VerificationCodeSentResponse {
  message: string;
  expiresInSeconds: number;
  cooldownSeconds: number;
}

// Reconnaît une erreur MongoDB causée par une valeur déjà utilisée.
function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

// Crée le compte, hache son mot de passe et émet son premier JWT.
export async function registerUser(
  input: RegisterInput,
): Promise<AuthResponse> {
  const existingUser = await UserModel.findOne({ email: input.email }).lean();
  if (existingUser) {
    throw AppError.conflict(
      MESSAGES.AUTH.EMAIL_ALREADY_USED,
      ERROR_CODES.EMAIL_ALREADY_USED,
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const createdUser = await UserModel.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName ?? '',
      lastName: input.lastName ?? '',
    });

    const publicUser = toPublicUser(createdUser);
    const token = signAccessToken({
      sub: publicUser.id,
      email: publicUser.email,
    });

    return {
      user: publicUser,
      token,
    };
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw AppError.conflict(
        MESSAGES.AUTH.EMAIL_ALREADY_USED,
        ERROR_CODES.EMAIL_ALREADY_USED,
      );
    }
    throw err;
  }
}

// Vérifie les identifiants puis retourne l’utilisateur et son JWT.
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await UserModel.findOne({ email: input.email }).select(
    '+passwordHash',
  );

  const isPasswordValid = await verifyPasswordTimingSafe(
    input.password,
    user?.passwordHash,
  );

  if (!user || !isPasswordValid) {
    throw AppError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS);
  }

  const publicUser = toPublicUser(user);
  const token = signAccessToken({
    sub: publicUser.id,
    email: publicUser.email,
  });

  return {
    user: publicUser,
    token,
  };
}

// Génère et envoie un code si l’adresse e-mail est disponible.
export async function requestVerificationCode(
  input: SendVerificationCodeInput,
): Promise<VerificationCodeSentResponse> {
  const existingUser = await UserModel.findOne({ email: input.email }).lean();
  if (existingUser) {
    throw AppError.conflict(
      MESSAGES.AUTH.EMAIL_ALREADY_USED,
      ERROR_CODES.EMAIL_ALREADY_USED,
    );
  }

  const code = createVerificationCode(input.email);

  try {
    await sendVerificationEmail(input.email, code, input.firstName);
  } catch (_err) {
    cancelVerificationCode(input.email, code);
    throw new AppError(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      MESSAGES.AUTH.VERIFICATION_EMAIL_FAILED,
    );
  }

  return {
    message: MESSAGES.AUTH.VERIFICATION_CODE_SENT,
    expiresInSeconds: EMAIL_VERIFICATION_TTL_SECONDS,
    cooldownSeconds: EMAIL_VERIFICATION_COOLDOWN_SECONDS,
  };
}

// Démarre l’inscription en demandant l’envoi du code e-mail.
export async function requestRegistration(
  input: RegisterInput,
): Promise<VerificationCodeSentResponse> {
  // Le mot de passe n'est ni stocké ni utilisé avant la validation du code.
  return requestVerificationCode({
    email: input.email,
    firstName: input.firstName,
  });
}

// Valide le code, crée le compte et retourne son JWT.
export async function verifyEmailCodeAndRegister(
  input: VerifyEmailCodeInput,
): Promise<AuthResponse> {
  // La consommation est atomique : un code correct ne peut servir qu'une fois.
  consumeVerificationCode(input.email, input.code);

  return registerUser({
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
  });
}
