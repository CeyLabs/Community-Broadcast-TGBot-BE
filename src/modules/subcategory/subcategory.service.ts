/**
 * @fileoverview Service for managing subcategories
 * @module subcategory.service
 */

import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { ISubcategory, ISubcategoryWithCount } from './subcategory.interface';

/**
 * Service for managing subcategory data and operations
 * @class SubcategoryService
 * @description Handles subcategory-related operations (Other, Sri Lanka, Clients)
 */
@Injectable()
export class SubcategoryService {
  constructor(private readonly knexService: KnexService) {}

  /**
   * Retrieves all subcategories from the database
   * @returns {Promise<ISubcategory[]>} Array of all subcategories
   */
  async getAllSubcategories(): Promise<ISubcategory[]> {
    return this.knexService.knex<ISubcategory>('subcategory').select('*');
  }

  /**
   * Retrieves all subcategories by category ID
   * @param {string} categoryId - The parent category ID
   * @returns {Promise<ISubcategory[]>} Array of subcategories
   */
  async getSubcategoriesByCategoryId(categoryId: string): Promise<ISubcategory[]> {
    return this.knexService
      .knex<ISubcategory>('subcategory')
      .where({ category_id: categoryId })
      .select('*');
  }

  /**
   * Retrieves all subcategories with their group counts
   * @returns {Promise<ISubcategoryWithCount[]>} Array of subcategories with group counts
   */
  async getSubcategoriesWithGroupCount(): Promise<ISubcategoryWithCount[]> {
    const subcategories = await this.getAllSubcategories();
    const result: ISubcategoryWithCount[] = [];

    for (const subcategory of subcategories) {
      const count = await this.getGroupCountForSubcategory(subcategory.id);
      result.push({ ...subcategory, group_count: count });
    }

    return result;
  }

  /**
   * Gets the total group count for a subcategory
   * For subcategories with group_categories, counts groups in all nested group_categories
   * For subcategories without, counts direct groups
   * @param {string} subcategoryId - The subcategory ID
   * @returns {Promise<number>} The total group count
   */
  async getGroupCountForSubcategory(subcategoryId: string): Promise<number> {
    const subcategory = await this.getSubcategoryById(subcategoryId);
    if (!subcategory) return 0;

    if (subcategory.has_group_categories) {
      // Count groups in all group_categories under this subcategory
      const result = await this.knexService
        .knex('group')
        .join('group_category', 'group.group_category_id', 'group_category.id')
        .where('group_category.subcategory_id', subcategoryId)
        .count('group.id as count')
        .first<{ count: string }>();
      return Number(result?.count || 0);
    } else {
      // Count direct groups under this subcategory
      const result = await this.knexService
        .knex('group')
        .where({ subcategory_id: subcategoryId })
        .count('id as count')
        .first<{ count: string }>();
      return Number(result?.count || 0);
    }
  }

  /**
   * Retrieves a subcategory by its ID
   * @param {string} id - The ID of the subcategory
   * @returns {Promise<ISubcategory | undefined>} The subcategory or undefined
   */
  async getSubcategoryById(id: string): Promise<ISubcategory | undefined> {
    return this.knexService.knex<ISubcategory>('subcategory').where({ id }).first();
  }

  /**
   * Retrieves a subcategory by its name
   * @param {string} name - The name of the subcategory
   * @returns {Promise<ISubcategory | undefined>} The subcategory or undefined
   */
  async getSubcategoryByName(name: string): Promise<ISubcategory | undefined> {
    return this.knexService.knex<ISubcategory>('subcategory').where({ name }).first();
  }

  /**
   * Alias for getAllSubcategories - used by broadcast service
   * @returns {Promise<ISubcategory[]>} Array of all subcategories
   */
  async getAll(): Promise<ISubcategory[]> {
    return this.getAllSubcategories();
  }

  /**
   * Alias for getSubcategoryById - used by broadcast service
   * @param {string} id - The ID of the subcategory
   * @returns {Promise<ISubcategory | undefined>} The subcategory or undefined
   */
  async getById(id: string): Promise<ISubcategory | undefined> {
    return this.getSubcategoryById(id);
  }

  /**
   * Creates a new subcategory
   * @param {Partial<ISubcategory>} subcategoryData - The subcategory data to insert
   * @returns {Promise<ISubcategory>} The created subcategory
   */
  async createSubcategory(subcategoryData: Partial<ISubcategory>): Promise<ISubcategory> {
    const [subcategory] = await this.knexService
      .knex<ISubcategory>('subcategory')
      .insert(subcategoryData)
      .returning('*');
    return subcategory;
  }

  /**
   * Updates a subcategory
   * @param {string} id - The subcategory ID to update
   * @param {Partial<ISubcategory>} subcategoryData - The subcategory data to update
   * @returns {Promise<ISubcategory | undefined>} The updated subcategory
   */
  async updateSubcategory(
    id: string,
    subcategoryData: Partial<ISubcategory>,
  ): Promise<ISubcategory | undefined> {
    const [subcategory] = await this.knexService
      .knex<ISubcategory>('subcategory')
      .where({ id })
      .update({ ...subcategoryData, updated_at: new Date() })
      .returning('*');
    return subcategory;
  }

  /**
   * Deletes a subcategory
   * @param {string} id - The subcategory ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteSubcategory(id: string): Promise<boolean> {
    const deleted = await this.knexService.knex<ISubcategory>('subcategory').where({ id }).delete();
    return deleted > 0;
  }
}
