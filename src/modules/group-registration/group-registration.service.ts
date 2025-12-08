/**
 * @fileoverview Service for handling group registration when bot is added
 * @module group-registration.service
 */

import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { GroupService } from '../group/group.service';
import { CategoryService } from '../category/category.service';
import { KnexService } from '../knex/knex.service';
import { TelegramLogger } from 'src/utils/telegram-logger';

/**
 * Service for managing group registration
 * @class GroupRegistrationService
 * @description Handles automatic group registration when bot is added to a group
 */
@Injectable()
export class GroupRegistrationService {
  // ID of the "Other" category - groups are registered here by default
  private readonly OTHER_CATEGORY_ID = '00000000-0000-0000-0001-000000000001';

  constructor(
    private readonly groupService: GroupService,
    private readonly categoryService: CategoryService,
    private readonly knexService: KnexService,
  ) {}

  /**
   * Handles group registration when bot is added to a group
   * @param {Context} ctx - The Telegraf context containing chat information
   * @returns {Promise<void>}
   */
  async handleGroupRegistration(ctx: Context): Promise<void> {
    try {
      // Only process group chats
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        console.log('Skipping non-group chat or null ctx.chat');
        return;
      }

      const groupId = ctx.chat.id.toString();
      const groupName = ctx.chat.title || 'Unknown Group';
      const telegramLink = await this.getGroupInviteLink(ctx);

      // Check if group already exists
      const existingGroup = await this.groupService.getGroupByGroupId(groupId);

      if (existingGroup) {
        // Update group info if changed
        const needsUpdate =
          existingGroup.name !== groupName ||
          (telegramLink && existingGroup.telegram_link !== telegramLink);

        if (needsUpdate) {
          const updateData: any = {};
          if (existingGroup.name !== groupName) {
            updateData.name = groupName;
          }
          if (telegramLink && existingGroup.telegram_link !== telegramLink) {
            updateData.telegram_link = telegramLink;
          }

          await this.groupService.updateGroup(existingGroup.id, updateData);
          await TelegramLogger.info(
            `Group updated: ${groupName} (${groupId})`,
            undefined,
            undefined,
          );
        }
      } else {
        // Register new group in "Other" category
        await this.groupService.createGroup({
          name: groupName,
          group_id: groupId,
          telegram_link: telegramLink || undefined,
          category_id: this.OTHER_CATEGORY_ID,
          subcategory_id: null,
        });

        await TelegramLogger.info(
          `New group registered: ${groupName} (${groupId})`,
          undefined,
          undefined,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error in handleGroupRegistration:', error);
      await TelegramLogger.error(
        `Failed to register group: ${errorMessage}`,
        error,
        undefined,
      );
    }
  }

  /**
   * Handles group removal when bot is removed from a group
   * Logs the event but keeps the group data in database for historical records
   * @param {Context} ctx - The Telegraf context containing chat information
   * @returns {Promise<void>}
   */
  async handleGroupRemoval(ctx: Context): Promise<void> {
    try {
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return;
      }

      const groupId = ctx.chat.id.toString();
      const group = await this.groupService.getGroupByGroupId(groupId);

      if (group) {
        // Log the removal but keep the group data in database
        await TelegramLogger.info(
          `Bot removed from group: ${group.name} (${groupId})`,
          undefined,
          undefined,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await TelegramLogger.error(
        `Failed to log group removal: ${errorMessage}`,
        error,
        undefined,
      );
    }
  }

  /**
   * Gets the group's invite link or username
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<string | null>} The invite link or username
   * @private
   */
  private async getGroupInviteLink(ctx: Context): Promise<string | null> {
    try {
      if (!ctx.chat) return null;

      // If group has a username, use that
      if ('username' in ctx.chat && ctx.chat.username) {
        return `https://t.me/${ctx.chat.username}`;
      }

      // Try to get invite link (requires bot to be admin with invite_users permission)
      try {
        const link = await ctx.telegram.exportChatInviteLink(ctx.chat.id);
        return link;
      } catch (error) {
        // Bot doesn't have permission to create invite link
        // Return null and link can be updated manually later
        return null;
      }
    } catch (error) {
      return null;
    }
  }
}
