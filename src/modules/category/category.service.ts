/**
 * @fileoverview Service for managing categories
 * @module category.service
 */

import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { ICategory, ICategoryWithCount } from './category.interface';

/**
 * Service for managing category data and operations
 * @class CategoryService
 * @description Handles category-related operations (Other, Sri Lanka, Clients)
 */
@Injectable()
export class CategoryService {
  constructor(private readonly knexService: KnexService) {}

  /**
   * Retrieves all categories from the database
   * @returns {Promise<ICategory[]>} Array of all categories
   */
  async getAllCategories(): Promise<ICategory[]> {
    return this.knexService.knex<ICategory>('category').select('*');
  }

  /**
   * Retrieves all categories with their group counts
   * @returns {Promise<ICategoryWithCount[]>} Array of categories with group counts
   */
  async getCategoriesWithGroupCount(): Promise<ICategoryWithCount[]> {
    const categories = await this.getAllCategories();
    const result: ICategoryWithCount[] = [];

    for (const category of categories) {
      const count = await this.getGroupCountForCategory(category.id);
      result.push({ ...category, group_count: count });
    }

    return result;
  }

  /**
   * Gets the total group count for a category
   * For categories with subcategories, counts groups in all subcategories
   * For categories without, counts direct groups
   * @param {string} categoryId - The category ID
   * @returns {Promise<number>} The total group count
   */
  async getGroupCountForCategory(categoryId: string): Promise<number> {
    const category = await this.getCategoryById(categoryId);
    if (!category) return 0;

    if (category.has_subcategories) {
      // Count groups in all subcategories under this category
      const result = await this.knexService
        .knex('telegram_group')
        .join('subcategory', 'telegram_group.subcategory_id', 'subcategory.id')
        .where('subcategory.category_id', categoryId)
        .count('telegram_group.id as count')
        .first<{ count: string }>();
      return Number(result?.count || 0);
    } else {
      // Count direct groups under this category
      const result = await this.knexService
        .knex('telegram_group')
        .where({ category_id: categoryId })
        .count('id as count')
        .first<{ count: string }>();
      return Number(result?.count || 0);
    }
  }

  /**
   * Retrieves a category by its ID
   * @param {string} id - The ID of the category
   * @returns {Promise<ICategory | undefined>} The category or undefined
   */
  async getCategoryById(id: string): Promise<ICategory | undefined> {
    return this.knexService.knex<ICategory>('category').where({ id }).first();
  }

  /**
   * Retrieves a category by its name
   * @param {string} name - The name of the category
   * @returns {Promise<ICategory | undefined>} The category or undefined
   */
  async getCategoryByName(name: string): Promise<ICategory | undefined> {
    return this.knexService.knex<ICategory>('category').where({ name }).first();
  }

  /**
   * Creates a new category
   * @param {Partial<ICategory>} categoryData - The category data to insert
   * @returns {Promise<ICategory>} The created category
   */
  async createCategory(categoryData: Partial<ICategory>): Promise<ICategory> {
    const [category] = await this.knexService
      .knex<ICategory>('category')
      .insert(categoryData)
      .returning('*');
    return category;
  }

  /**
   * Updates a category
   * @param {string} id - The category ID to update
   * @param {Partial<ICategory>} categoryData - The category data to update
   * @returns {Promise<ICategory | undefined>} The updated category
   */
  async updateCategory(
    id: string,
    categoryData: Partial<ICategory>,
  ): Promise<ICategory | undefined> {
    const [category] = await this.knexService
      .knex<ICategory>('category')
      .where({ id })
      .update({ ...categoryData, updated_at: new Date() })
      .returning('*');
    return category;
  }

  /**
   * Deletes a category
   * @param {string} id - The category ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteCategory(id: string): Promise<boolean> {
    const deleted = await this.knexService.knex<ICategory>('category').where({ id }).delete();
    return deleted > 0;
  }
}
