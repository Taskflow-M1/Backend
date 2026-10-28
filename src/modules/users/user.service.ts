/**
 * Gère le profil utilisateur, la recherche contrôlée et le changement sécurisé
 * du mot de passe après vérification de l'ancien secret.
 */
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import { hashPassword, verifyPassword } from '../../utils/password';
import { escapeRegex } from '../../utils/regex';
import { TeamMembershipModel } from '../teams/team-membership.model';
import { UserSummary } from '../teams/team.service';
import { IUser, PublicUser, toPublicUser, UserModel } from './user.model';
import { UpdatePasswordInput, UpdateProfileInput } from './user.validation';

export async function searchUsersForTeamAdmin(
  requesterId: string,
  search?: string,
): Promise<UserSummary[]> {
  const isTeamAdmin = await TeamMembershipModel.exists({
    userId: requesterId,
    role: 'admin',
  });

  if (!isTeamAdmin) {
    throw AppError.forbidden(MESSAGES.USERS.SEARCH_ADMIN_ONLY);
  }

  const trimmed = search?.trim() ?? '';
  const filter =
    trimmed.length > 0
      ? {
          $or: [
            { email: { $regex: escapeRegex(trimmed), $options: 'i' } },
            { firstName: { $regex: escapeRegex(trimmed), $options: 'i' } },
            { lastName: { $regex: escapeRegex(trimmed), $options: 'i' } },
          ],
        }
      : {};

  const users = await UserModel.find(filter)
    .sort({ firstName: 1, email: 1 })
    .limit(25);

  return users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
  }));
}

export async function getMyProfile(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId);

  if (!user) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  return toPublicUser(user);
}

export async function updateMyProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  const updates: Partial<Pick<IUser, 'firstName' | 'lastName' | 'avatarUrl'>> =
    {};

  if (input.firstName !== undefined) {
    updates.firstName = input.firstName;
  }
  if (input.lastName !== undefined) {
    updates.lastName = input.lastName;
  }
  if (input.avatarUrl !== undefined) {
    updates.avatarUrl = input.avatarUrl;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    { $set: updates },
    { returnDocument: 'after', runValidators: true },
  );

  if (!updatedUser) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  return toPublicUser(updatedUser);
}

export async function updateMyPassword(
  userId: string,
  input: UpdatePasswordInput,
): Promise<{ message: string }> {
  const user = await UserModel.findById(userId).select('+passwordHash');

  if (!user) {
    throw AppError.notFound(MESSAGES.USERS.NOT_FOUND);
  }

  const isCurrentValid = await verifyPassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isCurrentValid) {
    throw AppError.unauthorized(MESSAGES.USERS.CURRENT_PASSWORD_INCORRECT);
  }

  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();

  return {
    message: MESSAGES.USERS.PASSWORD_UPDATED,
  };
}
