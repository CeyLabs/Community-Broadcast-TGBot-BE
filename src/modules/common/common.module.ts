/**
 * @fileoverview Common module for shared functionality across the application
 * @module common.module
 */

import { forwardRef, Module } from '@nestjs/common';
import { WelcomeModule } from '../welcome/welcome.module';
import { GroupModule } from '../group/group.module';
import { CommonService } from './common.service';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { UserModule } from '../user/user.module';

/**
 * Module for shared functionality across the application
 * @class CommonModule
 * @description Provides common services and utilities used by other modules,
 * including user state management and shared functionality
 */
@Module({
  imports: [
    forwardRef(() => WelcomeModule),
    GroupModule,
    forwardRef(() => BroadcastModule),
    UserModule,
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
