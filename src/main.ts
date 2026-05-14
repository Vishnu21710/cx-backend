import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as typeof import('cookie-parser');
import * as fs from 'fs';
import helmet from 'helmet';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow uploaded files to be served
    }),
  );
  app.use(cookieParser());

  // ─── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global Prefix ──────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');



  // ─── Global Pipes ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // strip unknown props
      forbidNonWhitelisted: true, // throw on extra props
      transform: true,         // auto-cast primitive types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global Filters & Interceptors ─────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger ────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('CX Assessment API')
    .setDescription(
      'Enterprise-grade REST API with JWT authentication and multi-stage form workflow',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie' }, 'cookie-auth')
    .addTag('Auth', 'Authentication & authorization endpoints')
    .addTag('Forms', 'Multi-stage application form endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // ─── Export Swagger JSON (Dev only) ────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
    console.log('✅ Swagger JSON generated at project root: ./swagger.json');
  }

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n🚀  Application running at: http://localhost:${port}/api/v1`);
  console.log(`📚  Swagger docs at:        http://localhost:${port}/api/docs\n`);
}

bootstrap();
