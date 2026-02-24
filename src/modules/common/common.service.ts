/**
 * @fileoverview Service for managing common functionality across the application
 * @module common.service
 */

import RunCache from 'run-cache';
import { Context } from 'telegraf';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Command, Help, On, Update } from 'nestjs-telegraf';
import { WelcomeService } from '../welcome/welcome.service';
import { BroadcastService } from '../broadcast/broadcast.service';
import { AdminNotificationService } from '../group-registration/admin-notification.service';
import { GroupService } from '../group/group.service';
import { TUserFlow, IUserState } from './common.interface';
import { getContextTelegramUserId } from 'src/utils/context';
import { TelegramLogger } from 'src/utils/telegram-logger';

/**
 * Service for managing common functionality and user state
 * @class CommonService
 * @description Handles common operations across the application, including
 * user state management, help commands, and message routing
 */
@Update()
@Injectable()
export class CommonService {
  /** Cache key prefix for user state */
  private readonly USER_STATE_PREFIX = 'user_state:';
  /** ID of the "Other" category - groups are registered here by default */
  private readonly OTHER_CATEGORY_ID = '00000000-0000-0000-0001-000000000001';

  constructor(
    @Inject(forwardRef(() => WelcomeService))
    private readonly welcomeService: WelcomeService,
    @Inject(forwardRef(() => BroadcastService))
    private readonly broadcastService: BroadcastService,
    private readonly adminNotificationService: AdminNotificationService,
    private readonly groupService: GroupService,
  ) {}

