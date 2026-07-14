export interface IAssetService {
  uploadAvatar(userId: string, file: File): Promise<string>;
  getAvatarSignedUrl(path: string): Promise<string>;
  createSignedUrl(
    bucket: string,
    path: string,
    expiresIn?: number,
  ): Promise<string>;
  uploadFile(file: File, bucket: string, userId: string): Promise<string>;
  getPublicUrl(bucket: string, path: string): string;
  deleteFile(bucket: string, path: string): Promise<void>;
}
