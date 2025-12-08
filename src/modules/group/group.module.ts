/**
 * @fileoverview Module for managing community groups
 * @module group.module
 */

import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { KnexModule } from '../knex/knex.module';

/**
 * Module for managing community groups
 * @class GroupModule
 * @description Handles community group operations for broadcasting messages
 */
@Module({
  imports: [KnexModule],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
