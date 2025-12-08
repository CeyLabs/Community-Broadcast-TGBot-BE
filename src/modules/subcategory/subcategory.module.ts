/**
 * @fileoverview Module for subcategory management
 * @module subcategory.module
 */

import { Module } from '@nestjs/common';
import { SubcategoryService } from './subcategory.service';
import { KnexModule } from '../knex/knex.module';

/**
 * Module for managing subcategories
 * @class SubcategoryModule
 */
@Module({
  imports: [KnexModule],
  providers: [SubcategoryService],
  exports: [SubcategoryService],
})
export class SubcategoryModule {}
