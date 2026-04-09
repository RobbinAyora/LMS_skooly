import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return data ? user[data] : user;
  },
);
