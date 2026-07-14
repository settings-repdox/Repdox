import type { IWhepAdapter } from "@/infrastructure/broadcast/interfaces/IWhepAdapter";

export class WhepAdapterStub implements IWhepAdapter {
  async createPublisher(offer: string) {
    return {
      publisherId: `pub_${Math.random().toString(36).slice(2, 9)}`,
      answer: "",
    };
  }
  async removePublisher(publisherId: string) {
    return;
  }
}
