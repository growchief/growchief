import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { OrganizationService } from '@growchief/shared-backend/database/organizations/organization.service';
import { UsersService } from '@growchief/shared-backend/database/users/users.service';
import { EncryptionService } from '@growchief/shared-backend/encryption/encryption.service';
import { HttpUnauthorized } from '@growchief/shared-backend/exceptions/http.exceptions';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private _organizationService: OrganizationService,
    private _userService: UsersService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.auth || req.cookies.auth;
    if (!auth) {
      throw new HttpUnauthorized();
    }
    try {
      let user: User | null;
      user = EncryptionService.verifyJWT(auth) as User | null;
      let orgHeader = req.cookies.showorg || req.headers.showorg;
      if (user?.isSuperAdmin && req.cookies.viewas) {
        const orgUser = await this._userService.getOrgUser(req.cookies.viewas);
        if (orgUser) {
          user = orgUser.user;
          user.isSuperAdmin = true;
          // @ts-ignore
          user.viewas = req.cookies.viewas;
          orgHeader = orgUser.organizationId;
        }
      }

      if (!user) {
        throw new HttpUnauthorized();
      }

      if (!user.activated) {
        throw new HttpUnauthorized();
      }

      // @ts-ignore
      delete user.password;
      const organization = (
        await this._organizationService.getOrgsByUserId(user.id)
      ).filter((f) => !f.users[0].disabled);
      const setOrg =
        organization.find((org) => org.id === orgHeader) || organization[0];

      if (!organization) {
        throw new HttpUnauthorized();
      }

      // @ts-expect-error
      req.user = user;

      // @ts-expect-error
      req.org = setOrg;
    } catch (err) {
      throw new HttpUnauthorized();
    }
    next();
  }
}
