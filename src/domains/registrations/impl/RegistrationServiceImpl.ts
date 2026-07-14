import type {
  IRegistrationService,
  RegistrationUpsertParams,
  RegisterForEventParams,
} from "@/core/services/interfaces/IRegistrationService";
import type { RegistrationDTO } from "@/shared/dtos/registration.dto";
import { getRegistrationTableName } from "@/lib/utils";

function parseTeamNameFromMessage(row: any): string | undefined {
  try {
    if (!row?.message) return undefined;
    const parsed =
      typeof row.message === "string" ? JSON.parse(row.message) : row.message;
    return parsed?.participation?.teamName || parsed?.teamName || undefined;
  } catch {
    return undefined;
  }
}

function normalizeRow(row: any): RegistrationDTO {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id ?? null,
    createdAt: row.created_at ?? row.createdAt ?? "",
    updatedAt: row.updated_at ?? row.updatedAt,
    status: row.status ?? undefined,
    role: row.role ?? null,
    teamId: row.team_id ?? null,
    teamName: parseTeamNameFromMessage(row),
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    school: row.school ?? null,
    year: row.year ?? null,
    stream: row.stream ?? null,
    motivation: row.motivation ?? null,
    github: row.github ?? null,
    linkedin: row.linkedin ?? null,
    participationMode: row.participation_mode ?? null,
    expectedMembers: row.expected_members ?? null,
    editCount: row.edit_count ?? null,
    message:
      typeof row.message === "string"
        ? row.message
        : row.message
          ? JSON.stringify(row.message)
          : null,
  } as RegistrationDTO;
}

function buildRegistrationPayloads(params: RegistrationUpsertParams) {
  const messageData: Record<string, unknown> = {
    teamName: params.teamName ?? null,
    role: params.role ?? null,
    team_id: params.teamId ?? null,
    school: params.school ?? null,
    year: params.year ?? null,
    stream: params.stream ?? null,
    motivation: params.motivation ?? null,
    github: params.github ?? null,
    linkedin: params.linkedin ?? null,
    participation_mode: params.participationMode ?? null,
    expected_members: params.expectedMembers ?? null,
    edit_count: params.editCount ?? null,
  };

  const basePayload: Record<string, unknown> = {
    event_id: params.eventId,
    user_id: params.userId,
    name: params.name ?? null,
    email: params.email ?? null,
    phone: params.phone ?? null,
    message: JSON.stringify(messageData),
    status: params.status ?? "registered",
    edit_count: params.editCount ?? 0,
  };

  const fullPayload = {
    ...basePayload,
    role: params.role ?? null,
    team_id: params.teamId ?? null,
    school: params.school ?? null,
    year: params.year ?? null,
    stream: params.stream ?? null,
    motivation: params.motivation ?? null,
    github: params.github ?? null,
    linkedin: params.linkedin ?? null,
    participation_mode: params.participationMode ?? null,
    expected_members: params.expectedMembers ?? null,
  };

  const semiCleanPayload = { ...fullPayload };
  delete (semiCleanPayload as any).role;
  delete (semiCleanPayload as any).team_id;

  const minimalPayload = {
    event_id: params.eventId,
    user_id: params.userId,
    name: params.name ?? null,
    email: params.email ?? null,
    phone: params.phone ?? null,
    message: JSON.stringify(messageData),
    status: params.status ?? "registered",
    edit_count: params.editCount ?? 0,
  };

  return [fullPayload, semiCleanPayload, minimalPayload] as Array<
    Record<string, unknown>
  >;
}

function isSchemaIssueError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("could not find the") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("column") && message.includes("does not exist")) ||
    error?.code === "42703" ||
    error?.code === "42P01"
  );
}

function isUniqueConstraintError(error: any) {
  return (
    String(error?.code) === "23505" ||
    String(error?.message || "")
      .toLowerCase()
      .includes("unique")
  );
}

export class RegistrationServiceImpl implements IRegistrationService {
  private async getSupabase(): Promise<any> {
    try {
      const mod = await import("@/integrations/supabase/client");
      return (mod as any).supabase;
    } catch (error) {
      throw error;
    }
  }

