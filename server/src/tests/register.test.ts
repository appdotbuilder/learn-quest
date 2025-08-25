import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterInput } from '../schema';
import { register } from '../handlers/register';
import { eq } from 'drizzle-orm';

// Test input data
const validUserInput: RegisterInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
};

const anotherUserInput: RegisterInput = {
  email: 'another@example.com',
  username: 'anotheruser',
  password: 'differentpass456',
};

describe('register', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user successfully', async () => {
    const result = await register(validUserInput);

    // Verify basic user fields
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.total_xp).toEqual(0);
    expect(result.current_level).toEqual(1);
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed and not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(0);
  });

  it('should hash the password correctly', async () => {
    const result = await register(validUserInput);

    // Verify password hash can be validated
    const isValidHash = await Bun.password.verify('password123', result.password_hash);
    expect(isValidHash).toBe(true);

    // Verify wrong password fails validation
    const isInvalidHash = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidHash).toBe(false);
  });

  it('should save user to database', async () => {
    const result = await register(validUserInput);

    // Query database to verify user was saved
    const savedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(savedUsers).toHaveLength(1);
    const savedUser = savedUsers[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.total_xp).toEqual(0);
    expect(savedUser.current_level).toEqual(1);
    expect(savedUser.avatar_url).toBeNull();
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should reject duplicate email', async () => {
    // Create first user
    await register(validUserInput);

    // Try to create user with same email but different username
    const duplicateEmailInput: RegisterInput = {
      email: 'test@example.com', // Same email
      username: 'differentuser', // Different username
      password: 'password789',
    };

    await expect(register(duplicateEmailInput))
      .rejects
      .toThrow(/email already exists/i);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await register(validUserInput);

    // Try to create user with same username but different email
    const duplicateUsernameInput: RegisterInput = {
      email: 'different@example.com', // Different email
      username: 'testuser', // Same username
      password: 'password789',
    };

    await expect(register(duplicateUsernameInput))
      .rejects
      .toThrow(/username already exists/i);
  });

  it('should allow multiple users with unique credentials', async () => {
    // Create first user
    const firstUser = await register(validUserInput);

    // Create second user with different email and username
    const secondUser = await register(anotherUserInput);

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);

    // Verify they have different IDs
    expect(firstUser.id).not.toEqual(secondUser.id);

    // Verify their data is correct
    const firstUserFromDb = allUsers.find(u => u.id === firstUser.id);
    const secondUserFromDb = allUsers.find(u => u.id === secondUser.id);

    expect(firstUserFromDb?.email).toEqual('test@example.com');
    expect(firstUserFromDb?.username).toEqual('testuser');
    
    expect(secondUserFromDb?.email).toEqual('another@example.com');
    expect(secondUserFromDb?.username).toEqual('anotheruser');
  });

  it('should set default values correctly', async () => {
    const result = await register(validUserInput);

    // Verify default values are set
    expect(result.total_xp).toEqual(0);
    expect(result.current_level).toEqual(1);
    expect(result.avatar_url).toBeNull();
    
    // Verify timestamps are set
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    expect(result.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });

  it('should handle case sensitivity in email uniqueness check', async () => {
    // Create user with lowercase email
    await register(validUserInput);

    // Try to create user with uppercase version of same email
    const uppercaseEmailInput: RegisterInput = {
      email: 'TEST@EXAMPLE.COM', // Uppercase version
      username: 'differentuser',
      password: 'password789',
    };

    // This should succeed since email comparison should be case-sensitive in our implementation
    // (PostgreSQL by default treats text comparisons as case-sensitive)
    const result = await register(uppercaseEmailInput);
    expect(result.email).toEqual('TEST@EXAMPLE.COM');
  });
});