/**
 * @fileoverview Service for managing category and subcategory selection via inline buttons
 * @module category-selection.service
 */

import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { CategoryService } from '../category/category.service';
import { SubcategoryService } from '../subcategory/subcategory.service';
import { GroupService } from '../group/group.service';
import { ICategory } from '../category/category.interface';
import { ISubcategory } from '../subcategory/subcategory.interface';
import { TelegramLogger } from 'src/utils/telegram-logger';

/**
 * Type for tracking group setup state
 */
interface GroupSetupState {
  groupId: string;
  messageId: number;
  currentCategoryId?: string;
  currentSubcategoryId?: string;
  step: 'awaiting_category' | 'awaiting_subcategory' | 'complete';
}

/**
 * Service for managing category/subcategory selection for groups
 * @class CategorySelectionService
 * @description Handles inline button interactions for selecting and changing group categories
 */
@Injectable()
export class CategorySelectionService {
  // Store setup states in memory (in production, use Redis or database)
  private setupStates = new Map<string, GroupSetupState>();

  constructor(
    private readonly categoryService: CategoryService,
    private readonly subcategoryService: SubcategoryService,
    private readonly groupService: GroupService,
  ) {}

  /**
   * Sends category selection message to group
   * @param {Context} ctx - Telegraf context
   * @param {string} groupId - Database group ID
   * @returns {Promise<number>} Message ID
   */
  async sendCategorySelectionMessage(ctx: Context, groupId: string): Promise<number> {
    try {
      const stateKey = `${ctx.chat?.id}`;

      const categories = await this.categoryService.getAllCategories();
      // Filter out "Other" category (it's auto-assigned)
      const selectableCategories = categories.filter(
        (c) => c.id !== '00000000-0000-0000-0001-000000000001',
      );

      if (selectableCategories.length === 0) {
        const msg = await ctx.reply(
          '✅ *Group registered in "Other" category*\n\n' +
            'No other categories available for selection at the moment\\.',
          {
            parse_mode: 'MarkdownV2',
          },
        );
        return msg.message_id;
      }

      const keyboard = Markup.inlineKeyboard(
        selectableCategories.map((cat) => Markup.button.callback(cat.name, `cat_select_${cat.id}`)),
      );

      const msg = await ctx.reply(
        '📂 *Select a Category for this Group*\n\n' +
          'Choose a category to organize this group\\.\n\n' +
          '_Currently: Other_',
        {
          ...keyboard,
          parse_mode: 'MarkdownV2',
        },
      );

      // Store state
      this.setupStates.set(stateKey, {
        groupId,
        messageId: msg.message_id,
        step: 'awaiting_category',
      });

      return msg.message_id;
    } catch (error) {
      await TelegramLogger.error('Error sending category selection message', error, undefined);
      throw error;
    }
  }

