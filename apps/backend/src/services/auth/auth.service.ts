import { Injectable } from '@nestjs/common';
import { Provider, User } from '@prisma/client';
import dayjs from 'dayjs';
import { EmailService } from '@growchief/shared-backend/email/email.service';
import { OrganizationService } from '@growchief/shared-backend/database/organizations/organization.service';
import { UsersService } from '@growchief/shared-backend/database/users/users.service';
import { EncryptionService } from '@growchief/shared-backend/encryption/encryption.service';
import { NewsletterService } from '@growchief/shared-backend/newsletter/newsletter.service';
import { CreateOrgUserDto } from '@growchief/shared-both/dto/auth/create.org.user.dto';
import { LoginUserDto } from '@growchief/shared-both/dto/auth/login.user.dto';
import { ProvidersFactory } from '@growchief/backend/services/auth/providers/providers.factory';
import { ForgotReturnPasswordDto } from '@growchief/shared-both/dto/auth/forgot-return.password.dto';

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _emailService: EmailService,
    private _newsletterService: NewsletterService,
  ) {}

  async isSuperAdminOnboarding() {
    return (await this._organizationService.getCount()) === 0;
  }

  async canRegister() {
    return !process.env.DISABLE_REGISTRATION;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    website: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string },
  ) {
    if (provider === Provider.LOCAL) {
      const user = await this._userService.getUserByEmail(body.email);
      if (body instanceof CreateOrgUserDto) {
        if (user) {
          throw new Error('User already exists');
        }

        if (!(await this.canRegister())) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(body);

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role,
              )
            : false;

        const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
        await this._emailService.sendEmail(
          body.email,
          'Activate your account',
          `Click <a href="${process.env.FRONTEND_URL}/auth/activate/${obj.jwt}">here</a> to activate your account`,
        );
        return obj;
      }

      if (
        !user ||
        !EncryptionService.comparePassword(body.password, user?.password!)
      ) {
        throw new Error('Invalid user name or password');
      }

      if (!user.activated) {
        throw new Error('User is not activated');
      }

      return { addedOrg: false, jwt: await this.jwt(user) };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      website,
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role,
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user) };
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = EncryptionService.verifyJWT(cookie);
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    website: string,
  ) {
    const providerInstance = ProvidersFactory.loadProvider(provider);
    const providerUser = await providerInstance.getUser(
      body.providerToken,
      website,
    );

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await this._userService.getUserByProvider(
      providerUser.id,
      provider,
    );
    if (user) {
      return user;
    }

    if (!(await this.canRegister())) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser({
      email: providerUser.email,
      password: '',
      provider,
      providerId: providerUser.id,
      company: body.company,
    });

    await this._newsletterService.register(providerUser.email);

    return create.users[0].user;
  }

  async forgot(email: string) {
    const user = await this._userService.getUserByEmail(email);
    if (!user || user.providerName !== Provider.LOCAL) {
      return false;
    }

    const resetValues = EncryptionService.signJWT({
      id: user.id,
      expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    });

    await this._emailService.sendEmail(
      user.email,
      'Reset your password',
      `You have requested to reset your passsord. <br />Click <a href="${process.env.FRONTEND_URL}/auth/forgot/${resetValues}">here</a> to reset your password<br />The link will expire in 20 minutes`,
    );
  }

  forgotReturn(body: ForgotReturnPasswordDto) {
    const user = EncryptionService.verifyJWT(body.token) as {
      id: string;
      expires: string;
    };
    if (dayjs(user.expires).isBefore(dayjs())) {
      return false;
    }

    return this._userService.updatePassword(user.id, body.password);
  }

  async activate(code: string) {
    const user = EncryptionService.verifyJWT(code) as {
      id: string;
      activated: boolean;
      email: string;
    };
    if (user.id && !user.activated) {
      const getUserAgain = await this._userService.getUserByEmail(user.email);
      if (getUserAgain?.activated!) {
        return false;
      }
      await this._userService.activateUser(user.id);
      user.activated = true;
      await this._newsletterService.register(user.email);
      return this.jwt(user as any);
    }

    return false;
  }

  oauthLink(provider: string, website: string, query?: any) {
    const providerInstance = ProvidersFactory.loadProvider(
      provider as Provider,
    );
    return providerInstance.generateLink(website, query);
  }

  async checkExists(provider: string, code: string, website: string) {
    const providerInstance = ProvidersFactory.loadProvider(
      provider as Provider,
    );
    const token = await providerInstance.getToken(code, website);
    const user = await providerInstance.getUser(token, website);
    if (!user) {
      throw new Error('Invalid user');
    }
    const checkExists = await this._userService.getUserByProvider(
      user.id,
      provider as Provider,
    );
    if (checkExists) {
      return { jwt: await this.jwt(checkExists) };
    }

    return { token };
  }

  private async jwt(user: User) {
    return EncryptionService.signJWT(user);
  }
}
