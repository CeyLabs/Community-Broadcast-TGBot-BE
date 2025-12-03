/**
 * @fileoverview Interface definitions for the group module
 * @module group.interface
 */

/**
 * Interface representing a community group
 * @interface IGroup
 * @description Defines the structure of a community group for broadcast messages
 * Groups can belong to either a subcategory directly OR a group_category (nested under subcategory)
 */
export interface IGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Telegram group ID (chat ID) */
  group_id: string;
  /** Telegram invite link for the group */
  telegram_link: string;
  /**
   * Foreign key to subcategory table (for direct groups like Other, Clients)
   * Mutually exclusive with group_category_id
   */
  subcategory_id?: string | null;
  /**
   * Foreign key to group_category table (for nested groups like Ceylon Cash, Community under Sri Lanka)
   * Mutually exclusive with subcategory_id
   */
  group_category_id?: string | null;
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

/**
 * Interface for creating a new group
 * @interface ICreateGroup
 * @description Defines the required and optional fields for creating a new group
 */
export interface ICreateGroup {
  /** Display name of the group (required) */
  name: string;
  /** Telegram group ID (chat ID) (required) */
  group_id: string;
  /** Telegram invite link for the group (optional) */
  telegram_link?: string;
  /** Foreign key to subcategory table (optional) */
  subcategory_id?: string | null;
  /** Foreign key to group_category table (optional) */
  group_category_id?: string | null;
}

/**
 * Interface for group with joined hierarchy information
 * @interface IGroupWithHierarchy
 */
export interface IGroupWithHierarchy extends IGroup {
  /** Subcategory name (if directly under subcategory) */
  subcategory_name?: string | null;
  /** Group category name (if under group_category) */
  group_category_name?: string | null;
  /** Parent subcategory name (via group_category) */
  parent_subcategory_name?: string | null;
}
