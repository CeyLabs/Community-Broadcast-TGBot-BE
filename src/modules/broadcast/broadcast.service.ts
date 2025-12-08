/**
 * @fileoverview Service for managing message broadcasting functionality
 * @module broadcast.service
 */

import * as fs from 'fs';
import * as path from 'path';

import { v4 as uuidv4 } from 'uuid';

import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { Command, Ctx, On, Update } from 'nestjs-telegraf';
import {
  InlineKeyboardButton,
  Message,
  ReplyKeyboardMarkup,
} from 'telegraf/typings/core/types/typegram';

import { CommonService } from '../common/common.service';
import { EventDetailService } from '../event-detail/event-detail.service';
import { GroupService } from '../group/group.service';
import { IGroup, IGroupForVars } from '../group/group.interface';
import { CategoryService } from '../category/category.service';
import { SubcategoryService } from '../subcategory/subcategory.service';

import {
  IBroadcastSession,
  IPostMessage,
  IBroadcast,
  IBroadcastMessageDetail,
  IBroadcastTarget,
} from './broadcast.type';
import { KnexService } from '../knex/knex.service';
import { getContextTelegramUserId } from 'src/utils/context';
import { TelegramLogger } from 'src/utils/telegram-logger';
import { UserService } from '../user/user.service';
import { IEventDetail } from '../event-detail/event-detail.interface';

/**
 * Service for managing message broadcasting functionality
 * @class BroadcastService
 * @description Handles broadcasting messages to all community groups
 */
@Update()
@Injectable()
export class BroadcastService {
  constructor(
    private readonly eventDetailService: EventDetailService,
    private readonly groupService: GroupService,
    private readonly knexService: KnexService,
    private readonly userService: UserService,
    private readonly categoryService: CategoryService,
    private readonly subcategoryService: SubcategoryService,
    @Inject(forwardRef(() => CommonService))
    private readonly commonService: CommonService,
  ) {}

  /**
   * Handles the /broadcast command
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @Command('broadcast')
  async onBroadcast(@Ctx() ctx: Context): Promise<void> {
    const userId = getContextTelegramUserId(ctx);

    if (!userId) {
      await ctx.reply(this.escapeMarkdown('❌ User ID is undefined.'), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    // Check if user is an admin
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await TelegramLogger.info(
        `User denied access to broadcast - not an admin`,
        undefined,
        userId,
      );
      await ctx.reply(
        this.escapeMarkdown(
          '❌ You do not have access to broadcast messages. Only admins can broadcast.',
        ),
        {
          parse_mode: 'MarkdownV2',
        },
      );
      return;
    }

    // Ensure the admin user exists in the database
    await this.userService.upsertUser({
      telegram_id: userId,
      telegram_username: ctx.from?.username,
      telegram_name: ctx.from?.first_name || 'Admin',
    });

    await this.showBroadcastMenu(ctx);
  }

  /**
   * Check if a user is an admin
   * @param {string} userId - The user's Telegram ID
   * @returns {Promise<boolean>} Whether the user is an admin
   */
  private isUserAdmin(userId: string): Promise<boolean> {
    const adminIds = process.env.ADMIN_IDS?.split(',').map((id) => id.trim()) || [];
    return Promise.resolve(adminIds.includes(userId));
  }

