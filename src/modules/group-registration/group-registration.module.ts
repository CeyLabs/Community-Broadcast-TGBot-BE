/**
 * @fileoverview Group registration module
 * @module group-registration.module
 */

import { Module } from '@nestjs/common';
import { GroupRegistrationService } from './group-registration.service';
import { GroupModule } from '../group/group.module';

/**
 * Module for handling group registration
 * @class GroupRegistrationModule
 * @description Manages automatic group registration when bot is added to groups
 */
@Module({
  imports: [GroupModule],
  providers: [GroupRegistrationService],
  exports: [GroupRegistrationService],
})
export class GroupRegistrationModule {}
