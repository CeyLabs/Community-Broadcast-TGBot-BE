/**
 * @fileoverview Interface definitions for the category module
 * @module category.interface
 */

/**
 * Interface representing a root category
 * @interface ICategory
 * @description Defines the structure of a root category (e.g., Global)
 */
export interface ICategory {
  /** Unique identifier for the category */
  id: string;
  /** Display name of the category */
  name: string;
  /** Timestamp when the category was created */
  created_at?: Date;
  /** Timestamp when the category was last updated */
  updated_at?: Date;
}
