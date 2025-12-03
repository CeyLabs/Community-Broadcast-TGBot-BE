/**
 * @fileoverview Module for group category management
 * @module group-category.module
 */

import { Module } from '@nestjs/common';
import { GroupCategoryService } from './group-category.service';
import { KnexModule } from '../knex/knex.module';

/**
 * Module for managing group categories
 * @class GroupCategoryModule
 */
@Module({
  imports: [KnexModule],
  providers: [GroupCategoryService],
  exports: [GroupCategoryService],
})
export class GroupCategoryModule {}
