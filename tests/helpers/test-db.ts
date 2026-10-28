import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { env } from '../../src/config/env';
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
  const payload: Record<string, string> = {
    email,
    password: options.password ?? 'Password123!',
  };

  if (options.firstName !== undefined) {
    payload.firstName = options.firstName;
  }
  if (options.lastName !== undefined) {
    payload.lastName = options.lastName;
  }

  const res = await request(app).post('/api/auth/register').send(payload);

  if (res.status !== 201) {
    throw new Error(
      `Failed to register test account "${email}": HTTP ${res.status} ${JSON.stringify(res.body)}`,
    );
  }

  return {
    user: res.body.user as PublicUser,
    token: res.body.token as string,
    authHeader: `Bearer ${res.body.token as string}`,
  };
}

