/**
 * @fileoverview Interface definitions for the group category module
 * @module group-category.interface
 */

/**
 * Interface representing a group category
 * @interface IGroupCategory
 * @description Defines the structure of a group category (e.g., Ceylon Cash, Community)
 */
export interface IGroupCategory {
  /** Unique identifier for the group category */
  id: string;
  /** Display name of the group category */
  name: string;
  /** Reference to the parent subcategory */
  subcategory_id: string;
  /** Timestamp when the group category was created */
  created_at?: Date;
  /** Timestamp when the group category was last updated */
  updated_at?: Date;
}

/**
 * Interface for group category with group count
 * @interface IGroupCategoryWithCount
 */
export interface IGroupCategoryWithCount extends IGroupCategory {
  /** Number of groups in this group category */
  group_count: number;
}
