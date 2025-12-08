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
 * @description Handles subcategory-related operations (Ceylon Cash, Community under Sri Lanka)
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
   * Retrieves all subcategories by category ID with group counts
   * @param {string} categoryId - The parent category ID
   * @returns {Promise<ISubcategoryWithCount[]>} Array of subcategories with group counts
   */
  async getSubcategoriesWithCountByCategoryId(
    categoryId: string,
  ): Promise<ISubcategoryWithCount[]> {
    const subcategories = await this.getSubcategoriesByCategoryId(categoryId);
    const result: ISubcategoryWithCount[] = [];

    for (const subcategory of subcategories) {
      const count = await this.getGroupCount(subcategory.id);
      result.push({ ...subcategory, group_count: count });
    }

    return result;
  }

  /**
   * Gets the group count for a subcategory
   * @param {string} subcategoryId - The subcategory ID
   * @returns {Promise<number>} The group count
   */
  async getGroupCount(subcategoryId: string): Promise<number> {
    const result = await this.knexService
      .knex('telegram_group')
      .where({ subcategory_id: subcategoryId })
      .count('id as count')
      .first<{ count: string }>();
    return Number(result?.count || 0);
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
