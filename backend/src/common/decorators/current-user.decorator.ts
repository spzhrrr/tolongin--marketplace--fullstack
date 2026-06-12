import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest();
    const user: CurrentUserData = req.user;
    return data ? user?.[data] : user;
  },
);
