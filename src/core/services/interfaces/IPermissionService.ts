export interface IPermissionService {
  isUserAdmin(userId?: string): Promise<boolean>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
}
