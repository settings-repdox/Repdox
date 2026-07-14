import type { UserDTO } from "../../../shared/dtos/user.dto";

export interface IAuthService {
  getCurrentUser(): Promise<UserDTO | null>;
  getSession(): Promise<unknown>;
  signOut(): Promise<void>;
}