  /**
   * Handles the /help command
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @Help()
  async handleHelpCommand(ctx: Context) {
    await ctx.replyWithMarkdownV2(
      'ℹ️ *Help Menu*\n\n' +
        'Here are the commands you can use:\n\n' +
        '1\\. `/register` \\- Start the registration process\\.\n' +
        '2\\. `/profile` \\- View your profile information\\.\n' +
        '3\\. `/broadcast` \\- Broadcast messages to communities\\.\n' +
        '4\\. `/help` \\- Show this help menu\\.\n\n' +
        'If you have any questions or need further assistance, feel free to reach out\\!',
    );
  }

  /**
   * Handles the /add command in groups
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @Command('add')
  async handleAddCommand(ctx: Context) {
    try {
      // Only work in groups
      if (!ctx.chat || (ctx.chat.type !== 'group' && ctx.chat.type !== 'supergroup')) {
        return;
      }

      const groupId = ctx.chat.id.toString();
      const groupName = 'title' in ctx.chat ? ctx.chat.title : 'Unknown Group';
      const telegramLink = 'username' in ctx.chat ? `https://t.me/${ctx.chat.username}` : null;

      // Check if group already exists
      let group = await this.groupService.getGroupByGroupId(groupId);

      if (!group) {
        // Register new group in "Other" category
        await this.groupService.createGroup({
          name: groupName,
          group_id: groupId,
          telegram_link: telegramLink || undefined,
          category_id: this.OTHER_CATEGORY_ID,
          subcategory_id: null,
        });

        // Get user who executed the /add command
        const messageUpdate = (ctx.update as any).message;
        let userInfo = 'Unknown User';
        if (messageUpdate && messageUpdate.from) {
          const user = messageUpdate.from;
          const userName = user.first_name
            ? `${user.first_name} ${user.last_name || ''}`.trim()
            : `User ${user.id}`;
          userInfo = `${userName} (ID: ${user.id})`;
        }

        await TelegramLogger.info(
          `Group registered via /add command: ${groupName} (${groupId}) - Added by: ${userInfo}`,
          undefined,
          undefined,
        );

        // Get the newly created group
        group = await this.groupService.getGroupByGroupId(groupId);
      }

      // Send category selection message to admin
      if (group) {
        await this.adminNotificationService.notifyAdminGroupBotAdded(ctx, group, 'add_command');
      }

      // Try to delete the /add command message if bot is admin
      try {
        if ('message' in ctx.update && ctx.update.message) {
          const messageId = ctx.update.message.message_id;
          await ctx.deleteMessage(messageId);
        }
      } catch {
        // Silently fail if bot doesn't have permission to delete messages
        // This happens when bot is not an admin
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await TelegramLogger.error(
        `Failed to handle /add command: ${errorMessage}`,
        error,
        undefined,
      );
    }
  }

  /**
   * Handles callback queries from inline keyboards
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('callback_query')
  async handleCallbackQuery(ctx: Context) {
    try {
      const callbackData =
        ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

      // Handle category change callback: <index>_<buttonKey>
      if (callbackData && callbackData.includes('_btn_')) {
        const parts = callbackData.split('_');
        if (parts.length >= 4) {
          const categoryIndex = parseInt(parts[0], 10);
          const buttonKey = parts.slice(1).join('_');
          await this.adminNotificationService.handleCategoryChange(ctx, categoryIndex, buttonKey);
          return;
        }
      }

      // Route other callbacks to welcome service
      await this.welcomeService.handleCallbackQuery(ctx);
      await this.broadcastService.handleCallbackQuery?.(ctx);
    } catch (error) {
      console.error('Error in CommonService.handleCallbackQuery:', error);
    }
  }

  /**
   * Handles incoming messages and routes them to appropriate services
   * Also auto-registers groups when messages are received
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('message')
  async handleMessage(ctx: Context) {
    // Auto-register group if message is from a group
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      try {
        const groupId = ctx.chat.id.toString();
        const groupName = 'title' in ctx.chat ? ctx.chat.title : 'Unknown Group';

        // Check if group already exists
        const existingGroup = await this.groupService.getGroupByGroupId(groupId);

        if (!existingGroup) {
          // Register new group in "Other" category
          const telegramLink = 'username' in ctx.chat ? `https://t.me/${ctx.chat.username}` : null;

          await this.groupService.createGroup({
            name: groupName,
            group_id: groupId,
            telegram_link: telegramLink || undefined,
            category_id: this.OTHER_CATEGORY_ID,
            subcategory_id: null,
          });

          await TelegramLogger.info(
            `Group auto-registered from message: ${groupName} (${groupId})`,
            undefined,
            undefined,
          );

          // Notify admin group about auto-registration
          const group = await this.groupService.getGroupByGroupId(groupId);
          if (group) {
            await this.adminNotificationService.notifyAdminGroupBotAdded(
              ctx,
              group,
              'auto_registration',
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await TelegramLogger.error(
          `Failed to auto-register group from message: ${errorMessage}`,
          error,
          undefined,
        );
      }
      return;
    }

    // Handle private chat messages
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const state = (await this.getUserState(Number(userId))) || { flow: 'idle' as TUserFlow };

    if (state.flow === 'broadcast') {
      await this.broadcastService.handleBroadcatsMessages(ctx);
    } else if (state.flow === 'welcome') {
      await this.welcomeService.handlePrivateChat(ctx);
    } else {
      await this.welcomeService.handlePrivateChat(ctx);
    }
  }

  /**
   * Generates a cache key for user state
   * @param {number} userId - The user's Telegram ID
   * @returns {string} The cache key
   * @private
   */
  private getUserStateCacheKey(userId: number): string {
    return `${this.USER_STATE_PREFIX}${userId}`;
  }

  /**
   * Sets or updates a user's state
   * @param {number} userId - The user's Telegram ID
   * @param {Partial<IUserState>} state - The state to set or update
   */
  async setUserState(userId: number, state: Partial<IUserState>) {
    const cacheKey = this.getUserStateCacheKey(userId);
    const cachedUserState = await RunCache.get(cacheKey);

    let prev: IUserState = { flow: 'idle' as TUserFlow };

    if (cachedUserState) {
      prev = JSON.parse(cachedUserState as string) as IUserState;
    }

    const merged = { ...prev, ...state };
    if (!merged.flow) {
      merged.flow = 'idle';
    }
    await RunCache.set({ key: cacheKey, value: JSON.stringify(merged) });
  }

  /**
   * Gets a user's current state
   * @param {number} userId - The user's Telegram ID
   * @returns {IUserState | undefined} The user's state or undefined if not found
   */
  async getUserState(userId: number): Promise<IUserState | undefined> {
    const cacheKey = this.getUserStateCacheKey(userId);
    const cachedUserState = await RunCache.get(cacheKey);

    if (cachedUserState) {
      return JSON.parse(cachedUserState as string) as IUserState;
    }

    return undefined;
  }

  /**
   * Clears a user's state
   * @param {number} userId - The user's Telegram ID
   */
  async clearUserState(userId: number) {
    const cacheKey = this.getUserStateCacheKey(userId);
    await RunCache.delete(cacheKey);
  }
}
