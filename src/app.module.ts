import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { DestinationsModule } from './destinations/destinations.module';
import { ServicesModule } from './services/services.module';
import { OrgModule } from './org/org.module';
import { AgentsModule } from './agents/agents.module';
import { AiModule } from './ai/ai.module';
import { QuotesModule } from './quotes/quotes.module';

// Entities
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { AgentMarkupConfig } from './entities/agent-markup-config.entity';
import { Destination } from './entities/destination.entity';
import { Service } from './entities/service.entity';
import { Quote } from './entities/quote.entity';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_DATABASE', 'routecraft'),
        entities: [Organization, User, AgentMarkupConfig, Destination, Service, Quote],
        synchronize: config.get('NODE_ENV') === 'development', // Auto-sync in dev only
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // Static files
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'uploads'),
        serveRoot: '/uploads',
      },
      {
        rootPath: join(__dirname, '..', 'assets'),
        serveRoot: '/assets',
      },
    ),

    // Feature modules
    AuthModule,
    AdminModule,
    DestinationsModule,
    ServicesModule,
    OrgModule,
    AgentsModule,
    AiModule,
    QuotesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
