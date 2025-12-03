/**
 * @fileoverview Service for handling welcome-related functionality in the Telegram bot
 * @module welcome.service
 */

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { UserService } from '../user/user.service';
import { CommonService } from '../common/common.service';
import { GroupService } from '../group/group.service';
import { getContextTelegramUserId } from 'src/utils/context';
import { TelegramLogger } from 'src/utils/telegram-logger';

/**
 * Service class that handles all welcome-related functionality
 * @class WelcomeService
 * @description Manages user welcome messages and basic bot interactions
 */
@Update()
@Injectable()
export class WelcomeService {
  constructor(
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    @Inject(forwardRef(() => CommonService))
    private readonly commonService: CommonService,
  ) {}

  /**
   * Handles the /start command from users
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @Start()
  async handleStartCommand(ctx: Context) {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    const groupCount = await this.groupService.getGroupCount();

    if (isAdmin) {
      await ctx.replyWithMarkdownV2(
        `👋 *Welcome Admin\\!*\n\n` +
          `This bot allows you to broadcast messages to all community groups\\.\n\n` +
          `📊 *Total Groups:* ${groupCount}\n\n` +
          `*Available Commands:*\n` +
          `• /broadcast \\- Create and send broadcast messages\n` +
          `• /help \\- Show help menu\n` +
          `• /groups \\- List all registered groups`,
      );
    } else {
      await ctx.replyWithMarkdownV2(
        `👋 *Welcome\\!*\n\n` +
          `This bot is used by administrators to broadcast messages to community groups\\.\n\n` +
          `If you're an admin and need access, please contact the bot owner\\.`,
      );
    }
  }

  /**
   * Check if a user is an admin
   * @param {string} userId - The user's Telegram ID
   * @returns {Promise<boolean>} Whether the user is an admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    const adminIds = process.env.ADMIN_IDS?.split(',').map(id => id.trim()) || [];
    return adminIds.includes(userId);
  }

  /**
   * Handles the /groups command - lists all registered groups
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @Command('groups')
  async handleGroupsCommand(@Ctx() ctx: Context) {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.reply('❌ You do not have permission to view groups.');
      return;
    }

    try {
      const groups = await this.groupService.getAllGroups();

      if (groups.length === 0) {
        await ctx.replyWithMarkdownV2(
          `📋 *Registered Groups*\n\n` +
            `No groups registered yet\\.\n\n` +
            `Add the bot to groups to register them automatically\\.`,
        );
        return;
      }

      const groupList = groups
        .slice(0, 50) // Limit to first 50 groups
        .map((g, i) => `${i + 1}\\. ${this.escapeMarkdown(g.name)}`)
        .join('\n');

      const totalGroups = groups.length;
      const shownGroups = Math.min(totalGroups, 50);

      await ctx.replyWithMarkdownV2(
        `📋 *Registered Groups* \\(${shownGroups}/${totalGroups}\\)\n\n` +
          `${groupList}` +
          (totalGroups > 50 ? `\n\n_\\.\\.\\. and ${totalGroups - 50} more groups_` : ''),
      );
    } catch (error) {
      await TelegramLogger.error('Error fetching groups', error, userId);
      await ctx.reply('❌ Error fetching groups. Please try again.');
    }
  }

  /**
   * Handles new member join events in groups - registers the group
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @On('new_chat_members')
  async handleNewMember(ctx: Context) {
    const { message } = ctx;

    if (!message || !('new_chat_members' in message) || !ctx.chat) {
      return;
    }

    // Check if the bot itself was added to a group
    const botId = ctx.botInfo?.id;
    const botWasAdded = message.new_chat_members.some(member => member.id === botId);

    if (botWasAdded && ctx.chat.type !== 'private') {
      const chatId = String(ctx.chat.id);
      const chatTitle = 'title' in ctx.chat ? ctx.chat.title : 'Unknown Group';

      try {
        // Check if group already exists
        const existingGroup = await this.groupService.getGroupByGroupId(chatId);

        if (!existingGroup) {
          // Register the new group
          await this.groupService.createGroup({
            name: chatTitle,
            group_id: chatId,
            telegram_link: null,
          });

          await TelegramLogger.info(`New group registered: ${chatTitle} (${chatId})`);

          await ctx.reply(
            `✅ Group "${chatTitle}" has been registered for broadcasts!\n\n` +
              `This group will now receive broadcast messages from admins.`,
          );
        }
      } catch (error) {
        await TelegramLogger.error(`Error registering group: ${chatId}`, error);
      }
    }
  }

  /**
   * Handles chat title changes - updates group name
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @On('new_chat_title')
  async handleTitleChange(ctx: Context) {
    if (!ctx.chat || ctx.chat.type === 'private') return;

    const chatId = String(ctx.chat.id);
    const newTitle = 'title' in ctx.chat ? ctx.chat.title : null;

    if (!newTitle) return;

    try {
      const existingGroup = await this.groupService.getGroupByGroupId(chatId);
      if (existingGroup) {
        await this.groupService.updateGroup(existingGroup.id, { name: newTitle });
        await TelegramLogger.info(`Group name updated: ${newTitle} (${chatId})`);
      }
    } catch (error) {
      await TelegramLogger.error(`Error updating group name: ${chatId}`, error);
    }
  }

  /**
   * Handles when bot is removed from a group
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @On('left_chat_member')
  async handleLeftMember(ctx: Context) {
    const { message } = ctx;

    if (!message || !('left_chat_member' in message) || !ctx.chat) {
      return;
    }

    // Check if the bot was removed from the group
    const botId = ctx.botInfo?.id;
    if (message.left_chat_member.id === botId && ctx.chat.type !== 'private') {
      const chatId = String(ctx.chat.id);

      try {
        const existingGroup = await this.groupService.getGroupByGroupId(chatId);
        if (existingGroup) {
          await this.groupService.deleteGroup(existingGroup.id);
          await TelegramLogger.info(`Group unregistered: ${existingGroup.name} (${chatId})`);
        }
      } catch (error) {
        await TelegramLogger.error(`Error unregistering group: ${chatId}`, error);
      }
    }
  }

  /**
   * Handles callback queries from inline keyboards
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  async handleCallbackQuery(ctx: Context) {
    const callbackData =
      ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

    if (!callbackData) {
      return;
    }

    // Handle any callback queries if needed
    await ctx.answerCbQuery();
  }

  /**
   * Handles private chat messages
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  async handlePrivateChat(ctx: Context) {
    // Most message handling is done by BroadcastService
    // This is just a fallback for unhandled messages
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.reply(
        'This bot is for administrators only. Use /start to learn more.',
      );
    }
  }

  /**
   * Escapes special characters in text for MarkdownV2 formatting
   * @param {string} text - The text to escape
   * @returns {string} The escaped text
   * @private
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }
}
