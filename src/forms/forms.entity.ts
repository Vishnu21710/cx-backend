import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type FormStatus = 'in-progress' | 'completed';

@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.forms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string; // explicit FK column for queries

  // ─── Progress Tracking ───────────────────────────────────────────────────
  @Column({ default: 1 })
  currentStage: number; // 1–5, tracks how far the user has progressed

  @Column({ default: 'in-progress' })
  status: FormStatus;

  // ─── Stage 1: Basic Information ──────────────────────────────────────────
  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  gender: string;

  // ─── Stage 2: Address Details ────────────────────────────────────────────
  @Column({ nullable: true })
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ nullable: true })
  country: string;

  // ─── Stage 3: Professional Details ──────────────────────────────────────
  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  yearsOfExperience: string;

  @Column({ nullable: true })
  skills: string; // comma-separated or JSON string

  @Column({ nullable: true })
  linkedInUrl: string;

  @Column({ nullable: true })
  portfolioUrl: string;

  // ─── Stage 4: Document Uploads ───────────────────────────────────────────
  @Column({ nullable: true })
  photoIdPath: string; // e.g. uploads/1234-photo-id.pdf

  @Column({ nullable: true })
  resumePath: string; // e.g. uploads/1234-resume.pdf

  @Column({ type: 'jsonb', nullable: true })
  additionalDocuments: string[]; // extra files

  // ─── Stage 5: Emergency Contact ──────────────────────────────────────────
  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  @Column({ nullable: true })
  emergencyContactRelationship: string;

  // ─── Review & Submit ─────────────────────────────────────────────────────
  @Column({ default: false })
  confirmed: boolean; // true once user submits at stage 5

  @Column({ nullable: true, type: 'timestamp' })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}