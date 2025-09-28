export class ProjectId {
  private readonly _value: number;

  constructor(id: number) {
    if (!this.isValidId(id)) {
      throw new Error('Project ID must be a positive integer');
    }
    this._value = id;
  }

  get value(): number {
    return this._value;
  }

  private isValidId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }

  equals(other: ProjectId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value.toString();
  }
}