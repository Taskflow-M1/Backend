import { AppError } from '../../utils/app-error';
import { ERROR_CODES, MESSAGES } from '../../utils/constants';
import { signAccessToken } from '../../utils/jwt';
import {
  hashPassword,
  verifyPasswordTimingSafe,
} from '../../utils/password';
import { PublicUser, toPublicUser, UserModel } from '../users/user.model';
import { LoginInput, RegisterInput } from './auth.validation';

export interface AuthResponse {
  user: PublicUser;
  token: string;
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 11000
  );
}

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
