import type { RegistrationDTO } from "../../../shared/dtos/registration.dto";

export interface RegisterForEventParams {
  eventId: string;
  eventSlug?: string | null;
  tableName?: string | null;
  userId?: string | null;
  role?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  school?: string | null;
  year?: string | null;
  stream?: string | null;
  motivation?: string | null;
  github?: string | null;
  linkedin?: string | null;
  participationMode?: string | null;
  expectedMembers?: number | null;
  status?: string | null;
  editCount?: number | null;
  message?: string | null;
}

export interface RegistrationUpsertParams extends RegisterForEventParams {
  registrationId?: string | null;
}

export interface IRegistrationService {
  createRegistration(
    payload: Partial<RegistrationDTO> & {
      tableName?: string | null;
      eventSlug?: string | null;
    },
  ): Promise<RegistrationDTO>;
  getRegistration(id: string): Promise<RegistrationDTO | null>;
  fetchEventRegistrations(
    eventId: string,
    eventSlug?: string | null,
  ): Promise<RegistrationDTO[]>;
  fetchEventRegistrationByUser(
    eventId: string,
    userId: string,
    eventSlug?: string | null,
  ): Promise<RegistrationDTO | null>;
  fetchRegistrationsByUser(userId: string): Promise<RegistrationDTO[]>;
  countRegistrationsByRole(
    eventId: string,
    eventSlug?: string | null,
  ): Promise<Record<string, number>>;
  canRegister(eventId: string, roleName?: string | null): Promise<boolean>;
  registerForEvent(params: RegisterForEventParams): Promise<RegistrationDTO>;
  upsertEventRegistration(
    params: RegistrationUpsertParams,
  ): Promise<RegistrationDTO>;
  deleteEventRegistration(
    registrationId: string,
    eventId: string,
    eventSlug?: string | null,
  ): Promise<void>;
}
