/**
 * @fileoverview Interface definitions for the subcategory module
 * @module subcategory.interface
 */

/**
 * Interface representing a subcategory
 * @interface ISubcategory
 * @description Defines the structure of a subcategory (e.g., Other, Sri Lanka, Clients)
 */
export interface ISubcategory {
  /** Unique identifier for the subcategory */
  id: string;
  /** Display name of the subcategory */
  name: string;
  /** Reference to the parent category */
  category_id: string;
  /** Whether this subcategory has nested group categories */
  has_group_categories: boolean;
  /** Timestamp when the subcategory was created */
  created_at?: Date;
  /** Timestamp when the subcategory was last updated */
  updated_at?: Date;
}

/**
 * Interface for subcategory with group count
 * @interface ISubcategoryWithCount
 */
export interface ISubcategoryWithCount extends ISubcategory {
  /** Number of groups in this subcategory */
  group_count: number;
}
