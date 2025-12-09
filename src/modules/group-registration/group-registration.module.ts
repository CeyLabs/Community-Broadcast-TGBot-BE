/**
 * @fileoverview Group registration module
 * @module group-registration.module
 */

import { Module } from '@nestjs/common';
import { GroupRegistrationService } from './group-registration.service';
import { GroupModule } from '../group/group.module';
import { KnexModule } from '../knex/knex.module';

/**
 * Module for handling group registration
 * @class GroupRegistrationModule
 * @description Manages automatic group registration when bot is added to groups
 */
@Module({
  imports: [GroupModule, KnexModule],
  providers: [GroupRegistrationService],
  exports: [GroupRegistrationService],
})
export class GroupRegistrationModule {}