  /**
   * Handles category selection callback
   * @param {Context} ctx - Telegraf context with callback data
   * @returns {Promise<void>}
   */
  async handleCategorySelect(ctx: Context): Promise<void> {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = (ctx.callbackQuery as any).data;
      const categoryId = data.replace('cat_select_', '');
      const stateKey = `${ctx.chat?.id}`;
      const state = this.setupStates.get(stateKey);

      if (!state) {
        await ctx.answerCbQuery('Session expired, please add bot again');
        return;
      }

      // Check if category has subcategories
      const subcategories = await this.subcategoryService.getSubcategoriesByCategoryId(categoryId);

      if (subcategories && subcategories.length > 0) {
        // Show subcategories
        await this.showSubcategorySelection(ctx, categoryId, subcategories);
        state.currentCategoryId = categoryId;
        state.step = 'awaiting_subcategory';
      } else {
        // Apply category directly
        await this.applyCategory(ctx, state.groupId, categoryId, undefined);
        this.setupStates.delete(stateKey);
      }

      await ctx.answerCbQuery();
    } catch (error) {
      await TelegramLogger.error('Error handling category selection', error, undefined);
      await ctx.answerCbQuery('Error processing selection');
    }
  }

  /**
   * Shows subcategory selection options
   * @param {Context} ctx - Telegraf context
   * @param {string} categoryId - Selected category ID
   * @param {ISubcategory[]} subcategories - Available subcategories
   * @returns {Promise<void>}
   */
  private async showSubcategorySelection(
    ctx: Context,
    categoryId: string,
    subcategories: ISubcategory[],
  ): Promise<void> {
    const stateKey = `${ctx.chat?.id}`;
    const state = this.setupStates.get(stateKey);

    if (!state) return;

    const category = await this.categoryService.getCategoryById(categoryId);
    const keyboard = Markup.inlineKeyboard([
      ...subcategories.map((sub) => Markup.button.callback(sub.name, `subcat_select_${sub.id}`)),
      Markup.button.callback('↩️ Back', `cat_back_${categoryId}`),
    ]);

    await ctx.editMessageText(
      `📂 *Select a Subcategory*\n\n` +
        `Category: *${this.escapeMarkdown(category?.name || 'Unknown')}*\n\n` +
        `Choose a subcategory within this category\\.`,
      {
        ...keyboard,
        parse_mode: 'MarkdownV2',
      },
    );
  }

  /**
   * Handles subcategory selection
   * @param {Context} ctx - Telegraf context
   * @returns {Promise<void>}
   */
  async handleSubcategorySelect(ctx: Context): Promise<void> {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = (ctx.callbackQuery as any).data;
      const subcategoryId = data.replace('subcat_select_', '');
      const stateKey = `${ctx.chat?.id}`;
      const state = this.setupStates.get(stateKey);

      if (!state || !state.currentCategoryId) {
        await ctx.answerCbQuery('Session expired');
        return;
      }

      await this.applyCategory(ctx, state.groupId, state.currentCategoryId, subcategoryId);
      this.setupStates.delete(stateKey);

      await ctx.answerCbQuery('✅ Category updated');
    } catch (error) {
      await TelegramLogger.error('Error handling subcategory selection', error, undefined);
      await ctx.answerCbQuery('Error processing selection');
    }
  }

  /**
   * Handles back button
   * @param {Context} ctx - Telegraf context
   * @returns {Promise<void>}
   */
  async handleCategoryBack(ctx: Context): Promise<void> {
    try {
      await this.sendCategorySelectionMessage(
        ctx,
        this.setupStates.get(`${ctx.chat?.id}`)?.groupId || '',
      );
      await ctx.answerCbQuery();
    } catch (error) {
      await TelegramLogger.error('Error handling back button', error, undefined);
    }
  }

  /**
   * Applies category/subcategory selection to group
   * @param {Context} ctx - Telegraf context
   * @param {string} groupId - Database group ID
   * @param {string} categoryId - Selected category ID
   * @param {string | undefined} subcategoryId - Selected subcategory ID (if any)
   * @returns {Promise<void>}
   */
  private async applyCategory(
    ctx: Context,
    groupId: string,
    categoryId: string,
    subcategoryId: string | undefined,
  ): Promise<void> {
    try {
      // Update group in database
      await this.groupService.updateGroup(groupId, {
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
      } as any);

      // Get updated group with hierarchy
      const updatedGroup = await this.groupService.getGroupById(groupId);

      // Build message
      let categoryDisplay = '';
      if (subcategoryId) {
        const subcategory = await this.subcategoryService.getSubcategoryById(subcategoryId);
        const category = await this.categoryService.getCategoryById(categoryId);
        categoryDisplay =
          `${this.escapeMarkdown(category?.name || 'Unknown')} > ` +
          `${this.escapeMarkdown(subcategory?.name || 'Unknown')}`;
      } else {
        const category = await this.categoryService.getCategoryById(categoryId);
        categoryDisplay = this.escapeMarkdown(category?.name || 'Unknown');
      }

      // Show change button
      const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('🔄 Change Category', `change_cat_${groupId}`),
      ]);

      const message =
        `✅ *Category Updated*\n\n` +
        `📂 *Current Category:* ${categoryDisplay}\n\n` +
        `Group is ready to receive broadcasts in this category\\.`;

      await ctx.editMessageText(message, {
        ...keyboard,
        parse_mode: 'MarkdownV2',
      });
    } catch (error) {
      await TelegramLogger.error('Error applying category', error, undefined);
      throw error;
    }
  }

  /**
   * Handles change category request
   * @param {Context} ctx - Telegraf context
   * @returns {Promise<void>}
   */
  async handleChangeCategory(ctx: Context): Promise<void> {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = (ctx.callbackQuery as any).data;
      const groupId = data.replace('change_cat_', '');

      await this.sendCategorySelectionMessage(ctx, groupId);
      await ctx.answerCbQuery();
    } catch (error) {
      await TelegramLogger.error('Error handling change category', error, undefined);
      await ctx.answerCbQuery('Error');
    }
  }

  /**
   * Clears setup state for a group
   * @param {Context} ctx - Telegraf context
   */
  clearSetupState(ctx: Context): void {
    const stateKey = `${ctx.chat?.id}`;
    this.setupStates.delete(stateKey);
  }

  /**
   * Escapes special characters for MarkdownV2 format
   * @param {text} text - Text to escape
   * @returns {string} Escaped text
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }
}
