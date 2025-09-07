export class AuthResponseDto {
  access_token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
}