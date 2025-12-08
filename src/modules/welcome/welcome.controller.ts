/**
 * @fileoverview Controller for handling welcome-related Telegram bot commands and events
 * @module welcome.controller
 */

import { Controller } from '@nestjs/common';
import { Context } from 'telegraf';
import { On, Update } from 'nestjs-telegraf';
import { WelcomeService } from './welcome.service';
import { GroupRegistrationService } from '../group-registration/group-registration.service';

/**
 * Controller class that handles all welcome-related bot interactions
 * @class WelcomeController
 * @description Manages user commands and events related to the welcome flow,
 * including start command, group management, and bot status changes
 */
@Update()
@Controller()
export class WelcomeController {
  constructor(
    private readonly welcomeService: WelcomeService,
    private readonly groupRegistrationService: GroupRegistrationService,
  ) {}

  /**
   * Handles the /start command from users
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  async startCommand(ctx: Context): Promise<void> {
    await this.welcomeService.handleStartCommand(ctx);
  }

  /**
   * Handles callback queries from inline keyboards
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  async handleCallbackQuery(ctx: Context): Promise<void> {
    await this.welcomeService.handleCallbackQuery(ctx);
  }

  /**
   * Handles private chat messages
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  async handlePrivateChat(ctx: Context): Promise<void> {
    await this.welcomeService.handlePrivateChat(ctx);
  }

  /**
   * Handles bot added to group (my_chat_member event)
   * Automatically registers the group in the database
   * @param {Context} ctx - The Telegraf context object
   * @returns {Promise<void>}
   */
  @On('my_chat_member')
  async handleMyChatMember(ctx: Context): Promise<void> {
    const myChatMember = (ctx.update as any).my_chat_member;
    if (!myChatMember) return;

    const { status } = myChatMember;

    // Bot was added to group
    if (status === 'member' || status === 'administrator') {
      await this.groupRegistrationService.handleGroupRegistration(ctx);
    }
    // Bot was removed from group
    else if (status === 'left' || status === 'kicked') {
      await this.groupRegistrationService.handleGroupRemoval(ctx);
    }
  }
}
