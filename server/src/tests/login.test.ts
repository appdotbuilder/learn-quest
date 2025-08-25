import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { password } from 'bun';

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'password123',
    total_xp: 0,
    current_level: 1,
    avatar_url: null,
  };

  it('should login user with valid credentials', async () => {
    // Create test user with hashed password
    const password_hash = await password.hash(testUser.password);
    
    const insertedUsers = await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash,
        total_xp: testUser.total_xp,
        current_level: testUser.current_level,
        avatar_url: testUser.avatar_url,
      })
      .returning()
      .execute();

    const insertedUser = insertedUsers[0];

    const loginInput: LoginInput = {
      email: testUser.email,
      password: testUser.password,
    };

    const result = await login(loginInput);

    // Verify user data
    expect(result.id).toEqual(insertedUser.id);
    expect(result.email).toEqual(testUser.email);
    expect(result.username).toEqual(testUser.username);
    expect(result.password_hash).toEqual(password_hash);
    expect(result.total_xp).toEqual(testUser.total_xp);
    expect(result.current_level).toEqual(testUser.current_level);
    expect(result.avatar_url).toEqual(testUser.avatar_url);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123',
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    const password_hash = await password.hash(testUser.password);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash,
        total_xp: testUser.total_xp,
        current_level: testUser.current_level,
        avatar_url: testUser.avatar_url,
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: 'wrongpassword',
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should verify password hash correctly', async () => {
    // Test with different password to ensure password comparison works
    const differentPassword = 'differentpassword456';
    const password_hash = await password.hash(differentPassword);
    
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        username: testUser.username,
        password_hash,
        total_xp: 100,
        current_level: 2,
        avatar_url: 'http://example.com/avatar.png',
      })
      .execute();

    const loginInput: LoginInput = {
      email: testUser.email,
      password: differentPassword,
    };

    const result = await login(loginInput);

    expect(result.email).toEqual(testUser.email);
    expect(result.total_xp).toEqual(100);
    expect(result.current_level).toEqual(2);
    expect(result.avatar_url).toEqual('http://example.com/avatar.png');
  });

  it('should return user with all database fields', async () => {
    const password_hash = await password.hash(testUser.password);
    
    const insertedUsers = await db.insert(usersTable)
      .values({
        email: 'complete@example.com',
        username: 'completeuser',
        password_hash,
        total_xp: 250,
        current_level: 3,
        avatar_url: 'http://example.com/complete.jpg',
      })
      .returning()
      .execute();

    const insertedUser = insertedUsers[0];

    const loginInput: LoginInput = {
      email: 'complete@example.com',
      password: testUser.password,
    };

    const result = await login(loginInput);

    // Verify all fields are present and correctly typed
    expect(typeof result.id).toBe('number');
    expect(typeof result.email).toBe('string');
    expect(typeof result.username).toBe('string');
    expect(typeof result.password_hash).toBe('string');
    expect(typeof result.total_xp).toBe('number');
    expect(typeof result.current_level).toBe('number');
    expect(typeof result.avatar_url).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify actual values match
    expect(result.id).toEqual(insertedUser.id);
    expect(result.created_at).toEqual(insertedUser.created_at);
    expect(result.updated_at).toEqual(insertedUser.updated_at);
  });
});