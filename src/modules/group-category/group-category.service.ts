/**
 * @fileoverview Service for managing group categories
 * @module group-category.service
 */

import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { IGroupCategory, IGroupCategoryWithCount } from './group-category.interface';

/**
 * Service for managing group category data and operations
 * @class GroupCategoryService
 * @description Handles group category-related operations (Ceylon Cash, Community)
 */
@Injectable()
export class GroupCategoryService {
  constructor(private readonly knexService: KnexService) {}

  /**
   * Retrieves all group categories from the database
   * @returns {Promise<IGroupCategory[]>} Array of all group categories
   */
  async getAllGroupCategories(): Promise<IGroupCategory[]> {
    return this.knexService.knex<IGroupCategory>('group_category').select('*');
  }

  /**
   * Retrieves all group categories by subcategory ID
   * @param {string} subcategoryId - The parent subcategory ID
   * @returns {Promise<IGroupCategory[]>} Array of group categories
   */
  async getGroupCategoriesBySubcategoryId(subcategoryId: string): Promise<IGroupCategory[]> {
    return this.knexService
      .knex<IGroupCategory>('group_category')
      .where({ subcategory_id: subcategoryId })
      .select('*');
  }

  /**
   * Retrieves all group categories by subcategory ID with group counts
   * @param {string} subcategoryId - The parent subcategory ID
   * @returns {Promise<IGroupCategoryWithCount[]>} Array of group categories with group counts
   */
  async getGroupCategoriesWithCountBySubcategoryId(
    subcategoryId: string,
  ): Promise<IGroupCategoryWithCount[]> {
    const groupCategories = await this.getGroupCategoriesBySubcategoryId(subcategoryId);
    const result: IGroupCategoryWithCount[] = [];

    for (const groupCategory of groupCategories) {
      const count = await this.getGroupCount(groupCategory.id);
      result.push({ ...groupCategory, group_count: count });
    }

    return result;
  }

  /**
   * Gets the group count for a group category
   * @param {string} groupCategoryId - The group category ID
   * @returns {Promise<number>} The group count
   */
  async getGroupCount(groupCategoryId: string): Promise<number> {
    const result = await this.knexService
      .knex('group')
      .where({ group_category_id: groupCategoryId })
      .count('id as count')
      .first<{ count: string }>();
    return Number(result?.count || 0);
  }

  /**
   * Retrieves a group category by its ID
   * @param {string} id - The ID of the group category
   * @returns {Promise<IGroupCategory | undefined>} The group category or undefined
   */
  async getGroupCategoryById(id: string): Promise<IGroupCategory | undefined> {
    return this.knexService.knex<IGroupCategory>('group_category').where({ id }).first();
  }

  /**
   * Retrieves a group category by its name and subcategory ID
   * @param {string} name - The name of the group category
   * @param {string} subcategoryId - The parent subcategory ID
   * @returns {Promise<IGroupCategory | undefined>} The group category or undefined
   */
  async getGroupCategoryByNameAndSubcategory(
    name: string,
    subcategoryId: string,
  ): Promise<IGroupCategory | undefined> {
    return this.knexService
      .knex<IGroupCategory>('group_category')
      .where({ name, subcategory_id: subcategoryId })
      .first();
  }

  /**
   * Creates a new group category
   * @param {Partial<IGroupCategory>} groupCategoryData - The group category data to insert
   * @returns {Promise<IGroupCategory>} The created group category
   */
  async createGroupCategory(groupCategoryData: Partial<IGroupCategory>): Promise<IGroupCategory> {
    const [groupCategory] = await this.knexService
      .knex<IGroupCategory>('group_category')
      .insert(groupCategoryData)
      .returning('*');
    return groupCategory;
  }

  /**
   * Alias for getGroupCategoriesBySubcategoryId - used by broadcast service
   * @param {string} subcategoryId - The parent subcategory ID
   * @returns {Promise<IGroupCategory[]>} Array of group categories
   */
  async getBySubcategory(subcategoryId: string): Promise<IGroupCategory[]> {
    return this.getGroupCategoriesBySubcategoryId(subcategoryId);
  }

  /**
   * Alias for getGroupCategoryById - used by broadcast service
   * @param {string} id - The ID of the group category
   * @returns {Promise<IGroupCategory | undefined>} The group category or undefined
   */
  async getById(id: string): Promise<IGroupCategory | undefined> {
    return this.getGroupCategoryById(id);
  }

  /**
   * Updates a group category
   * @param {string} id - The group category ID to update
   * @param {Partial<IGroupCategory>} groupCategoryData - The group category data to update
   * @returns {Promise<IGroupCategory | undefined>} The updated group category
   */
  async updateGroupCategory(
    id: string,
    groupCategoryData: Partial<IGroupCategory>,
  ): Promise<IGroupCategory | undefined> {
    const [groupCategory] = await this.knexService
      .knex<IGroupCategory>('group_category')
      .where({ id })
      .update({ ...groupCategoryData, updated_at: new Date() })
      .returning('*');
    return groupCategory;
  }

  /**
   * Deletes a group category
   * @param {string} id - The group category ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteGroupCategory(id: string): Promise<boolean> {
    const deleted = await this.knexService
      .knex<IGroupCategory>('group_category')
      .where({ id })
      .delete();
    return deleted > 0;
  }
}
