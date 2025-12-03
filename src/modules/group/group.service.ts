/**
 * @fileoverview Service for managing community groups
 * @module group.service
 */

import RunCache from 'run-cache';
import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { IGroup, IGroupWithHierarchy } from './group.interface';

/**
 * Service for managing community group data and operations
 * @class GroupService
 * @description Handles group-related operations with hierarchical category support
 * Groups can belong to either subcategory (direct) or group_category (nested)
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
      .select('id', 'name', 'group_id', 'telegram_link', 'subcategory_id', 'group_category_id');

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
      .leftJoin('subcategory as s', 'g.subcategory_id', 's.id')
      .leftJoin('group_category as gc', 'g.group_category_id', 'gc.id')
      .leftJoin('subcategory as ps', 'gc.subcategory_id', 'ps.id')
      .select(
        'g.id',
        'g.name',
        'g.group_id',
        'g.telegram_link',
        'g.subcategory_id',
        'g.group_category_id',
        'g.created_at',
        'g.updated_at',
        's.name as subcategory_name',
        'gc.name as group_category_name',
        'ps.name as parent_subcategory_name',
      );

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves groups by subcategory ID (direct groups)
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
      .select('id', 'name', 'group_id', 'telegram_link', 'subcategory_id', 'group_category_id');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves groups by group category ID (nested groups)
   * @param {string} groupCategoryId - The group category ID to filter by
   * @returns {Promise<IGroup[]>} Array of groups in the group category
   */
  async getGroupsByGroupCategory(groupCategoryId: string): Promise<IGroup[]> {
    const cacheKey = `groups:group_category:${groupCategoryId}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    const groups = await this.knexService
      .knex<IGroup>('group')
      .where({ group_category_id: groupCategoryId })
      .select('id', 'name', 'group_id', 'telegram_link', 'subcategory_id', 'group_category_id');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves all groups under a subcategory including nested group categories
   * This is useful for "All Sri Lanka" broadcast that includes Ceylon Cash + Community groups
   * @param {string} subcategoryId - The subcategory ID
   * @returns {Promise<IGroup[]>} Array of all groups under subcategory (direct + nested)
   */
  async getAllGroupsUnderSubcategory(subcategoryId: string): Promise<IGroup[]> {
    const cacheKey = `groups:subcategory:all:${subcategoryId}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    // Get direct groups under subcategory
    const directGroups = await this.knexService
      .knex<IGroup>('group')
      .where({ subcategory_id: subcategoryId })
      .select('id', 'name', 'group_id', 'telegram_link', 'subcategory_id', 'group_category_id');

    // Get nested groups via group_category
    const nestedGroups = await this.knexService
      .knex<IGroup>('group as g')
      .join('group_category as gc', 'g.group_category_id', 'gc.id')
      .where('gc.subcategory_id', subcategoryId)
      .select(
        'g.id',
        'g.name',
        'g.group_id',
        'g.telegram_link',
        'g.subcategory_id',
        'g.group_category_id',
      );

    const allGroups = [...directGroups, ...nestedGroups];

    await RunCache.set({ key: cacheKey, value: JSON.stringify(allGroups) });

    return allGroups;
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
   * Gets the count of groups by group category
   * @param {string} groupCategoryId - The group category ID to count
   * @returns {Promise<number>} The number of groups in the group category
   */
  async getGroupCountByGroupCategory(groupCategoryId: string): Promise<number> {
    const result = await this.knexService
      .knex('group')
      .where({ group_category_id: groupCategoryId })
      .count('id as count')
      .first<{ count: string }>();

    return Number(result?.count || 0);
  }

  /**
   * Gets the total count of all groups under a subcategory (direct + nested)
   * @param {string} subcategoryId - The subcategory ID
   * @returns {Promise<number>} Total count of groups
   */
  async getTotalGroupCountUnderSubcategory(subcategoryId: string): Promise<number> {
    // Count direct groups
    const directCount = await this.knexService
      .knex('group')
      .where({ subcategory_id: subcategoryId })
      .count('id as count')
      .first<{ count: string }>();

    // Count nested groups via group_category
    const nestedCount = await this.knexService
      .knex('group as g')
      .join('group_category as gc', 'g.group_category_id', 'gc.id')
      .where('gc.subcategory_id', subcategoryId)
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
   * @param {Partial<IGroup>} groupData - The group data to insert
   * @returns {Promise<IGroup>} The created group
   */
  async createGroup(groupData: Partial<IGroup>): Promise<IGroup> {
    const [group] = await this.knexService.knex<IGroup>('group').insert(groupData).returning('*');

    // Clear cache
    await this.clearGroupCache();

    return group;
  }

  /**
   * Updates a group
   * @param {string} id - The group ID to update
   * @param {Partial<IGroup>} groupData - The group data to update
   * @returns {Promise<IGroup | undefined>} The updated group
   */
  async updateGroup(id: string, groupData: Partial<IGroup>): Promise<IGroup | undefined> {
    const [group] = await this.knexService
      .knex<IGroup>('group')
      .where({ id })
      .update({ ...groupData, updated_at: new Date() })
      .returning('*');

    // Clear cache
    await this.clearGroupCache();
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

    // Clear cache
    await this.clearGroupCache();
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
   * Clears all group-related cache
   * @private
   */
  private async clearGroupCache(): Promise<void> {
    await RunCache.delete('groups:all');
    await RunCache.delete('groups:all:hierarchy');
    // Note: Subcategory and group_category specific caches will need manual clearing
    // when those entities change
  }
}
