import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PharmacyAccountsController } from './pharmacy-accounts.controller';
import { PharmacyAccountsService } from './pharmacy-accounts.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { OperatorsModule } from '../operators/operators.module';

@Module({
  imports: [OperatorsModule],
  controllers: [UsersController, PharmacyAccountsController, AccountController],
  providers: [UsersService, UsersRepository, PharmacyAccountsService, AccountService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}