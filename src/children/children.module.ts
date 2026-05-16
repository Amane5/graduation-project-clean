import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@/auth/auth.module';
@Module({
  imports: [AuthModule, JwtModule],
  controllers: [ChildrenController],
  providers: [ChildrenService]
})
export class ChildrenModule {}
