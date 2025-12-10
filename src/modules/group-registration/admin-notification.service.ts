/**
 * @fileoverview Service for sending admin notifications when bot is added to groups
 * @module admin-notification.service
 */

import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { TelegramLogger } from 'src/utils/telegram-logger';
import { IGroup } from '../group/group.interface';
import { CategoryService } from '../category/category.service';
import { SubcategoryService } from '../subcategory/subcategory.service';
import { GroupService } from '../group/group.service';

/**
 * Service for notifying admins when bot is added to groups
 * @class AdminNotificationService
 * @description Sends detailed notifications to admin group including group info and who added the bot
 */
@Injectable()
export class AdminNotificationService {
  // Store button mapping with short keys
  private buttonMap: Map<
    string,
    {
      groupId: string;
      options: Array<{ id: string; name: string; type: 'category' | 'subcategory'; categoryId?: string }>;
    }
  > = new Map();
  private keyCounter = 0;

  constructor(
    private readonly categoryService: CategoryService,
    private readonly subcategoryService: SubcategoryService,
    private readonly groupService: GroupService,
  ) {}
  /**
   * Generates a short key for callback data storage
   * @returns {string} A short key
   * @private
   */
  private generateKey(): string {
    const key = `btn_${Date.now()}_${++this.keyCounter}`;
    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    for (const [k, v] of this.buttonMap.entries()) {
      const timestamp = parseInt(k.split('_')[1], 10);
      if (timestamp < oneHourAgo) {
        this.buttonMap.delete(k);
      }
    }
    return key;
  }
  /**
   * Sends notification to admin group when bot is added
   * @param {Context} ctx - The Telegraf context containing chat and user information
   * @param {IGroup} group - The newly registered group
   * @returns {Promise<void>}
   */
  async notifyAdminGroupBotAdded(ctx: Context, group: IGroup): Promise<void> {
    try {
      const adminGroupIdStr = process.env.ADMIN_NOTIFICATIONS_GROUP_ID;
      if (!adminGroupIdStr) {
        console.log(
          'WARN: ADMIN_NOTIFICATIONS_GROUP_ID not configured, skipping admin notification',
        );
        return;
      }

      const adminGroupId = Number(adminGroupIdStr);
      if (isNaN(adminGroupId)) {
        console.log('WARN: ADMIN_NOTIFICATIONS_GROUP_ID is not a valid number');
        return;
      }

      const myChatMember = (ctx.update as any).my_chat_member;
      if (!myChatMember) return;

      const chat = myChatMember.chat;
      const userFromGroup = myChatMember.from;

      // Determine group type
      const isPublic = chat.username ? true : false;
      const groupTypeStr = isPublic ? '🌐 Public' : '🔒 Private';
      const urlPart = isPublic ? `\n👤 Username: @${chat.username}` : '';

      // Get user info
      const userName = userFromGroup.first_name
        ? `${userFromGroup.first_name} ${userFromGroup.last_name || ''}`.trim()
        : `User ${userFromGroup.id}`;
      const userMention = `${userName} (ID: ${userFromGroup.id})`;

      // Build notification message
      const message =
        `🤖 *Bot Added to Group*\n\n` +
        `📍 *Group:* ${chat.title || 'Unknown'}\n` +
        `🔢 *Group ID:* ${chat.id.toString()}\n` +
        `${groupTypeStr}${urlPart}\n\n` +
        `👤 *Added by:* ${userMention}\n` +
        `⏰ *Time:* ${new Date().toISOString()}\n\n` +
        `📊 *Status:* Automatically registered in "Other" category\n` +
        `🔗 *Message ID:* ${group.id}`;

      try {
        // Get all categories for buttons
        const allCategories = await this.categoryService.getAllCategories();

        // Build a flat list of selectable options (categories + their subcategories)
        const selectableOptions: Array<{ id: string; name: string; type: 'category' | 'subcategory'; categoryId?: string }> = [];

        for (const category of allCategories) {
          // Skip current category
          if (category.id === group.category_id) continue;

          // Add category itself
          selectableOptions.push({
            id: category.id,
            name: `📁 ${category.name}`,
            type: 'category',
          });

          // Add subcategories if they exist
          if (category.has_subcategories) {
            const subcategories = await this.subcategoryService.getSubcategoriesByCategoryId(category.id);
            for (const subcat of subcategories) {
              selectableOptions.push({
                id: subcat.id,
                name: `   └─ ${subcat.name}`,
                type: 'subcategory',
                categoryId: category.id,
              });
            }
          }
        }

        // Create short key for button mapping
        const buttonKey = this.generateKey();
        this.buttonMap.set(buttonKey, {
          groupId: group.id,
          options: selectableOptions,
        });

        // Create buttons with short callback format: <index>_<buttonKey>
        const buttons = selectableOptions.map((opt, idx) => [
          {
            text: opt.name,
            callback_data: `${idx}_${buttonKey}`,
          },
        ]);

        await ctx.telegram.sendMessage(adminGroupId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: buttons,
          },
        });
      } catch (sendError) {
        console.error('Telegram sendMessage error:', sendError);
        throw sendError;
      }
    } catch (error) {
      await TelegramLogger.error(
        'Error notifying admin group about bot addition',
        error,
        undefined,
      );
    }
  }

  /**
   * Sends notification to admin group when bot is removed from group
   * @param {Context} ctx - The Telegraf context containing chat information
   * @returns {Promise<void>}
   */
  async notifyAdminGroupBotRemoved(ctx: Context): Promise<void> {
    try {
      const adminGroupIdStr = process.env.ADMIN_NOTIFICATIONS_GROUP_ID;
      if (!adminGroupIdStr) {
        return;
      }

      const adminGroupId = Number(adminGroupIdStr);
      if (isNaN(adminGroupId)) {
        return;
      }

      const myChatMember = (ctx.update as any).my_chat_member;
      if (!myChatMember) return;

      const chat = myChatMember.chat;

      const message =
        `❌ *Bot Removed from Group*\n\n` +
        `📍 *Group:* ${chat.title || 'Unknown'}\n` +
        `🔢 *Group ID:* ${chat.id.toString()}\n` +
        `⏰ *Time:* ${new Date().toISOString()}`;

      await ctx.telegram.sendMessage(adminGroupId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      await TelegramLogger.error('Error notifying admin group about bot removal', error, undefined);
    }
  }

  /**
   * Handles category change request from admin notification buttons
   * @param {Context} ctx - The Telegraf context
   * @param {number} optionIndex - The index of the selected option (category or subcategory)
   * @param {string} buttonKey - The button key to lookup the mapping
   * @returns {Promise<void>}
   */
  async handleCategoryChange(
    ctx: Context,
    optionIndex: number,
    buttonKey: string,
  ): Promise<void> {
    try {
      console.log('AdminNotificationService.handleCategoryChange called', {
        optionIndex,
        buttonKey,
      });

      // Get the mapping from buttonKey
      const mapping = this.buttonMap.get(buttonKey);
      console.log('Button mapping found:', !!mapping);
      if (!mapping) {
        await ctx.answerCbQuery('❌ Button data expired');
        return;
      }

      const { groupId, options } = mapping;
      console.log('Retrieved mapping:', { groupId, optionsCount: options.length });

      if (optionIndex >= options.length || optionIndex < 0) {
        await ctx.answerCbQuery('❌ Invalid option');
        return;
      }

      const selectedOption = options[optionIndex];
      console.log('Selected option:', selectedOption);

      const group = await this.groupService.getGroupById(groupId);
      if (!group) {
        console.log('Group not found:', groupId);
        await ctx.answerCbQuery('❌ Group not found');
        return;
      }

      // Update group's category/subcategory based on selection type
      if (selectedOption.type === 'category') {
        await this.groupService.updateGroup(groupId, {
          category_id: selectedOption.id,
          subcategory_id: null,
        });
      } else {
        // subcategory selected - only set subcategory_id, category_id is derived through FK
        await this.groupService.updateGroup(groupId, {
          category_id: null,
          subcategory_id: selectedOption.id,
        });
      }

      await ctx.answerCbQuery(`✅ Category updated`);

      // Edit the message to show the new category/subcategory
      let statusText = '';
      if (selectedOption.type === 'category') {
        statusText = `Registered in "${selectedOption.name.replace('📁 ', '')}" category`;
      } else {
        // Get category name for display
        const category = await this.categoryService.getCategoryById(selectedOption.categoryId!);
        statusText = `Registered in "${category?.name}" → "${selectedOption.name.trim()}"`;
      }

      const message =
        `🤖 *Bot Added to Group*\n\n` +
        `📍 *Group:* ${group.name || 'Unknown'}\n` +
        `🔢 *Group ID:* ${group.group_id.toString()}\n` +
        `${group.telegram_link ? '🌐 Public' : '🔒 Private'}\n\n` +
        `📊 *Status:* ${statusText}\n` +
        `🔗 *Message ID:* ${group.id}`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
      });

      console.log('Message updated successfully');
    } catch (error) {
      console.error('Error in handleCategoryChange:', error);
      await TelegramLogger.error('Error handling category change', error, undefined);
    }
  }
}
