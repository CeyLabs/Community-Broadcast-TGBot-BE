/**
 * @fileoverview Interface definitions for the category module
 * @module category.interface
 */

/**
 * Interface representing a category
 * @interface ICategory
 * @description Defines the structure of a category (e.g., Other, Sri Lanka, Clients)
 */
export interface ICategory {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Whether this category has subcategories */
  has_subcategories: boolean;
  /** Timestamp when the category was created */
  created_at?: Date;
  /** Timestamp when the category was last updated */
  updated_at?: Date;
}

/**
 * Interface representing a category with group count
 * @interface ICategoryWithCount
 */
export interface ICategoryWithCount extends ICategory {
  /** Total number of groups in this category */
  group_count: number;
}
