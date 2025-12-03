/**
 * @fileoverview User service for managing user data and operations
 * @module user.service
 */

import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { IUser } from './user.interface';

/**
 * Service for managing user-related operations
 * @class UserService
 * @description Handles user data management and queries
 */
@Injectable()
export class UserService {
  constructor(private readonly knexService: KnexService) {}

  /**
   * Adds a new user to the database
   * @param {IUser} user - The user object to add
   * @returns {Promise<void>}
   */
  async addUser(user: IUser): Promise<void> {
    await this.knexService.knex<IUser>('user').insert(user);
  }

  /**
   * Retrieves all users from the database
   * @returns {Promise<IUser[]>} Array of all user objects
   */
  async getAllUsers(): Promise<IUser[]> {
    return this.knexService.knex('user').select('*');
  }

  /**
   * Checks if a user is registered in the system
   * @param {string | null} userId - The Telegram user ID to check
   * @returns {Promise<boolean>} True if the user is registered
   */
  async isUserRegistered(userId: string | null): Promise<boolean> {
    if (!userId) {
      return false;
    }

    const user: IUser | undefined = await this.knexService
      .knex<IUser>('user')
      .where({ telegram_id: userId })
      .first();
    return !!user;
  }

  /**
   * Finds a user by their Telegram ID
   * @param {string} userId - The Telegram user ID to find
   * @returns {Promise<IUser | undefined>} The found user or undefined
   */
  async findUser(userId: string): Promise<IUser | undefined> {
    return this.knexService.knex<IUser>('user').where({ telegram_id: userId }).first();
  }

  /**
   * Updates a specific field for a user
   * @param {string} telegram_id - The Telegram user ID
   * @param {string} field - The field to update
   * @param {string} value - The new value
   * @returns {Promise<void>}
   */
  async updateUserField(telegram_id: string, field: string, value: string): Promise<void> {
    await this.knexService
      .knex('user')
      .where({ telegram_id })
      .update({ [field]: value });
  }

  /**
   * Creates or updates a user in the database
   * @param {Partial<IUser>} userData - The user data to upsert
   * @returns {Promise<IUser>} The created or updated user
   */
  async upsertUser(userData: {
    telegram_id: string;
    telegram_username?: string;
    telegram_name?: string;
  }): Promise<IUser> {
    const existingUser = await this.findUser(userData.telegram_id);

    if (existingUser) {
      // Update existing user
      await this.knexService
        .knex('user')
        .where({ telegram_id: userData.telegram_id })
        .update({
          username: userData.telegram_username,
          tg_first_name: userData.telegram_name,
          updated_at: new Date(),
        });
      return {
        ...existingUser,
        username: userData.telegram_username ?? existingUser.username,
        tg_first_name: userData.telegram_name ?? existingUser.tg_first_name,
      };
    } else {
      // Create new user
      const newUser: Partial<IUser> = {
        telegram_id: userData.telegram_id,
        username: userData.telegram_username ?? null,
        tg_first_name: userData.telegram_name ?? null,
        tg_last_name: null,
      };
      await this.knexService.knex<IUser>('user').insert(newUser);
      return newUser as IUser;
    }
  }
}
