/**
 * @fileoverview Interface definitions for the group module
 * @module group.interface
 */

/**
 * Enum representing group categories for broadcast targeting
 * @enum GroupCategory
 */
export enum GroupCategory {
  GLOBAL = 'global',
  SRI_LANKA = 'sri_lanka',
  VIP = 'vip',
}

/**
 * Interface representing a community group
 * @interface IGroup
 * @description Defines the structure of a community group for broadcast messages
 */
export interface IGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Telegram group ID (chat ID) */
  group_id: string;
  /** Telegram invite link for the group */
  telegram_link?: string | null;
  /** Category of the group (global, sri_lanka, vip) */
  category: GroupCategory;
  /** Timestamp when the group was created */
  created_at?: Date;
  /** Timestamp when the group was last updated */
  updated_at?: Date;
}

/**
 * Interface for group data used in variable replacement
 * @interface IGroupForVars
 */
export interface IGroupForVars {
  /** Display name of the group */
  group_name: string;
  /** Telegram group ID */
  group_id?: string | null;
  /** Telegram invite link */
  telegram_link?: string | null;
}
