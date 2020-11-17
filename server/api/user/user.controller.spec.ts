import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { SuperAgentTest } from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../app.module';
import { ReqSignupBodyDto } from '../../../common/dto/user/req.signup.body.dto';
import { ReqLoginBodyDto } from '../../../common/dto/user/req.login.body.dto';
import { LoginTypeEnum } from '../../../common/enum/login.type.enum';
import { Utils } from '../../../common/utils';
import { ResponseCodeEnum } from '../../../common/enum/response.code.enum';
import { ReqPasswordChangeBodyDto } from '../../../common/dto/user/req.password.change.body.dto';
import { ReqProfileUpdateBodyDto } from '../../../common/dto/user/req.profile.update.body.dto';
import { config } from '../../../config';
import { UserModule } from './user.module';

let app: INestApplication;
let agent: SuperAgentTest;
const password = 'IDecs@2020';

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [UserModule, AppModule],
  }).compile();
  app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();
  agent = request.agent(app.getHttpServer());
  agent.timeout(3000);
});

afterAll(async () => {
  await app.close();
});

function setHeaders(agent: SuperAgentTest, baseUrl: string): void {
  const now = Date.now();
  agent.set('timestamp', now.toString());
  agent.set('api-key', Utils.generateApiKey(now, baseUrl));
}

function doLoginByPassword(email: string, password: string): Promise<string> {
  const loginData: ReqLoginBodyDto = {
    identity: email,
    password,
    type: LoginTypeEnum.PASSWORD,
  };
  let url = '/api/user/login';
  setHeaders(agent, url);
  return agent
    .post(url)
    .send(loginData)
    .expect(201)
    .then((res) => {
      url = '/api/user/ticket/validate';
      setHeaders(agent, url);
      return agent
        .get(url)
        .query({ ticket: res.body.data.ticket })
        .expect(200)
        .then((res) => {
          expect(res.body.head.code).toEqual(ResponseCodeEnum.OK);
          return res;
        })
        .then((res) => res.body.data.token);
    });
}

async function doSignupAndLogin(): Promise<{ email: string; token: string }> {
  const email = `${Date.now()}.test@idecs.com`;
  const signupData: ReqSignupBodyDto = {
    email,
    code: config.api.otp.code,
    password,
    confirmPassword: password,
    profile: { username: 'IDecs_tester' },
  };
  const url = '/api/user/signup';
  setHeaders(agent, url);
  const token = await agent
    .post(url)
    .send(signupData)
    .expect(201)
    .then(() => {
      return doLoginByPassword(email, password);
    });
  return { email, token };
}

describe('Signup and login', () => {
  it('should create user by email successful', () => {
    const data: ReqSignupBodyDto = {
      email: `${Date.now()}.test@idecs.com`,
      code: config.api.otp.code,
      password,
      confirmPassword: password,
      profile: { username: 'IDecs_tester' },
    };
    const url = '/api/user/signup';
    setHeaders(agent, url);
    return agent
      .post(url)
      .send(data)
      .expect(201)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should create user by phone successful', () => {
    const data: ReqSignupBodyDto = {
      phone: `+861${Date.now().toString().slice(4, 13)}`,
      code: config.api.otp.code,
      password,
      confirmPassword: password,
      profile: { username: 'IDecs_tester' },
    };
    const url = '/api/user/signup';
    setHeaders(agent, url);
    return agent
      .post(url)
      .send(data)
      .expect(201)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should create user by email and login successful', () => {
    return doSignupAndLogin();
  });
});

describe('UserController', () => {
  let email: string;
  beforeAll(async () => {
    const data = await doSignupAndLogin();
    email = data.email;
    agent.set('Cookie', [`token=${data.token}`]);
  });

  it('should get self successful', () => {
    const url = '/api/user';
    setHeaders(agent, url);
    return agent
      .get(url)
      .expect(200)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should get user by id successful', () => {
    const url = '/api/user/10';
    setHeaders(agent, url);
    return agent
      .get(url)
      .expect(200)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should delete user by id successful', () => {
    const url = '/api/user/12';
    setHeaders(agent, url);
    return agent
      .delete(url)
      .expect(200)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should get user pagination successful', () => {
    const url = '/api/user/pagination';
    setHeaders(agent, url);
    return agent
      .get(url)
      .expect(200)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });

  it('should update password successful', () => {
    const url = '/api/user/password/change';
    setHeaders(agent, url);
    const newPassword = 'IDecs!2020';
    const updatePasswordData: ReqPasswordChangeBodyDto = {
      oldPassword: password,
      newPassword,
      confirmPassword: newPassword,
    };
    return agent
      .put(url)
      .send(updatePasswordData)
      .expect(200)
      .then(() => {
        return doLoginByPassword(email, newPassword);
      });
  });

  it('should update profile successful', () => {
    const url = '/api/user/profile';
    setHeaders(agent, url);
    const data: ReqProfileUpdateBodyDto = {
      username: 'haha',
      profile: {
        test: 'prefect',
      },
    };
    return agent
      .put(url)
      .send(data)
      .expect(200)
      .then((res) => expect(res.body.head.code).toEqual(ResponseCodeEnum.OK));
  });
});