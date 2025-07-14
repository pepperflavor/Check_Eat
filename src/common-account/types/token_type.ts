import { Prisma } from '@prisma/client';

export type UserLoginToken = Prisma.LoginDataGetPayload<{
  include: {
    user: {
      select: {
        user_id: true;
        user_nick: true;
        user_email: true;
        user_vegan: true;
        user_is_halal: true;
        user_allergy: true;
        user_allergy_common: {
          select: {
            coal_id: true;
            coal_name: true;
          };
        };
      };
    };
  };
}>;

export type SajangLoginToken = Prisma.LoginDataGetPayload<{
  include: {
    sajang: {
      select: {
        sa_id: true;
        sa_email: true;
        sa_certi_status: true;
        Store: {
          select: {
            sto_id: true;
          };
        };
      };
    };
  };
}>;
