/**
 * @fileoverview Module for category management
 * @module category.module
 */

import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { KnexModule } from '../knex/knex.module';

/**
 * Module for managing root categories
 * @class CategoryModule
 */
@Module({
  imports: [KnexModule],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
