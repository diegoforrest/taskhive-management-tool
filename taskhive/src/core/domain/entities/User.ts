import { UserId } from '../valueObjects/UserId';
import { Email } from '../valueObjects/Email';
import { Password } from '../valueObjects/Password';

export interface UserData {
  user_id?: number;
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

export class User {
  private constructor(
    private readonly _id: UserId,
    private _email: Email,
    private _firstName: string | null,
    private _lastName: string | null,
    private _username: string | null,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  // Factory method to create User from backend data
  static fromData(data: UserData): User {
    const id = new UserId(data.user_id || data.id || 0);
    const email = new Email(data.email);
    
    return new User(
      id,
      email,
      data.firstName || null,
      data.lastName || null,
      data.username || null,
      data.createdAt ? new Date(data.createdAt) : new Date(),
      data.updatedAt ? new Date(data.updatedAt) : new Date()
    );
  }

  // Factory method for creating new users
  static create(data: CreateUserData): User {
    const emailVO = new Email(data.email);
    const passwordVO = new Password(data.password); // Validates password
    const now = new Date();
    
    return new User(
      new UserId(0), // Will be set by the database
      emailVO,
      data.firstName || null,
      data.lastName || null,
      null,
      now,
      now
    );
  }

  // Getters
  get id(): UserId {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get firstName(): string | null {
    return this._firstName;
  }

  get lastName(): string | null {
    return this._lastName;
  }

  get username(): string | null {
    return this._username;
  }

  get fullName(): string {
    if (this._firstName && this._lastName) {
      return `${this._firstName} ${this._lastName}`;
    }
    return this._firstName || this._lastName || this._email.value.split('@')[0];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business methods
  updateProfile(data: UpdateUserData): void {
    if (data.email && data.email !== this._email.value) {
      this._email = new Email(data.email);
    }
    
    this._firstName = data.firstName !== undefined ? data.firstName : this._firstName;
    this._lastName = data.lastName !== undefined ? data.lastName : this._lastName;
    this._updatedAt = new Date();
  }

  setUsername(username: string): void {
    if (!username || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    this._username = username.trim();
    this._updatedAt = new Date();
  }

  getDisplayName(): string {
    return this.fullName;
  }

  getInitials(): string {
    if (this._firstName && this._lastName) {
      return `${this._firstName[0]}${this._lastName[0]}`.toUpperCase();
    }
    if (this._firstName) return this._firstName[0].toUpperCase();
    return this._email.value[0].toUpperCase();
  }

  // Convert to plain object for API calls
  toData(): UserData {
    return {
      id: this._id.value,
      user_id: this._id.value,
      email: this._email.value,
      firstName: this._firstName || undefined,
      lastName: this._lastName || undefined,
      username: this._username || undefined,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    };
  }

  equals(other: User): boolean {
    return this._id.equals(other._id);
  }
}