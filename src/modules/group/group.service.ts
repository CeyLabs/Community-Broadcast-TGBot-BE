/**
 * @fileoverview Service for managing community groups
 * @module group.service
 */

import RunCache from 'run-cache';
import { Injectable } from '@nestjs/common';
import { KnexService } from '../knex/knex.service';
import { GroupCategory, IGroup } from './group.interface';

/**
 * Service for managing community group data and operations
 * @class GroupService
 * @description Handles group-related operations, including retrieving
 * all groups, finding groups by ID or group_id, and managing group data
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
      .select('id', 'name', 'group_id', 'telegram_link', 'category');

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Retrieves groups by category
   * For 'global' category: returns ALL groups (global + sri_lanka + vip)
   * For 'sri_lanka' or 'vip' category: returns only groups with that specific category
   * @param {GroupCategory} category - The category to filter by
   * @returns {Promise<IGroup[]>} Array of groups matching the category
   */
  async getGroupsByCategory(category: GroupCategory): Promise<IGroup[]> {
    const cacheKey = `groups:category:${category}`;

    const cachedGroups = await RunCache.get(cacheKey);

    if (cachedGroups) {
      return JSON.parse(cachedGroups as string) as IGroup[];
    }

    let groups: IGroup[];

    if (category === GroupCategory.GLOBAL) {
      // Global broadcasts go to ALL groups
      groups = await this.knexService
        .knex<IGroup>('group')
        .select('id', 'name', 'group_id', 'telegram_link', 'category');
    } else {
      // Sri Lanka or VIP broadcasts go only to their specific groups
      groups = await this.knexService
        .knex<IGroup>('group')
        .where({ category })
        .select('id', 'name', 'group_id', 'telegram_link', 'category');
    }

    await RunCache.set({ key: cacheKey, value: JSON.stringify(groups) });

    return groups;
  }

  /**
   * Gets the count of groups by category
   * @param {GroupCategory} category - The category to count
   * @returns {Promise<number>} The number of groups in the category
   */
  async getGroupCountByCategory(category: GroupCategory): Promise<number> {
    if (category === GroupCategory.GLOBAL) {
      // Global includes all groups
      return this.getGroupCount();
    }

    const result = await this.knexService
      .knex('group')
      .where({ category })
      .count('id as count')
      .first<{ count: string }>();

    return Number(result?.count || 0);
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
    await RunCache.delete(`groups:category:${GroupCategory.GLOBAL}`);
    await RunCache.delete(`groups:category:${GroupCategory.SRI_LANKA}`);
    await RunCache.delete(`groups:category:${GroupCategory.VIP}`);
  }
}
