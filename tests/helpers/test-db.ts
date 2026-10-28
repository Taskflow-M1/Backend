import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { env } from '../../src/config/env';
import { registerUser } from '../../src/modules/auth/auth.service';
import { PublicUser } from '../../src/modules/users/user.model';

function assertSafeTestDatabase(): void {
  const dbName = mongoose.connection.name;
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(
      `Safety abort: refusing to clear non-test MongoDB database "${dbName}"`,
    );
  }
}

export async function setupTestDatabase(): Promise<void> {
  await connectDatabase(env.mongodbUri);
  assertSafeTestDatabase();
  await clearTestDatabase();
}

export async function clearTestDatabase(): Promise<void> {
  assertSafeTestDatabase();
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

export async function teardownTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    assertSafeTestDatabase();
    await mongoose.connection.db.dropDatabase();
  }
  await disconnectDatabase();
}

export interface RegisteredTestAccount {
  user: PublicUser;
  token: string;
  authHeader: string;
}

export async function registerTestAccount(
  email: string,
  options: {
    password?: string;
    firstName?: string;
    lastName?: string;
  } = {},
): Promise<RegisteredTestAccount> {
  const payload = {
    email,
    password: options.password ?? 'Password123!',
    firstName: options.firstName,
    lastName: options.lastName,
  };

  const result = await registerUser(payload);

  return {
    user: result.user,
    token: result.token,
    authHeader: `Bearer ${result.token}`,
  };
}
