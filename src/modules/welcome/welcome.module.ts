/**
 * @fileoverview Welcome module for handling user onboarding and initial interactions
 * @module welcome.module
 */

import { forwardRef, Module } from '@nestjs/common';
import { WelcomeService } from './welcome.service';
import { WelcomeController } from './welcome.controller';
import { GroupModule } from '../group/group.module';
import { UserModule } from '../user/user.module';
import { CommonModule } from '../common/common.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { GroupRegistrationModule } from '../group-registration/group-registration.module';

/**
 * Module that handles the welcome flow and basic bot interactions
 * @class WelcomeModule
 * @description Manages welcome interactions and group registration
 */
@Module({
  imports: [
    GroupModule,
    UserModule,
    BroadcastModule,
    GroupRegistrationModule,
    forwardRef(() => CommonModule),
  ],
  providers: [WelcomeService],
  controllers: [WelcomeController],
  exports: [WelcomeService],
})
export class WelcomeModule {}
