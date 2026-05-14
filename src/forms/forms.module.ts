import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './forms.entity';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Form])],
  providers: [FormsService],
  controllers: [FormsController],
})
export class FormsModule {}
