import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import {ValidationPipe} from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { join } from 'path';
import * as express from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.enableCors({
    origin: ["http://localhost:8080", "http://192.168.0.209:8080", "http://192.168.56.1:8080", "https://graduation-project-frontend-nu.vercel.app"],
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({
    transform:true,
    whitelist:true
  }));
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
