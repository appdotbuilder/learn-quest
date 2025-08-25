import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { password } from 'bun';

export const login = async (input: LoginInput): Promise<User> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password against stored hash
    const isPasswordValid = await password.verify(input.password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Return user data with proper type conversions
    return {
      ...user,
      // Dates are already Date objects from the database
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};