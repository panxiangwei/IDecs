import { Column, Entity } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseModel } from './base.model';

@Entity({ name: 'user', orderBy: { id: 'ASC' } })
export class UserModel extends BaseModel {
  @Column({ length: 64, nullable: true })
  username!: string;

  @Column({ length: 128, nullable: true })
  email!: string;

  @Column({ length: 16, nullable: true })
  phone!: string;

  @Column({ length: 128, nullable: true })
  @Exclude()
  password!: string;

  @Column({ type: 'jsonb' })
  profile!: Record<string, any>;
}
