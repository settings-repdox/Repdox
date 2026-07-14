import type { UserDTO } from "../../../shared/dtos/user.dto";

export interface VerificationResult {
  token: string;
  id?: string;
  sent: boolean;
  fromServer: boolean;
}

export interface IUserService {
  getUser(id: string): Promise<UserDTO | null>;
  getCurrentUser(): Promise<UserDTO | null>;
  createVerification(
    userId: string,
    type: "email" | "phone",
    contact: string,
    ttlSeconds?: number,
  ): Promise<VerificationResult>;
  verifyToken(
    userId: string,
    type: "email" | "phone",
    token: string,
  ): Promise<boolean>;
  deleteUserAccount(): Promise<boolean>;
}
