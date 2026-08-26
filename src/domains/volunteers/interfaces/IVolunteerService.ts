import type {
  CreateVolunteerApplicationPayload,
  VolunteerApplicationDTO,
} from "../dtos/volunteer-application.dto";

export interface IVolunteerService {
  getApplicationByEmail(
    email: string,
  ): Promise<VolunteerApplicationDTO | null>;
  createApplication(
    payload: CreateVolunteerApplicationPayload,
  ): Promise<VolunteerApplicationDTO>;
}
