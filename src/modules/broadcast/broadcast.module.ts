/**
 * @fileoverview Broadcast module for managing message broadcasting functionality
 * @module broadcast.module
 */

import { forwardRef, Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { GroupModule } from '../group/group.module';
import { BroadcastService } from './broadcast.service';
import { CommonModule } from '../common/common.module';
import { CategoryModule } from '../category/category.module';
import { SubcategoryModule } from '../subcategory/subcategory.module';

/**
 * Module for managing message broadcasting functionality
 * @class BroadcastModule
 * @description Handles broadcasting messages to community groups
 */
@Module({
  imports: [
    GroupModule,
    UserModule,
    CategoryModule,
    SubcategoryModule,
    forwardRef(() => CommonModule),
  ],
  providers: [BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
