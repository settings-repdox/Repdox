// Shared public contracts for domains to publish and production to consume.

export interface PublicContractMeta {
  name: string;
  version: string;
  description?: string;
}

export interface EventPublicContract extends PublicContractMeta {
  // Example minimal contract. Domains should expand and version explicitly.
  eventIdField: string;
}

export interface RegistrationPublicContract extends PublicContractMeta {
  registrationIdField: string;
}
