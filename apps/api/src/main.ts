import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./modules/app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true
  });
  const port = process.env.PORT ?? 3001;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
