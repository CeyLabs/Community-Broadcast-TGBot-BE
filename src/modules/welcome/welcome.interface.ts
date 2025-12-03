/**
 * @fileoverview Interfaces for the welcome module
 * @module welcome.interface
 */

/**
 * Interface for basic user data used in welcome flow
 * @interface IWelcomeUser
 */
export interface IWelcomeUser {
  /** User's Telegram ID */
  telegram_id: string;
  /** User's username */
  username?: string | null;
  /** User's first name */
  first_name?: string | null;
  /** User's last name */
  last_name?: string | null;
}
