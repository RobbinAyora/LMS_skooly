import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { Role } from '@prisma/client';

@Controller('protected')
export class ProtectedController {
  @Get('public')
  getPublic() {
    return { message: 'This is a public endpoint' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  getPrivate() {
    return { message: 'This is a protected endpoint' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  getAdminOnly() {
    return { message: 'This is an admin-only endpoint' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.INSTRUCTOR)
  @Get('instructor-only')
  getInstructorOnly() {
    return { message: 'This is an instructor-only endpoint' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('student-only')
  getStudentOnly() {
    return { message: 'This is a student-only endpoint' };
  }
}
