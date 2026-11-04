import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PharmacyAccountsController } from './pharmacy-accounts.controller';
import { PharmacyAccountsService } from './pharmacy-accounts.service';
import { OperatorsModule } from '../operators/operators.module';

@Module({
  imports: [OperatorsModule],
  controllers: [UsersController, PharmacyAccountsController],
  providers: [UsersService, UsersRepository, PharmacyAccountsService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}