  async createRegistration(
    payload: Partial<RegistrationDTO> & { tableName?: string | null },
  ): Promise<RegistrationDTO> {
    const supabase = await this.getSupabase();
    const insertData: Record<string, unknown> = {
      event_id: payload.eventId,
      user_id: payload.userId ?? null,
      name: payload.name ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      message: payload.message ?? null,
      status: payload.status ?? "registered",
      edit_count: payload.editCount ?? null,
    };

    if (payload.role !== undefined) insertData.role = payload.role;
    if (payload.teamId !== undefined) insertData.team_id = payload.teamId;
    if (payload.school !== undefined) insertData.school = payload.school;
    if (payload.year !== undefined) insertData.year = payload.year;
    if (payload.stream !== undefined) insertData.stream = payload.stream;
    if (payload.motivation !== undefined)
      insertData.motivation = payload.motivation;
    if (payload.github !== undefined) insertData.github = payload.github;
    if (payload.linkedin !== undefined) insertData.linkedin = payload.linkedin;
    if (payload.participationMode !== undefined)
      insertData.participation_mode = payload.participationMode;
    if (payload.expectedMembers !== undefined)
      insertData.expected_members = payload.expectedMembers;

    const targetTable = payload.tableName || "event_registrations";
    const { data, error } = await supabase
      .from(targetTable as any)
      .insert([insertData])
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }
    return normalizeRow(data);
  }

  async getRegistration(id: string): Promise<RegistrationDTO | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      // TODO: migrate to RegistrationService API (was .from('event_registrations'))
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return normalizeRow(data);
  }

  async fetchEventRegistrations(
    eventId: string,
    eventSlug?: string | null,
  ): Promise<RegistrationDTO[]> {
    const supabase = await this.getSupabase();
    const tableName = getRegistrationTableName({
      id: eventId,
      slug: eventSlug,
    });

    const registrations: any[] = [];

    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      registrations.push(...(data as any[]));
    }

    if (tableName !== "event_registrations") {
      const { data: centralData, error: centralError } = await supabase
        // TODO: migrate to RegistrationService API (was .from('event_registrations'))
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (!centralError && centralData) {
        registrations.push(...(centralData as any[]));
      }
    }

    if (error && tableName === "event_registrations") {
      throw error;
    }

    const uniqueRegistrations = Array.from(
      new Map(registrations.map((item) => [item.id, item])).values(),
    );

    uniqueRegistrations.sort(
      (a, b) =>
        new Date(b.created_at || b.createdAt).getTime() -
        new Date(a.created_at || a.createdAt).getTime(),
    );

    return uniqueRegistrations.map(normalizeRow);
  }

  async fetchEventRegistrationByUser(
    eventId: string,
    userId: string,
    eventSlug?: string | null,
  ): Promise<RegistrationDTO | null> {
    const supabase = await this.getSupabase();
    const tableName = getRegistrationTableName({
      id: eventId,
      slug: eventSlug,
    });

    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      return normalizeRow(data);
    }

    if (tableName !== "event_registrations") {
      const { data: fallbackData, error: fallbackError } = await supabase
        // TODO: migrate to RegistrationService API (was .from('event_registrations'))
        .select("*")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!fallbackError && fallbackData) {
        return normalizeRow(fallbackData);
      }
    }

    return null;
  }

  async fetchRegistrationsByUser(userId: string): Promise<RegistrationDTO[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      // TODO: migrate to RegistrationService API (was .from('event_registrations'))
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(normalizeRow) : [];
  }

  async countRegistrationsByRole(
    eventId: string,
    eventSlug?: string | null,
  ): Promise<Record<string, number>> {
    const supabase = await this.getSupabase();
    const tableName = getRegistrationTableName({
      id: eventId,
      slug: eventSlug,
    });

    let registrations: any[] = [];
    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .eq("event_id", eventId);
    if (!error && data) registrations = data as any[];

    if (error || tableName !== "event_registrations") {
      const { data: centralData } = await supabase
        // TODO: migrate to RegistrationService API (was .from('event_registrations'))
        .select("*")
        .eq("event_id", eventId);
      if (centralData) {
        registrations = [...registrations, ...(centralData as any[])];
      }
    }

    const counts: Record<string, number> = {};
    registrations.forEach((reg) => {
      const key = (reg.role || "__no_role__") as string;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  async canRegister(eventId: string, roleName?: string | null) {
    const supabase = await this.getSupabase();
    const { data: evt, error: evtErr } = await supabase
      .from("events")
      .select("roles, slug")
      .eq("id", eventId)
      .single();
    if (evtErr) throw evtErr;

    const roles = (evt as any)?.roles as
      | Array<{ name: string; capacity?: number | null }>
      | undefined;
    if (!roleName) return true;
    if (!roles || !roles.length) return true;

    const target = roles.find((r) => r.name === roleName);
    if (!target || target.capacity == null) return true;

    const counts = await this.countRegistrationsByRole(
      eventId,
      (evt as any)?.slug,
    );
    const current = counts[roleName] || 0;
    return current < (target.capacity ?? Infinity);
  }

  private async trySaveWithFallback(
    tableName: string,
    payloads: Array<Record<string, unknown>>,
    isUpdate: boolean,
    registrationId?: string,
  ) {
    const supabase = await this.getSupabase();
    let lastError: any = null;
    for (const payload of payloads) {
      try {
        const query = isUpdate
          ? supabase
              .from(tableName as any)
              .update(payload)
              .eq("id", registrationId)
          : supabase.from(tableName as any).insert([payload]);
        const { data, error } = await query.select().maybeSingle();
        if (!error) {
          return data;
        }
        if (isUniqueConstraintError(error)) {
          throw error;
        }
        if (!isSchemaIssueError(error)) {
          lastError = error;
          break;
        }
        lastError = error;
      } catch (error) {
        lastError = error;
        if (isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
    return null;
  }

  async registerForEvent(params: RegisterForEventParams) {
    const tableName =
      params.tableName ||
      getRegistrationTableName({ id: params.eventId, slug: params.eventSlug });

    const payloads = buildRegistrationPayloads({
      ...params,
      participationMode: params.participationMode,
      expectedMembers: params.expectedMembers,
      teamName: params.teamName,
      editCount: params.editCount,
    });

    const isUpdate = false;
    let dynamicResults: any = null;

    try {
      dynamicResults = await this.trySaveWithFallback(
        tableName,
        payloads,
        isUpdate,
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw error;
      }
      if (!isSchemaIssueError(error)) {
        throw error;
      }
    }

    if (dynamicResults) {
      return normalizeRow(dynamicResults);
    }

    if (tableName !== "event_registrations") {
      const centralResult = await this.trySaveWithFallback(
        "event_registrations",
        payloads,
        isUpdate,
      );
      if (centralResult) return normalizeRow(centralResult);
    }

    throw new Error("Failed to register for event");
  }

  async upsertEventRegistration(params: RegistrationUpsertParams) {
    const tableName =
      params.tableName ||
      getRegistrationTableName({ id: params.eventId, slug: params.eventSlug });

    const payloads = buildRegistrationPayloads({
      ...params,
    });

    const isUpdate = Boolean(params.registrationId);
    const existingId = params.registrationId;

    try {
      const dynamicResult = await this.trySaveWithFallback(
        tableName,
        payloads,
        isUpdate,
        existingId,
      );
      if (dynamicResult) {
        return normalizeRow(dynamicResult);
      }
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        // keep fallback behavior for central update/insert
      } else {
        throw error;
      }
    }

    if (tableName !== "event_registrations") {
      const centralResult = await this.trySaveWithFallback(
        "event_registrations",
        payloads,
        isUpdate,
        existingId,
      );
      if (centralResult) {
        return normalizeRow(centralResult);
      }
    }

    throw new Error("Failed to save registration");
  }

  async deleteEventRegistration(
    registrationId: string,
    eventId: string,
    eventSlug?: string | null,
  ) {
    const supabase = await this.getSupabase();
    const tableName = getRegistrationTableName({
      id: eventId,
      slug: eventSlug,
    });
    const candidateTables = [tableName];
    if (tableName !== "event_registrations")
      candidateTables.push("event_registrations");

    let lastError: any = null;
    for (const table of candidateTables) {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", registrationId);
      if (error) {
        lastError = error;
      }
    }
    if (lastError) {
      throw lastError;
    }
  }
}
