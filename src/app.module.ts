import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProtectedController } from './protected.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { CoursesModule } from './courses/courses.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { StudentCoursesModule } from './student-courses/student-courses.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PassportModule,
    NotificationsModule,
    CoursesModule,
    AssignmentsModule,
    EnrollmentModule,
    StudentCoursesModule,
    SupportModule,
  ],
  controllers: [AppController, ProtectedController],
  providers: [AppService],
})
export class AppModule {}
