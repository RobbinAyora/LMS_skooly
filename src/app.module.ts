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
import { LessonsModule } from './lessons/lessons.module';
import { ProgressModule } from './progress/progress.module';
import { UploadModule } from './upload/upload.module';
import { PrismaModule } from './prisma/prisma.module';

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
    LessonsModule,
    ProgressModule,
    UploadModule,
    PrismaModule,
  ],
  controllers: [AppController, ProtectedController],
  providers: [AppService],
})
export class AppModule {}
