// users/user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Form } from '../forms/forms.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude() // never return password in API responses
  password: string; // argon2 hashed

  @Column({ nullable: true, type: 'text' })
  @Exclude()
  hashedRefreshToken: string | null; // store HASHED refresh token

  @OneToMany(() => Form, (form) => form.user)
  forms: Form[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}