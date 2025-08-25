import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const register = async (input: RegisterInput): Promise<User> => {
  try {
    // Check if email or username already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, input.email),
          eq(usersTable.username, input.username)
        )
      )
      .execute();

    if (existingUser.length > 0) {
      const conflictField = existingUser[0].email === input.email ? 'email' : 'username';
      throw new Error(`User with this ${conflictField} already exists`);
    }

    // Hash the password using Node.js built-in crypto
    const password_hash = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 12,
    });

    // Create the new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        username: input.username,
        password_hash,
        total_xp: 0,
        current_level: 1,
        avatar_url: null,
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};