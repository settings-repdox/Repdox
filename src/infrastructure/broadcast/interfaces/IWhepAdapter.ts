export interface IWhepAdapter {
  createPublisher(
    offer: string,
  ): Promise<{ publisherId: string; answer: string }>;
  removePublisher(publisherId: string): Promise<void>;
}