  /**
   * Displays the broadcast menu with available options
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   * @private
   */
  private async showBroadcastMenu(ctx: Context): Promise<void> {
    try {
      const globalCount = await this.groupService.getGroupCount();
      const categories = await this.categoryService.getAllCategories();

      // Build category buttons with counts
      const categoryButtons: InlineKeyboardButton[][] = [];
      for (const category of categories) {
        const count = await this.categoryService.getGroupCountForCategory(category.id);
        categoryButtons.push([
          {
            text: `${category.name} (${count} groups)`,
            callback_data: `category_${category.id}`,
          },
        ]);
      }

      const welcomeMessage = `Hello *Admin* 👋
Here you can create and broadcast messages to community groups\\.

📊 *Total Groups:* ${globalCount}

*You can use the following variables in your broadcast messages:*\n
>\\- \`\\{group\\}\` — Group name
>\\- \`\\{event\\_name\\}\` — Event name
>\\- \`\\{start\\_date\\}\` — Event start date
>\\- \`\\{end\\_date\\}\` — Event end date
>\\- \`\\{start\\_time\\}\` — Event start time
>\\- \`\\{end\\_time\\}\` — Event end time
>\\- \`\\{timezone\\}\` — Event timezone
>\\- \`\\{location\\}\` — Event location
>\\- \`\\{address\\}\` — Event address
>\\- \`\\{year\\}\` — Event year
>\\- \`\\{unlock\\_link\\}\` — Unlock Protocol link\n

*Select a broadcast target:*
`;

      await ctx.reply(welcomeMessage, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: `🌍 Global (${globalCount} groups)`, callback_data: 'broadcast_global' }],
            ...categoryButtons,
          ],
        },
      });
    } catch (error) {
      await TelegramLogger.error(`Error displaying broadcast menu.`, error);
      await ctx.reply(this.escapeMarkdown('❌ Failed to display broadcast interface.'), {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  /**
   * Handles callback queries from inline keyboards
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  async handleCallbackQuery(ctx: Context) {
    const userId = getContextTelegramUserId(ctx);

    const callbackData =
      ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;

    if (!callbackData || !userId) {
      await TelegramLogger.error(`Invalid callback or user ID in handleCallbackQuery`, undefined);
      await ctx.answerCbQuery(this.escapeMarkdown('❌ Invalid callback or user ID'));
      return;
    }

    // Handle global broadcast selection
    if (callbackData === 'broadcast_global') {
      await this.handleGlobalSelection(ctx);
      return;
    }

    // Handle category selection (e.g., category_uuid)
    if (callbackData.startsWith('category_')) {
      await this.handleCategorySelection(ctx, callbackData);
      return;
    }

    // Handle "All in category" selection
    if (callbackData.startsWith('all_category_')) {
      await this.handleAllCategorySelection(ctx, callbackData);
      return;
    }

    // Handle subcategory selection (e.g., subcategory_uuid)
    if (callbackData.startsWith('subcategory_')) {
      await this.handleSubcategorySelection(ctx, callbackData);
      return;
    }

    if (callbackData === 'create_post') {
      await this.handleCreatePost(ctx);
      return;
    }

    if (callbackData.startsWith('msg_')) {
      await this.handleMessageAction(ctx, callbackData);
      return;
    }

    await ctx.answerCbQuery();
  }

  /**
   * Handles global broadcast selection (all groups)
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   * @private
   */
  private async handleGlobalSelection(ctx: Context): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ You do not have access to broadcast messages.');
      return;
    }

    await ctx.deleteMessage().catch(() => {});

    const groupCount = await this.groupService.getGroupCount();

    const broadcastTarget: IBroadcastTarget = {
      type: 'global',
    };

    await this.commonService.setUserState(Number(userId), {
      flow: 'broadcast',
      step: 'creating_post',
      messages: [] as IPostMessage[],
      broadcastTarget,
    });

    await ctx.reply(
      this.escapeMarkdown(
        `📢 Creating GLOBAL broadcast (${groupCount} groups)\n\n` +
          `Please send me the content you want to broadcast.\n\n` +
          `You can send:\n` +
          `• Text messages\n` +
          `• Photos with captions\n` +
          `• Videos with captions\n` +
          `• Documents\n` +
          `• Animations (GIFs)\n\n` +
          `Use the keyboard below to manage your broadcast.`,
      ),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: this.getKeyboardMarkup(),
      },
    );

    await ctx.answerCbQuery();
  }

  /**
   * Handles category selection - shows subcategories if available, otherwise starts broadcast
   * @param {Context} ctx - The Telegraf context
   * @param {string} callbackData - The callback data containing the category ID
   * @returns {Promise<void>}
   * @private
   */
  private async handleCategorySelection(ctx: Context, callbackData: string): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ You do not have access to broadcast messages.');
      return;
    }

    const categoryId = callbackData.replace('category_', '');
    const category = await this.categoryService.getCategoryById(categoryId);

    if (!category) {
      await ctx.answerCbQuery('❌ Category not found');
      return;
    }

    // Check if category has subcategories
    if (category.has_subcategories) {
      // Show subcategory options
      await ctx.deleteMessage().catch(() => {});

      const subcategories = await this.subcategoryService.getSubcategoriesByCategoryId(categoryId);
      const totalCount = await this.groupService.getTotalGroupCountUnderCategory(categoryId);

      // Build buttons for subcategories
      const buttons: InlineKeyboardButton[][] = [];

      // Add "All in [Category]" option
      buttons.push([
        {
          text: `📢 All ${category.name} (${totalCount} groups)`,
          callback_data: `all_category_${categoryId}`,
        },
      ]);

      // Add individual subcategory options
      for (const sc of subcategories) {
        const count = await this.groupService.getGroupCountBySubcategory(sc.id);
        buttons.push([
          {
            text: `${sc.name} (${count} groups)`,
            callback_data: `subcategory_${sc.id}`,
          },
        ]);
      }

      await ctx.reply(
        this.escapeMarkdown(
          `📂 ${category.name}\n\n` + `Select a subcategory or broadcast to all:`,
        ),
        {
          parse_mode: 'MarkdownV2',
          reply_markup: { inline_keyboard: buttons },
        },
      );
    } else {
      // No subcategories - start broadcast directly to category groups
      await ctx.deleteMessage().catch(() => {});

      const groupCount = await this.groupService.getGroupCountByCategory(categoryId);

      const broadcastTarget: IBroadcastTarget = {
        type: 'category',
        categoryId: category.id,
        categoryName: category.name,
      };

      await this.commonService.setUserState(Number(userId), {
        flow: 'broadcast',
        step: 'creating_post',
        messages: [] as IPostMessage[],
        broadcastTarget,
      });

      await ctx.reply(
        this.escapeMarkdown(
          `📢 Creating broadcast for ${category.name} (${groupCount} groups)\n\n` +
            `Please send me the content you want to broadcast.\n\n` +
            `You can send:\n` +
            `• Text messages\n` +
            `• Photos with captions\n` +
            `• Videos with captions\n` +
            `• Documents\n` +
            `• Animations (GIFs)\n\n` +
            `Use the keyboard below to manage your broadcast.`,
        ),
        {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        },
      );
    }

    await ctx.answerCbQuery();
  }

  /**
   * Handles "All in category" selection - broadcasts to all groups under a category
   * @param {Context} ctx - The Telegraf context
   * @param {string} callbackData - The callback data
   * @returns {Promise<void>}
   * @private
   */
  private async handleAllCategorySelection(ctx: Context, callbackData: string): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ You do not have access to broadcast messages.');
      return;
    }

    const categoryId = callbackData.replace('all_category_', '');
    const category = await this.categoryService.getCategoryById(categoryId);

    if (!category) {
      await ctx.answerCbQuery('❌ Category not found');
      return;
    }

    await ctx.deleteMessage().catch(() => {});

    const groupCount = await this.groupService.getTotalGroupCountUnderCategory(categoryId);

    const broadcastTarget: IBroadcastTarget = {
      type: 'category',
      categoryId: category.id,
      categoryName: category.name,
    };

    await this.commonService.setUserState(Number(userId), {
      flow: 'broadcast',
      step: 'creating_post',
      messages: [] as IPostMessage[],
      broadcastTarget,
    });

    await ctx.reply(
      this.escapeMarkdown(
        `📢 Creating broadcast for ALL ${category.name} groups (${groupCount} groups)\n\n` +
          `Please send me the content you want to broadcast.\n\n` +
          `You can send:\n` +
          `• Text messages\n` +
          `• Photos with captions\n` +
          `• Videos with captions\n` +
          `• Documents\n` +
          `• Animations (GIFs)\n\n` +
          `Use the keyboard below to manage your broadcast.`,
      ),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: this.getKeyboardMarkup(),
      },
    );

    await ctx.answerCbQuery();
  }

  /**
   * Handles subcategory selection for broadcast targeting
   * @param {Context} ctx - The Telegraf context
   * @param {string} callbackData - The callback data containing the subcategory ID
   * @returns {Promise<void>}
   * @private
   */
  private async handleSubcategorySelection(ctx: Context, callbackData: string): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.answerCbQuery('❌ You do not have access to broadcast messages.');
      return;
    }

    const subcategoryId = callbackData.replace('subcategory_', '');
    const subcategory = await this.subcategoryService.getSubcategoryById(subcategoryId);

    if (!subcategory) {
      await ctx.answerCbQuery('❌ Subcategory not found');
      return;
    }

    await ctx.deleteMessage().catch(() => {});

    const groupCount = await this.groupService.getGroupCountBySubcategory(subcategoryId);

    const broadcastTarget: IBroadcastTarget = {
      type: 'subcategory',
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
    };

    await this.commonService.setUserState(Number(userId), {
      flow: 'broadcast',
      step: 'creating_post',
      messages: [] as IPostMessage[],
      broadcastTarget,
    });

    await ctx.reply(
      this.escapeMarkdown(
        `📢 Creating broadcast for ${subcategory.name} (${groupCount} groups)\n\n` +
          `Please send me the content you want to broadcast.\n\n` +
          `You can send:\n` +
          `• Text messages\n` +
          `• Photos with captions\n` +
          `• Videos with captions\n` +
          `• Documents\n` +
          `• Animations (GIFs)\n\n` +
          `Use the keyboard below to manage your broadcast.`,
      ),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: this.getKeyboardMarkup(),
      },
    );

    await ctx.answerCbQuery();
  }

  /**
   * Handles the create post action
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   * @private
   */
  private async handleCreatePost(ctx: Context): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await ctx.reply(this.escapeMarkdown('❌ You do not have access to broadcast messages.'), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    await ctx.deleteMessage().catch(() => {});

    const groupCount = await this.groupService.getGroupCount();

    await this.commonService.setUserState(Number(userId), {
      flow: 'broadcast',
      step: 'creating_post',
      messages: [] as IPostMessage[],
      broadcastTarget: { type: 'global' },
    });

    await ctx.reply(
      `📢 You're broadcasting to *${groupCount} community groups*\\.\n\n` +
        `Send me one or multiple messages you want to include in the post\\. It can be anything — a text, photo, video, even a sticker\\.\n\n` +
        `You can use variables with below format within curly brackets\\.\n\n` +
        `*Eg:*\n` +
        `Hello \\{group\\} members,\n` +
        `We have an upcoming event on \\{location\\} at \\{start\\_time\\}\\.\n\n` +
        `You can register via \\- \\{unlock\\_link\\}`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: this.getKeyboardMarkup(),
      },
    );
  }

  /**
   * Gets the keyboard markup for message actions
   * @returns {Object} Keyboard markup configuration
   * @private
   */
  private getKeyboardMarkup(): ReplyKeyboardMarkup {
    return {
      keyboard: [
        [{ text: 'Delete All' }, { text: 'Preview' }],
        [{ text: 'Cancel' }, { text: 'Send' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /**
   * Handles message actions based on callback data
   * @param {Context} ctx - The Telegraf context
   * @param {string} callbackData - The callback data from the inline keyboard
   * @returns {Promise<void>}
   * @private
   */
  private async handleMessageAction(ctx: Context, callbackData: string): Promise<void> {
    if (!ctx.from?.id) {
      await ctx.answerCbQuery(this.escapeMarkdown('❌ User ID not found'));
      return;
    }

    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const session = await this.commonService.getUserState(Number(userId));
    if (!session) {
      await TelegramLogger.warning(`No active session found for user ${userId}`, undefined, userId);
      await ctx.answerCbQuery(this.escapeMarkdown('❌ No active session found.'));
      return;
    }
    session.messages = session.messages || [];

    const [action, messageIndexStr] = callbackData.split('_').slice(1);
    const index = parseInt(messageIndexStr, 10);

    if (isNaN(index) || index < 0 || index >= session.messages.length) {
      await ctx.answerCbQuery(this.escapeMarkdown('❌ Invalid message index'));
      return;
    }

    switch (action) {
      case 'media':
        await this.commonService.setUserState(Number(userId), {
          currentAction: 'attach_media',
          currentMessageIndex: index,
        });

        await ctx.reply(this.escapeMarkdown('Send me an image, GIF, or video (up to 5 MB).'), {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getCancelKeyboard(),
        });
        break;

      case 'url':
        await this.commonService.setUserState(Number(userId), {
          currentAction: 'add_url_buttons',
          currentMessageIndex: index,
        });

        await ctx.reply(
          this.escapeMarkdown(
            'Send me a list of URL buttons for the message. Please use this format:\n\n' +
              'Button text 1 - http://www.example.com/ |\n' +
              'Button text 2 - http://www.example2.com/ |\n' +
              'Button text 3 - http://www.example3.com/\n\n' +
              "Choose 'Cancel' to go back to creating the post.",
          ),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: this.getCancelKeyboard(),
          },
        );
        break;

      case 'pin': {
        const selectedMessage = session.messages[index] as IPostMessage;
        selectedMessage.isPinned = !selectedMessage.isPinned;
        await this.commonService.setUserState(Number(userId), {
          ...session,
          step: 'creating_post',
          messages: session.messages ?? [],
        });

        await ctx.answerCbQuery(
          this.escapeMarkdown(`Message pin status: ${selectedMessage.isPinned ? 'ON' : 'OFF'}`),
        );

        if (selectedMessage.messageId && ctx.chat?.id) {
          const inlineKeyboard: InlineKeyboardButton[][] = [
            ...selectedMessage.urlButtons.map((btn) => [{ text: btn.text, url: btn.url }]),
            [
              { text: 'Attach Media', callback_data: `msg_media_${index}` },
              { text: 'Add URL Buttons', callback_data: `msg_url_${index}` },
            ],
            [
              {
                text: `Pin the Message: ${selectedMessage.isPinned ? 'ON' : 'OFF'}`,
                callback_data: `msg_pin_${index}`,
              },
            ],
            [{ text: 'Delete Message', callback_data: `msg_delete_${index}` }],
          ];

          await ctx.telegram.editMessageReplyMarkup(
            ctx.chat.id,
            selectedMessage.messageId,
            undefined,
            { inline_keyboard: inlineKeyboard },
          );
        } else {
          await this.displayMessageWithActions(ctx, index, selectedMessage);
        }
        break;
      }

      case 'delete':
        session.messages.splice(index, 1);
        await this.commonService.setUserState(Number(userId), session);

        await ctx.answerCbQuery(this.escapeMarkdown('Message deleted'));
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply(this.escapeMarkdown('✅ Message deleted successfully.'), {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        });
        break;
    }
  }

  /**
   * Gets a keyboard markup with a cancel button
   * @returns {Object} Keyboard markup configuration with cancel button
   * @private
   */
  private getCancelKeyboard(): ReplyKeyboardMarkup {
    return {
      keyboard: [[{ text: 'Cancel' }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /**
   * Handles post actions such as preview, send, delete all, and cancel
   * @param {Context} ctx - The Telegraf context
   * @param {string} action - The action to perform
   * @returns {Promise<void>}
   * @private
   */
  private async handlePostActions(ctx: Context, action: string): Promise<void> {
    if (!ctx.from?.id) return;

    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const session = await this.commonService.getUserState(Number(userId));
    if (!session || !session.messages) {
      await ctx.reply(this.escapeMarkdown('❌ No messages to process.'), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    if (session.messages.length === 0 && action !== 'Cancel') {
      await ctx.reply(this.escapeMarkdown('❌ No messages to process.'), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    switch (action) {
      case 'Preview':
        await this.previewMessages(ctx, session as IBroadcastSession);
        break;

      case 'Send':
        await this.sendMessages(ctx, session as IBroadcastSession);
        break;

      case 'Delete All':
        await this.commonService.setUserState(Number(userId), {
          ...session,
          step: 'creating_post',
          messages: [],
        });
        await ctx.reply(this.escapeMarkdown('✅ All messages have been deleted.'), {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        });
        break;

      case 'Cancel':
        await this.commonService.clearUserState(Number(userId));
        await ctx.reply(this.escapeMarkdown('✅ Broadcast session cancelled.'), {
          parse_mode: 'MarkdownV2',
          reply_markup: { remove_keyboard: true },
        });
        break;
    }
  }

  /**
   * Previews messages with variables replaced for a test group
   * @param {Context} ctx - The Telegraf context
   * @param {IBroadcastSession} session - The current broadcast session
   * @returns {Promise<void>}
   * @private
   */
  private async previewMessages(ctx: Context, session: IBroadcastSession): Promise<void> {
    try {
      const userId = getContextTelegramUserId(ctx);
      if (!userId) return;

      await TelegramLogger.info(`Previewing messages for user`, undefined, userId);

      const previewGroup: IGroupForVars = {
        group_name: 'Sample Community',
        group_id: '-1001234567890',
        telegram_link: 'https://t.me/samplecommunity',
      };

      await ctx.reply(`🔍 *Preview for ${this.escapeMarkdown(previewGroup.group_name)}:*`, {
        parse_mode: 'MarkdownV2',
      });

      for (const [index, message] of session.messages.entries()) {
        const processedText = await this.replaceVars(message.text ?? '', previewGroup, true);

        const urlButtons: InlineKeyboardButton[][] = message.urlButtons.map((btn) => [
          { text: btn.text, url: btn.url },
        ]);

        const inlineKeyboard: InlineKeyboardButton[][] = [
          ...urlButtons,
          [
            { text: 'Attach Media', callback_data: `msg_media_${index}` },
            { text: 'Add URL Buttons', callback_data: `msg_url_${index}` },
          ],
          [
            {
              text: `Pin the Message: ${message.isPinned ? 'ON' : 'OFF'}`,
              callback_data: `msg_pin_${index}`,
            },
          ],
          [{ text: 'Delete Message', callback_data: `msg_delete_${index}` }],
        ];

        if (message.mediaType && message.mediaUrl) {
          const caption = this.escapeMarkdown(processedText ?? '');
          const replyMarkup = { inline_keyboard: inlineKeyboard };
          let receivedMessage;

          switch (message.mediaType) {
            case 'photo':
              if (!ctx.chat?.id) {
                throw new Error('Chat ID is undefined');
              }
              receivedMessage = await ctx.telegram.sendPhoto(ctx.chat.id, message.mediaUrl, {
                caption,
                parse_mode: 'MarkdownV2',
                reply_markup: replyMarkup,
              });
              break;
            case 'video':
              if (!ctx.chat?.id) {
                throw new Error('Chat ID is undefined');
              }
              receivedMessage = await ctx.telegram.sendVideo(ctx.chat.id, message.mediaUrl, {
                caption,
                parse_mode: 'MarkdownV2',
                reply_markup: replyMarkup,
              });
              break;
            case 'document':
              if (!ctx.chat?.id) {
                throw new Error('Chat ID is undefined');
              }
              receivedMessage = await ctx.telegram.sendDocument(ctx.chat.id, message.mediaUrl, {
                caption,
                parse_mode: 'MarkdownV2',
                reply_markup: replyMarkup,
              });
              break;
            case 'animation':
              receivedMessage = await ctx.telegram.sendAnimation(
                ctx.chat?.id ?? 0,
                message.mediaUrl,
                {
                  caption,
                  parse_mode: 'MarkdownV2',
                  reply_markup: replyMarkup,
                },
              );
              break;
          }
          if (receivedMessage && 'message_id' in receivedMessage) {
            message.messageId = (receivedMessage as { message_id: number }).message_id;
          }
        } else {
          const sentMessage = await ctx.telegram.sendMessage(
            ctx.chat?.id ??
              (() => {
                throw new Error('Chat ID is undefined');
              })(),
            this.escapeMarkdown(processedText ?? ''),
            {
              parse_mode: 'MarkdownV2',
              reply_markup: { inline_keyboard: inlineKeyboard },
            },
          );
          message.messageId = sentMessage.message_id;
        }

        session.messages[index] = message;
        if (ctx.from?.id) {
          await this.commonService.setUserState(ctx.from.id, { ...session });
        }
      }

      await ctx.reply(
        `This post will be sent to all community groups\\. Use the Send button to distribute it\\.\n\nNOTE: This is just a preview using ${this.escapeMarkdown(previewGroup.group_name)} as an example\\. The actual messages will have the appropriate group name for each group\\.`,
        {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        },
      );
    } catch {
      await ctx.reply(this.escapeMarkdown('❌ Error generating preview. Please try again.'), {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  /**
   * Sends messages to groups based on selected category
   * @param {Context} ctx - The Telegraf context
   * @param {IBroadcastSession} session - The current broadcast session
   * @returns {Promise<void>}
   * @private
   */
  private async sendMessages(ctx: Context, session: IBroadcastSession): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    await TelegramLogger.info(`Broadcasting messages initiated by user`, undefined, userId);

    let broadcastId: string;

    try {
      // Get groups based on broadcast target
      const groups = await this.getGroupsForBroadcast(session.broadcastTarget);
      const targetName = this.getBroadcastTargetDisplayName(session.broadcastTarget);

      if (groups.length === 0) {
        await ctx.reply(this.escapeMarkdown(`❌ No groups found for ${targetName}.`), {
          parse_mode: 'MarkdownV2',
        });
        return;
      }

      await ctx.reply(
        this.escapeMarkdown(
          `🚀 Starting to send messages to ${groups.length} groups (${targetName})...`,
        ),
        {
          parse_mode: 'MarkdownV2',
        },
      );

      let successCount = 0;
      let failureCount = 0;
      let progressMsgId: number | undefined = undefined;

      // Create logs directory if it doesn't exist
      const logsDir = path.join(__dirname, '../../../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      for (const message of session.messages) {
        broadcastId = uuidv4();

        // Send log file as csv
        const successEntries: string[] = [];
        const failureEntries: string[] = [];
        let csvContent = 'Group Name,Group ID,Status,Reason\n';

        // Create a single broadcast record outside the group loop
        const mediaType = message.mediaType || 'text';
        const broadcastRecord: IBroadcast = {
          message_type: mediaType,
          message_text: message.text,
          button_detail:
            message.urlButtons.length > 0
              ? JSON.stringify(
                  message.urlButtons.map((btn) => ({
                    text: btn.text,
                    url: btn.url,
                  })),
                )
              : undefined,
          attachment_detail: message.mediaUrl ? { file_id: message.mediaUrl } : undefined,
          sender_id: String(ctx.from?.id),
        };

        await this.createBroadcastRecord({
          id: broadcastId,
          ...broadcastRecord,
        });

        for (let i = 0; i < groups.length; i++) {
          const group = groups[i];

          // Skip groups without group_id
          if (!group.group_id) {
            failureCount++;
            await TelegramLogger.error(`❌ Failed: ${group.name} - No group ID`);
            continue;
          }

          const groupForVars: IGroupForVars = {
            group_name: group.name,
            group_id: group.group_id,
            telegram_link: group.telegram_link,
          };

          const processedText = await this.replaceVars(message.text ?? '', groupForVars);

          const urlButtons: InlineKeyboardButton[][] = await Promise.all(
            message.urlButtons.map(async (btn) => [
              {
                text: await this.replaceVars(btn.text, groupForVars),
                url: await this.replaceVars(btn.url, groupForVars),
              },
            ]),
          );

          const replyMarkup = urlButtons.length > 0 ? { inline_keyboard: urlButtons } : undefined;

          try {
            let sentMessage: Message;

            if (message.mediaType && message.mediaUrl) {
              switch (message.mediaType) {
                case 'photo':
                  sentMessage = await ctx.telegram.sendPhoto(group.group_id, message.mediaUrl, {
                    caption: this.escapeMarkdown(processedText ?? ''),
                    parse_mode: 'MarkdownV2',
                    reply_markup: replyMarkup,
                  });
                  break;
                case 'video':
                  sentMessage = await ctx.telegram.sendVideo(group.group_id, message.mediaUrl, {
                    caption: this.escapeMarkdown(processedText ?? ''),
                    parse_mode: 'MarkdownV2',
                    reply_markup: replyMarkup,
                  });
                  break;
                case 'document':
                  sentMessage = await ctx.telegram.sendDocument(group.group_id, message.mediaUrl, {
                    caption: this.escapeMarkdown(processedText ?? ''),
                    parse_mode: 'MarkdownV2',
                    reply_markup: replyMarkup,
                  });
                  break;
                case 'animation':
                  sentMessage = await ctx.telegram.sendAnimation(group.group_id, message.mediaUrl, {
                    caption: this.escapeMarkdown(processedText ?? ''),
                    parse_mode: 'MarkdownV2',
                    reply_markup: replyMarkup,
                  });
                  break;
                default:
                  sentMessage = await ctx.telegram.sendMessage(
                    group.group_id,
                    this.escapeMarkdown(processedText ?? ''),
                    {
                      parse_mode: 'MarkdownV2',
                      reply_markup: replyMarkup,
                    },
                  );
              }
            } else {
              sentMessage = await ctx.telegram.sendMessage(
                group.group_id,
                this.escapeMarkdown(processedText ?? ''),
                {
                  parse_mode: 'MarkdownV2',
                  reply_markup: replyMarkup,
                },
              );
            }

            // Escape any commas in the group name for CSV format
            const escapedGroupName = group.name.includes(',') ? `"${group.name}"` : group.name;

            if (message.isPinned) {
              try {
                await ctx.telegram.pinChatMessage(group.group_id, sentMessage?.message_id ?? 0, {
                  disable_notification: true,
                });
              } catch (error) {
                // Add pinning failure entry to CSV with error message
                const errorMsg = String(error).replace(/"/g, '""');
                successEntries.push(
                  `${escapedGroupName},${group.group_id || ''},Success (pin failed),"${errorMsg}"`,
                );
              }
            }

            successCount++;

            if (
              successEntries.find((entry) =>
                entry.startsWith(`${escapedGroupName},${group.group_id || ''}`),
              )
            ) {
              continue;
            }

            // Add to successful entries array
            successEntries.push(`${escapedGroupName},${group.group_id || ''},Success`);

            await this.saveMessageDetail(
              broadcastId,
              sentMessage.message_id?.toString(),
              group,
              true,
            );
          } catch (error) {
            failureCount++;

            // Escape any commas in the group name for CSV format
            const escapedGroupName = group.name.includes(',') ? `"${group.name}"` : group.name;

            // Add failure entry to CSV with error message
            const errorMsg = String(error).replace(/"/g, '""');
            failureEntries.push(`${escapedGroupName},${group.group_id || ''},Failed,"${errorMsg}"`);

            // Save the failure in the message detail
            await this.saveMessageDetail(broadcastId, undefined, group, false);
          }

          // Progress update every 10 groups or at the end
          if ((i + 1) % 10 === 0 || i === groups.length - 1) {
            const progressText = this.escapeMarkdown(
              `📊 Progress: ${i + 1}/${groups.length} groups\n` +
                `✅ Success: ${successCount}\n❌ Failed: ${failureCount}`,
            );
            if (progressMsgId) {
              try {
                await ctx.telegram.editMessageText(
                  ctx.chat?.id ?? 0,
                  progressMsgId,
                  undefined,
                  progressText,
                  { parse_mode: 'MarkdownV2' },
                );
              } catch {
                // If edit fails (e.g., message deleted), send a new one
                const sent = await ctx.reply(progressText, { parse_mode: 'MarkdownV2' });
                if ('message_id' in sent) {
                  progressMsgId = sent.message_id;
                }
              }
            } else {
              const sent = await ctx.reply(progressText, { parse_mode: 'MarkdownV2' });
              if ('message_id' in sent) {
                progressMsgId = sent.message_id;
              }
            }
          }
        }

        csvContent = `Broadcast ID: ${broadcastId}\n\n` + csvContent;
        csvContent +=
          successEntries.join('\n') +
          (successEntries.length > 0 && failureEntries.length > 0 ? '\n' : '');
        if (failureEntries.length > 0) {
          csvContent += failureEntries.join('\n');
        }

        // Add final newline if there's content
        if (successEntries.length > 0 || failureEntries.length > 0) {
          csvContent += '\n';
        }

        const logFilePath = path.join(logsDir, `broadcast-${broadcastId}-${Date.now()}.csv`);
        fs.writeFileSync(logFilePath, csvContent, 'utf8');
        await ctx.replyWithDocument({
          source: logFilePath,
          filename: `${broadcastId}.csv`,
        });

        try {
          await ctx.telegram.sendDocument(
            process.env.LOG_GROUP_ID ?? '',
            {
              source: logFilePath,
              filename: `${broadcastId}.csv`,
            },
            {
              message_thread_id: Number(process.env.LOG_THREAD_ID) || undefined,
              caption: `*📡 Broadcast ID*: \`${this.escapeMarkdown(broadcastId)}\`\n👨🏻‍💼 *Sent By*: ${this.escapeMarkdown(ctx.from?.first_name ?? 'Unknown')} [${ctx.from?.id}]\n*🕒 Sent at*: ${this.escapeMarkdown(new Date().toLocaleString())}`,
              parse_mode: 'MarkdownV2',
            },
          );
        } catch (error) {
          await TelegramLogger.error(`Error sending log file to group`, error);
        }

        // clean up the file after sending
        fs.unlinkSync(logFilePath);

        // clear progress message
        progressMsgId = undefined;

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await TelegramLogger.info(`✅ Broadcast completed successfully!`, undefined, userId);
      await ctx.reply(
        this.escapeMarkdown(
          `✅ Broadcast completed!\n\n` +
            `📊 Summary:\n` +
            `- Successfully sent ${successCount} message(s)\n` +
            `- Failed to send ${failureCount} message(s)\n\n` +
            `Check the logs for details.`,
        ),
        {
          parse_mode: 'MarkdownV2',
          reply_markup: { remove_keyboard: true },
        },
      );

      if (ctx.from?.id !== undefined) {
        await this.commonService.clearUserState(ctx.from?.id);
      }
    } catch (error) {
      await TelegramLogger.error(`Error in sendMessages`, error);
      await ctx.reply(
        this.escapeMarkdown('❌ Error sending messages. Please check the logs and try again.'),
        {
          parse_mode: 'MarkdownV2',
        },
      );
    }
  }

  /**
   * Handles broadcast messages and processes them based on the current session state
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  async handleBroadcatsMessages(ctx: Context): Promise<void> {
    if (!ctx.from?.id || !ctx.message || !('text' in ctx.message)) return;

    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const text = ctx.message.text;
    const session = await this.commonService.getUserState(Number(userId));

    if (!session || session.step !== 'creating_post') return;

    // Check variable included or not
    const hasVariable = /\{(\w+)\}/.test(text);
    let variableIncluded = false;
    if (hasVariable) {
      variableIncluded = true;
    }

    if (text === 'Cancel') {
      if (session.currentAction) {
        session.currentAction = undefined;
        session.currentMessageIndex = undefined;
        session.step = session.step ?? 'creating_post';
        await this.commonService.setUserState(Number(userId), session);
        await ctx.reply(this.escapeMarkdown('✅ Action cancelled.'), {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        });
      } else {
        await this.handlePostActions(ctx, 'Cancel');
      }
      return;
    }

    if (['Delete All', 'Preview', 'Send'].includes(text)) {
      await this.handlePostActions(ctx, text);
      return;
    }

    if (session.currentAction === 'add_url_buttons' && session.currentMessageIndex !== undefined) {
      const buttons = this.parseUrlButtons(text);
      if (
        buttons.length > 0 &&
        typeof session.currentMessageIndex === 'number' &&
        session.currentMessageIndex >= 0 &&
        session.messages &&
        session.currentMessageIndex < session.messages.length
      ) {
        (session.messages[session.currentMessageIndex] as IPostMessage).urlButtons = buttons;
        await this.commonService.setUserState(Number(userId), session);

        await ctx.reply(this.escapeMarkdown('✅ URL buttons added to your message.'), {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        });

        if (
          Array.isArray(session.messages) &&
          typeof session.currentMessageIndex === 'number' &&
          session.currentMessageIndex >= 0 &&
          session.currentMessageIndex < session.messages.length
        ) {
          await this.displayMessageWithActions(
            ctx,
            session.currentMessageIndex,
            session.messages[session.currentMessageIndex] as IPostMessage,
          );
        }

        session.currentAction = undefined;
        session.currentMessageIndex = undefined;
        session.step = session.step ?? 'creating_post';
        await this.commonService.setUserState(Number(userId), session);
      } else {
        await ctx.reply(
          this.escapeMarkdown('❌ Invalid URL button format or message index. Please try again.'),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: this.getCancelKeyboard(),
          },
        );
      }
      return;
    }

    try {
      const messageObj: IPostMessage = {
        text,
        isPinned: false,
        urlButtons: [],
        mediaUrl: null,
        mediaType: undefined,
        messageId: undefined,
      };

      if (!session.messages) {
        session.messages = [];
      }
      session.messages.push(messageObj);
      await this.commonService.setUserState(Number(userId), {
        ...session,
        step: session.step ?? 'creating_post',
      });

      const messageIndex = session.messages.length - 1;
      await this.displayMessageWithActions(ctx, messageIndex, messageObj, variableIncluded);
    } catch {
      await TelegramLogger.error(
        `Error processing message from user ${userId}: ${text}`,
        undefined,
        userId,
      );
      await ctx.reply(this.escapeMarkdown('❌ Error processing your message. Please try again.'), {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  /**
   * Displays a message with action buttons for editing
   * @param {Context} ctx - The Telegraf context
   * @param {number} index - The index of the message in the session
   * @param {IPostMessage} messageObj - The message object to display
   * @param {boolean} [variableIncluded] - Whether the message includes variables
   * @returns {Promise<void>}
   * @private
   */
  private async displayMessageWithActions(
    ctx: Context,
    index: number,
    messageObj: IPostMessage,
    variableIncluded?: boolean,
  ): Promise<void> {
    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    await TelegramLogger.info(
      `Displaying message with actions - index: ${index}, mediaType: ${messageObj.mediaType || 'none'}`,
      undefined,
      userId,
    );

    try {
      const chatId = ctx.chat?.id;
      if (!chatId) {
        throw new Error('Chat ID not found');
      }

      if (messageObj.messageId) {
        await ctx.telegram.deleteMessage(chatId, messageObj.messageId).catch(() => {});
      }

      const inlineKeyboard: InlineKeyboardButton[][] = [
        ...messageObj.urlButtons.map((btn) => [{ text: btn.text, url: btn.url }]),
        [
          { text: 'Attach Media', callback_data: `msg_media_${index}` },
          { text: 'Add URL Buttons', callback_data: `msg_url_${index}` },
        ],
        [
          {
            text: `Pin the Message: ${messageObj.isPinned ? 'ON' : 'OFF'}`,
            callback_data: `msg_pin_${index}`,
          },
        ],
        [{ text: 'Delete Message', callback_data: `msg_delete_${index}` }],
      ];

      let sentMessage: Message | null = null;
      if (messageObj.mediaType && messageObj.mediaUrl) {
        const caption = this.escapeMarkdown(messageObj.text ?? '');
        const replyMarkup = { inline_keyboard: inlineKeyboard };

        switch (messageObj.mediaType) {
          case 'photo':
            sentMessage = await ctx.telegram.sendPhoto(chatId, messageObj.mediaUrl, {
              caption,
              parse_mode: 'MarkdownV2',
              reply_markup: replyMarkup,
            });
            break;
          case 'video':
            sentMessage = await ctx.telegram.sendVideo(chatId, messageObj.mediaUrl, {
              caption,
              parse_mode: 'MarkdownV2',
              reply_markup: replyMarkup,
            });
            break;
          case 'document':
            sentMessage = await ctx.telegram.sendDocument(chatId, messageObj.mediaUrl, {
              caption,
              parse_mode: 'MarkdownV2',
              reply_markup: replyMarkup,
            });
            break;
          case 'animation':
            sentMessage = await ctx.telegram.sendAnimation(chatId, messageObj.mediaUrl, {
              caption,
              parse_mode: 'MarkdownV2',
              reply_markup: replyMarkup,
            });
            break;
        }
      } else {
        sentMessage = await ctx.telegram.sendMessage(
          chatId,
          this.escapeMarkdown(messageObj.text ?? ''),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: { inline_keyboard: inlineKeyboard },
          },
        );
      }

      if (sentMessage && 'message_id' in sentMessage) {
        messageObj.messageId = (sentMessage as { message_id: number }).message_id;
      }

      if (userId) {
        const session = await this.commonService.getUserState(Number(userId));
        if (session?.messages) {
          session.messages[index] = messageObj;
          await this.commonService.setUserState(Number(userId), session);
        }
      }

      await ctx.reply(
        this.escapeMarkdown('Please continue adding messages or use the keyboard options below.'),
        {
          parse_mode: 'MarkdownV2',
          reply_markup: this.getKeyboardMarkup(),
        },
      );

      if (variableIncluded) {
        await ctx.reply(
          '🔎 _Variables detected\\! Use "Preview" to see how they will be filled in the final broadcast\\._',
          {
            parse_mode: 'MarkdownV2',
          },
        );
      }
    } catch (error) {
      await TelegramLogger.error(
        `Error displaying message with actions for index: ${index}`,
        error,
        userId,
      );
      await ctx.reply(this.escapeMarkdown('❌ Error displaying message. Please try again.'), {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  /**
   * Parses URL buttons from text input
   * @param {string} text - The text containing URL button definitions
   * @returns {Array<{text: string, url: string}>} Array of parsed button objects
   * @private
   */
  private parseUrlButtons(text: string): { text: string; url: string }[] {
    const buttons: { text: string; url: string }[] = [];
    const buttonTexts = text
      .split(/[\n|]+/)
      .map((line) => line.trim())
      .filter((line) => line);

    for (const buttonText of buttonTexts) {
      const match = buttonText.match(/^(.*?)\s*-\s*([^\s|]+)$/i);
      if (match && match.length === 3) {
        const btnText = match[1].trim();
        let rawUrl = match[2].trim();

        if (rawUrl === '{unlock_link}') {
          rawUrl = 'https://app.unlock-protocol.com/event/{slug}';
          buttons.push({ text: btnText, url: rawUrl });
        } else if (/^https?:\/\/.+/i.test(rawUrl)) {
          try {
            new URL(rawUrl);
            buttons.push({ text: btnText, url: rawUrl });
          } catch {
            // Invalid URL, do not add to buttons
          }
        }
      }
    }
    return buttons;
  }

  /**
   * Handles photo messages
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('photo')
  async onPhoto(@Ctx() ctx: Context): Promise<void> {
    await this.handleMedia(ctx, 'photo');
  }

  /**
   * Handles video messages
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('video')
  async onVideo(@Ctx() ctx: Context): Promise<void> {
    await this.handleMedia(ctx, 'video');
  }

  /**
   * Handles document messages
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('document')
  async onDocument(@Ctx() ctx: Context): Promise<void> {
    await this.handleMedia(ctx, 'document');
  }

  /**
   * Handles animation messages
   * @param {Context} ctx - The Telegraf context
   * @returns {Promise<void>}
   */
  @On('animation')
  async onAnimation(@Ctx() ctx: Context): Promise<void> {
    await this.handleMedia(ctx, 'animation');
  }

  /**
   * Handles media messages (photo, video, document, animation)
   * @param {Context} ctx - The Telegraf context
   * @param {('photo'|'video'|'document'|'animation')} mediaType - The type of media being handled
   * @returns {Promise<void>}
   * @private
   */
  private async handleMedia(
    ctx: Context,
    mediaType: 'photo' | 'video' | 'document' | 'animation',
  ): Promise<void> {
    if (!ctx.from?.id) return;

    const userId = getContextTelegramUserId(ctx);
    if (!userId) return;

    const session = await this.commonService.getUserState(Number(userId));
    if (!session || session.step !== 'creating_post') return;

    let fileId: string | undefined;
    let text: string | null = null;

    if (
      mediaType === 'photo' &&
      ctx.message &&
      'photo' in ctx.message &&
      ctx.message.photo.length > 0
    ) {
      fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      if ('caption' in ctx.message && ctx.message.caption) {
        text = ctx.message.caption;
      }
    } else if (mediaType === 'video' && ctx.message && 'video' in ctx.message) {
      fileId = ctx.message.video.file_id;
      if ('caption' in ctx.message && ctx.message.caption) {
        text = ctx.message.caption;
      }
    } else if (mediaType === 'document' && ctx.message && 'document' in ctx.message) {
      fileId = ctx.message.document.file_id;
      if ('caption' in ctx.message && ctx.message.caption) {
        text = ctx.message.caption;
      }
    } else if (mediaType === 'animation' && ctx.message && 'animation' in ctx.message) {
      fileId = ctx.message.animation.file_id;
      if ('caption' in ctx.message && ctx.message.caption) {
        text = ctx.message.caption;
      }
    }

    if (!fileId) {
      await ctx.reply(this.escapeMarkdown('❌ Could not process the media. Please try again.'), {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    try {
      if (session.currentAction === 'attach_media' && session.currentMessageIndex !== undefined) {
        if (
          typeof session.currentMessageIndex === 'number' &&
          session.currentMessageIndex >= 0 &&
          session.messages &&
          session.currentMessageIndex < session.messages.length
        ) {
          const msg = session.messages[session.currentMessageIndex] as IPostMessage;
          msg.mediaUrl = fileId;
          msg.mediaType = mediaType;
          msg.text = text || msg.text;
        } else {
          await ctx.reply(this.escapeMarkdown('❌ Invalid message index for attaching media.'), {
            parse_mode: 'MarkdownV2',
          });
          return;
        }

        await ctx.reply(
          this.escapeMarkdown(
            `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} attached to your message.`,
          ),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: this.getKeyboardMarkup(),
          },
        );

        await this.displayMessageWithActions(
          ctx,
          session.currentMessageIndex,
          session.messages[session.currentMessageIndex] as IPostMessage,
        );

        session.currentAction = undefined;
        session.currentMessageIndex = undefined;
        await this.commonService.setUserState(Number(userId), session);
      } else {
        const messageObj: IPostMessage = {
          text,
          isPinned: false,
          urlButtons: [],
          mediaUrl: fileId,
          mediaType,
          messageId: undefined,
        };

        if (!session.messages) {
          session.messages = [];
        }
        session.messages.push(messageObj);
        await this.commonService.setUserState(Number(userId), session);

        const messageIndex = session.messages.length - 1;
        await ctx.reply(
          this.escapeMarkdown(
            `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} added to your post.`,
          ),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: this.getKeyboardMarkup(),
          },
        );

        await this.displayMessageWithActions(ctx, messageIndex, messageObj);
      }
    } catch {
      await ctx.reply(this.escapeMarkdown(`❌ Error processing ${mediaType}. Please try again.`), {
        parse_mode: 'MarkdownV2',
      });
    }
  }

  private async createBroadcastRecord(broadcast: IBroadcast): Promise<void> {
    await this.knexService.knex<IBroadcast>('broadcast').insert(broadcast);
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

  /**
   * Replaces variables in text with actual values
   * @param {string} text - The text containing variables to replace
   * @param {IGroupForVars} group - The group information
   * @param {boolean} [hardcoded=false] - Whether to use hardcoded values for preview
   * @returns {Promise<string>} The text with variables replaced
   * @private
   */
  private async replaceVars(
    text: string,
    group?: IGroupForVars,
    hardcoded: boolean = false,
  ): Promise<string> {
    let event: IEventDetail | null;

    if (hardcoded) {
      // Use hardcoded event details for preview
      event = {
        id: 'a591cf21-bec6-4a6d-909e-c89a84430de3',
        group_id: '-1001751302723',
        is_one_person: false,
        image_url: 'https://storage.unlock-protocol.com/9816d29f-e6a7-43c3-96b6-b9f1708fc81c',
        name: 'Sample Community Event',
        start_date: '2025-12-25',
        end_date: '2025-12-25',
        start_time: '18:00',
        end_time: '21:00',
        timezone: 'UTC',
        location: 'Sample Location',
        address: 'Sample Address',
        country: 'Sample Country',
        unlock_link: `app.unlock-protocol.com/event/sample-event`,
        year: 2025,
        slug: 'sample-event',
      };
    } else {
      const currentYear = new Date().getFullYear();
      event = await this.eventDetailService.getEventByYearAndGroupId(
        currentYear,
        group?.group_id ?? '',
      );
    }

    let result = text
      .replace(/{group}/gi, group?.group_name ?? '')
      .replace(/{event_name}/gi, event?.name ?? '')
      .replace(/{start_date}/gi, event?.start_date ?? '')
      .replace(/{end_date}/gi, event?.end_date ?? '')
      .replace(/{start_time}/gi, event?.start_time ?? '')
      .replace(/{end_time}/gi, event?.end_time ?? '')
      .replace(/{timezone}/gi, event?.timezone ?? '')
      .replace(/{location}/gi, event?.location ?? '')
      .replace(/{address}/gi, event?.address ?? '')
      .replace(/{year}/gi, event?.year?.toString() ?? '')
      .replace(/\$\{slug\}/gi, event?.slug ?? '')
      .replace(/{slug}/gi, event?.slug ?? '');

    // Handle unlock_link replacement with slug if available
    if (event?.slug) {
      result = result.replace(
        /{unlock_link}/gi,
        `https://app.unlock-protocol.com/event/${event.slug}`,
      );
    } else {
      result = result.replace(/{unlock_link}/gi, event?.unlock_link ?? '');
    }

    return result;
  }

  /**
   * Gets groups for broadcasting based on the target selection
   * @param {IBroadcastTarget | undefined} target - The broadcast target
   * @returns {Promise<IGroup[]>} Array of groups to broadcast to
   * @private
   */
  private async getGroupsForBroadcast(target?: IBroadcastTarget): Promise<IGroup[]> {
    if (!target || target.type === 'global') {
      // Global - all groups
      return this.groupService.getAllGroups();
    }

    if (target.type === 'category' && target.categoryId) {
      // All groups under a category (direct + nested via subcategory)
      return this.groupService.getAllGroupsUnderCategory(target.categoryId);
    }

    if (target.type === 'subcategory' && target.subcategoryId) {
      // Groups in a specific subcategory
      return this.groupService.getGroupsBySubcategory(target.subcategoryId);
    }

    // Fallback to all groups
    return this.groupService.getAllGroups();
  }

  /**
   * Gets the display name for a broadcast target
   * @param {IBroadcastTarget | undefined} target - The broadcast target
   * @returns {string} The display name
   * @private
   */
  private getBroadcastTargetDisplayName(target?: IBroadcastTarget): string {
    if (!target || target.type === 'global') {
      return '🌍 Global';
    }

    if (target.type === 'category' && target.categoryName) {
      return `📂 ${target.categoryName}`;
    }

    if (target.type === 'subcategory' && target.subcategoryName) {
      return `📁 ${target.subcategoryName}`;
    }

    return '🌍 Global';
  }

  /**
   * Save broadcast message detail to the database
   * @param {string} broadcastId - The ID of the existing broadcast record
   * @param {string | undefined} messageId - The message ID
   * @param {IGroup} group - The group the message was sent to
   * @param {boolean} isSent - Whether the message was successfully sent
   * @private
   */
  private async saveMessageDetail(
    broadcastId: string,
    messageId: string | undefined,
    group: IGroup,
    isSent: boolean,
  ): Promise<void> {
    try {
      // Insert only the broadcast message detail
      // Use group.group_id (Telegram ID), fallback to internal UUID if missing
      await this.knexService.knex<IBroadcastMessageDetail>('broadcast_message_detail').insert({
        broadcast_id: broadcastId,
        message_id: messageId,
        group_id: group.group_id ?? group.id,
        is_sent: isSent,
      });
    } catch (error) {
      await TelegramLogger.error(`Error saving broadcast detail.`, error);
    }
  }
}
