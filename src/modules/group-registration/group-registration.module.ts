/**
 * @fileoverview Group registration module
 * @module group-registration.module
 */

import { Module } from '@nestjs/common';
import { GroupRegistrationService } from './group-registration.service';
import { AdminNotificationService } from './admin-notification.service';
import { GroupModule } from '../group/group.module';
import { CategoryModule } from '../category/category.module';
import { SubcategoryModule } from '../subcategory/subcategory.module';

/**
 * Module for handling group registration
 * @class GroupRegistrationModule
 * @description Manages automatic group registration when bot is added to groups
 */
@Module({
  imports: [GroupModule, CategoryModule, SubcategoryModule],
  providers: [GroupRegistrationService, AdminNotificationService],
  exports: [GroupRegistrationService, AdminNotificationService],
})
export class GroupRegistrationModule {}
