/**
 * @fileoverview Service for managing community groups
 * @module group.service
 */

import RunCache from 'run-cache';
import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { IGroup, IGroupWithHierarchy, ICreateGroup } from './group.interface';

/**
 * Service for managing community group data and operations
 * @class GroupService
 * @description Handles group-related operations with hierarchical category support
 * Groups can belong to either category (direct) or subcategory (nested under category)
 */
@Injectable()
export class GroupService {
  constructor(private readonly knexService: KnexService) {}

  /**
   * Retrieves all groups from the database
   * @returns {Promise<IGroup[]>} Array of all groups
   */
  async getAllGroups(): Promise<IGroup[]> {
    const cacheKey = 'groups:all';

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    const groups = await this.knexService
      .knex<IGroup>('group')
      .select('id', 'name', 'group_id', 'telegram_link', 'category_id', 'subcategory_id');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves all groups with hierarchy information (joined data)
   * @returns {Promise<IGroupWithHierarchy[]>} Array of groups with hierarchy info
   */
  async getAllGroupsWithHierarchy(): Promise<IGroupWithHierarchy[]> {
    const cacheKey = 'groups:all:hierarchy';

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroupWithHierarchy[];
    }

    const groups = await this.knexService
      .knex<IGroupWithHierarchy>('group as g')
      .leftJoin('category as c', 'g.category_id', 'c.id')
      .leftJoin('subcategory as s', 'g.subcategory_id', 's.id')
      .leftJoin('category as pc', 's.category_id', 'pc.id')
      .select(
        'g.id',
        'g.name',
        'g.group_id',
        'g.telegram_link',
        'g.category_id',
        'g.subcategory_id',
        'g.created_at',
        'g.updated_at',
        'c.name as category_name',
        's.name as subcategory_name',
        'pc.name as parent_category_name',
      );

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves groups by category ID (direct groups)
   * @param {string} categoryId - The category ID to filter by
   * @returns {Promise<IGroup[]>} Array of groups in the category
   */
  async getGroupsByCategory(categoryId: string): Promise<IGroup[]> {
    const cacheKey = `groups:category:${categoryId}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    const groups = await this.knexService
      .knex<IGroup>('group')
      .where({ category_id: categoryId })
      .select('id', 'name', 'group_id', 'telegram_link', 'category_id', 'subcategory_id');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves groups by subcategory ID (nested groups)
   * @param {string} subcategoryId - The subcategory ID to filter by
   * @returns {Promise<IGroup[]>} Array of groups in the subcategory
   */
  async getGroupsBySubcategory(subcategoryId: string): Promise<IGroup[]> {
    const cacheKey = `groups:subcategory:${subcategoryId}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    const groups = await this.knexService
      .knex<IGroup>('group')
      .where({ subcategory_id: subcategoryId })
      .select('id', 'name', 'group_id', 'telegram_link', 'category_id', 'subcategory_id');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves all groups under a category including nested subcategories
   * This is useful for "All Sri Lanka" broadcast that includes Ceylon Cash + Community groups
   * @param {string} categoryId - The category ID
   * @returns {Promise<IGroup[]>} Array of all groups under category (direct + nested)
   */
  async getAllGroupsUnderCategory(categoryId: string): Promise<IGroup[]> {
    const cacheKey = `groups:category:all:${categoryId}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    // Get direct groups under category
    const directGroups = await this.knexService
      .knex<IGroup>('group')
      .where({ category_id: categoryId })
      .select('id', 'name', 'group_id', 'telegram_link', 'category_id', 'subcategory_id');

    // Get nested groups via subcategory
    const nestedGroups = await this.knexService
      .knex<IGroup>('group as g')
      .join('subcategory as s', 'g.subcategory_id', 's.id')
      .where('s.category_id', categoryId)
      .select(
        'g.id',
        'g.name',
        'g.group_id',
        'g.telegram_link',
        'g.category_id',
        'g.subcategory_id',
      );

    const allGroups = [...directGroups, ...nestedGroups];

    await RunCache.set({ key: cacheKey, value: JSON.stringify(allGroups) });

    return allGroups;
  }

  /**
   * Gets the count of groups by category
   * @param {string} categoryId - The category ID to count
   * @returns {Promise<number>} The number of groups in the category
   */
  async getGroupCountByCategory(categoryId: string): Promise<number> {
    const result = await this.knexService
      .knex('group')
      .where({ category_id: categoryId })
      .count('id as count')
      .first<{ count: string }>();

    return Number(result?.count || 0);
  }

  /**
   * Gets the count of groups by subcategory
   * @param {string} subcategoryId - The subcategory ID to count
   * @returns {Promise<number>} The number of groups in the subcategory
   */
  async getGroupCountBySubcategory(subcategoryId: string): Promise<number> {
    const result = await this.knexService
      .knex('group')
      .where({ subcategory_id: subcategoryId })
      .count('id as count')
      .first<{ count: string }>();

    return Number(result?.count || 0);
  }

  /**
   * Gets the total count of all groups under a category (direct + nested)
   * @param {string} categoryId - The category ID
   * @returns {Promise<number>} Total count of groups
   */
  async getTotalGroupCountUnderCategory(categoryId: string): Promise<number> {
    // Count direct groups
    const directCount = await this.knexService
      .knex('group')
      .where({ category_id: categoryId })
      .count('id as count')
      .first<{ count: string }>();

    // Count nested groups via subcategory
    const nestedCount = await this.knexService
      .knex('group as g')
      .join('subcategory as s', 'g.subcategory_id', 's.id')
      .where('s.category_id', categoryId)
      .count('g.id as count')
      .first<{ count: string }>();

    return Number(directCount?.count || 0) + Number(nestedCount?.count || 0);
  }

  /**
   * Retrieves a group by its ID
   * @param {string} id - The ID of the group
   * @returns {Promise<IGroup | undefined>} The group or undefined
   */
  async getGroupById(id: string): Promise<IGroup | undefined> {
    const cacheKey = `group:id:${id}`;
    const cached = await RunCache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached as string) as IGroup;
    }

    const group = await this.knexService.knex<IGroup>('group').where({ id }).first();

    if (group) {
      await RunCache.set({ key: cacheKey, value: JSON.stringify(group) });
    }

    return group;
  }

  /**
   * Retrieves a group by its Telegram group_id
   * @param {string} groupId - The Telegram group ID
   * @returns {Promise<IGroup | undefined>} The group or undefined
   */
  async getGroupByGroupId(groupId: string): Promise<IGroup | undefined> {
    const cacheKey = `group:group_id:${groupId}`;
    const cached = await RunCache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached as string) as IGroup;
    }

    const group = await this.knexService.knex<IGroup>('group').where({ group_id: groupId }).first();

    if (group) {
      await RunCache.set({ key: cacheKey, value: JSON.stringify(group) });
    }

    return group;
  }

  /**
   * Creates a new group
   * @param {ICreateGroup} groupData - The group data to insert (name and group_id required)
   * @returns {Promise<IGroup>} The created group
   */
  async createGroup(groupData: ICreateGroup): Promise<IGroup> {
    const [group] = await this.knexService.knex<IGroup>('group').insert(groupData).returning('*');

    // Clear cache including related category/subcategory caches
    await this.clearGroupCache(group);

    return group;
  }

  /**
   * Updates a group
   * @param {string} id - The group ID to update
   * @param {Partial<IGroup>} groupData - The group data to update
   * @returns {Promise<IGroup | undefined>} The updated group
   */
  async updateGroup(id: string, groupData: Partial<IGroup>): Promise<IGroup | undefined> {
    // Get old group data to clear old relationship caches
    const oldGroup = await this.getGroupById(id);

    const [group] = await this.knexService
      .knex<IGroup>('group')
      .where({ id })
      .update({ ...groupData, updated_at: new Date() })
      .returning('*');

    // Clear cache including both old and new relationship caches
    await this.clearGroupCache(oldGroup);
    await this.clearGroupCache(group);
    await RunCache.delete(`group:id:${id}`);
    if (group?.group_id) {
      await RunCache.delete(`group:group_id:${group.group_id}`);
    }

    return group;
  }

  /**
   * Deletes a group
   * @param {string} id - The group ID to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteGroup(id: string): Promise<boolean> {
    const group = await this.getGroupById(id);
    const deleted = await this.knexService.knex<IGroup>('group').where({ id }).delete();

    // Clear cache including related category/subcategory caches
    await this.clearGroupCache(group);
    await RunCache.delete(`group:id:${id}`);
    if (group?.group_id) {
      await RunCache.delete(`group:group_id:${group.group_id}`);
    }

    return deleted > 0;
  }

  /**
   * Gets the count of all groups
   * @returns {Promise<number>} The total number of groups
   */
  async getGroupCount(): Promise<number> {
    const result = await this.knexService
      .knex('group')
      .count('id as count')
      .first<{ count: string }>();

    return Number(result?.count || 0);
  }

  /**
   * Clears all group-related cache including relationship-specific caches
   * @param {IGroup} [group] - Optional group to clear specific relationship caches
   * @private
   */
  private async clearGroupCache(group?: IGroup): Promise<void> {
    await RunCache.delete('groups:all');
    await RunCache.delete('groups:all:hierarchy');

    // Clear category-specific caches if group has category relationship
    if (group?.category_id) {
      await RunCache.delete(`groups:category:${group.category_id}`);
      await RunCache.delete(`groups:category:all:${group.category_id}`);
    }

    // Clear subcategory-specific caches if group has subcategory relationship
    if (group?.subcategory_id) {
      await RunCache.delete(`groups:subcategory:${group.subcategory_id}`);
    }
  }
}
