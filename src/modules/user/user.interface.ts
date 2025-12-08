/**
 * @fileoverview Interfaces for the user module
 * @module user.interface
 */

/**
 * Interface representing a user in the system
 * @interface IUser
 * @description Defines the structure of user data including Telegram information
 */
export interface IUser {
  /** User's Telegram ID */
  telegram_id: string | null;
  /** User's Telegram username */
  username: string | null;
  /** User's Telegram first name */
  tg_first_name: string | null;
  /** User's Telegram last name */
  tg_last_name: string | null;
}
