import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProtectedController } from './protected.controller';

@Module({
  imports: [AuthModule, UsersModule, PassportModule],
  controllers: [AppController, ProtectedController],
  providers: [AppService],
})
export class AppModule {}
