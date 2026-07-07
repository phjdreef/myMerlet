import fs from "fs";
import { BrowserWindow, session } from "electron";
import { logger } from "../utils/logger";
import { resolveUserDataFilePath } from "./user-data-path";

export interface MagisterAuthData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userInfo?: Record<string, unknown>;
}

export interface MagisterUserInfo {
  id: string;
  name: string;
  email?: string;
  class?: string;
}

export interface MagisterScheduleItem {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  teacher?: string;
  subject?: string;
}

export interface MagisterTodayInfo {
  schedule: MagisterScheduleItem[];
  announcements?: string[];
  assignments?: string[];
}

interface MatchedSubjectRecord {
  group: string;
  teacherNames: string[];
  subjectName?: string;
  registrationId?: string;
}

interface TeacherIdentity {
  name?: string;
  employeeId?: string;
  code?: string;
  lastName?: string;
}

interface TeacherCandidate {
  fullName?: string;
  lastName?: string;
  code?: string;
  employeeId?: string;
}

interface TeacherIdentityDebugData {
  timestamp: string;
  tokenDerivedIdentity: TeacherIdentity;
  endpointResponses: Array<{
    endpoint: string;
    success: boolean;
    response?: unknown;
    error?: string;
  }>;
  resolvedIdentity: TeacherIdentity | null;
}

interface SubjectFetchDebugData {
  timestamp: string;
  studentId: number;
  registrationId: string;
  endpointTried: string[];
  endpointResults?: Array<{
    endpoint: string;
    success: boolean;
    status?: number;
    error?: string;
    responseType?: string;
    responsePreview?: string;
  }>;
  successfulEndpoint?: string;
  subjectCount: number;
  responseSample?: unknown;
}

interface MagisterRequestOptions extends RequestInit {
  suppressErrorLogging?: boolean;
  suppressNotFound?: boolean;
}

interface MagisterStudentApiRecord {
  id: number;
  voorletters?: string;
  roepnaam: string;
  tussenvoegsel?: string;
  achternaam: string;
  code: string;
  emailadres: string;
  telefoonnummer?: string;
  klassen: string[];
  lesgroepen?: string[];
  studies: string[];
  profiel1?: string;
  externeId?: string;
  links?: {
    self?: { href: string };
    foto?: { href: string };
  };
  vakken?: unknown[];
}

interface MagisterRegistrationRecord {
  id?: number | string;
  aanmeldingId?: number | string;
  aanmeldingid?: number | string;
  inschrijvingId?: number | string;
  inschrijvingid?: number | string;
  href?: string;
  url?: string;
  links?: Record<string, { href?: string }>;
}

interface MagisterAccountResponse {
  Persoon?: {
    Id?: number;
    id?: number;
    Roepnaam?: string;
    roepnaam?: string;
    Achternaam?: string;
    achternaam?: string;
    Voorletters?: string;
    ExterneId?: string;
    Code?: string;
    code?: string;
    Links?: Record<string, { href?: string }>;
  };
  Groep?: Array<{ Naam?: string }>;
  Links?: Array<{ href?: string }> | Record<string, { href?: string }>;
  id?: number;
  medewerkerId?: number | string;
  medewerkerid?: number | string;
  code?: string;
  roepnaam?: string;
  achternaam?: string;
  links?: Record<string, { href?: string }>;
}

export class MagisterAPI {
  private baseUrl = "https://merletcollege.magister.net";
  private authData: MagisterAuthData | null = null;
  private cachedTeacherIdentity: TeacherIdentity | null = null;
  private teacherIdentityDebugPath: string | null = null;
  private subjectFetchDebugDir: string | null = null;

  private isVerboseMagisterDebugEnabled(): boolean {
    return process.env.MAGISTER_DEBUG === "1";
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRateLimitDelayMs(
    response: Response,
    responseText: string,
    attempt: number,
  ): number {
    const retryAfterHeader = response.headers.get("retry-after");
    if (retryAfterHeader) {
      const asSeconds = Number(retryAfterHeader);
      if (Number.isFinite(asSeconds) && asSeconds > 0) {
        return Math.min(5000, Math.round(asSeconds * 1000));
      }
    }

    try {
      const parsed = JSON.parse(responseText) as { secondsLeft?: unknown };
      const secondsLeft = Number(parsed.secondsLeft);
      if (Number.isFinite(secondsLeft) && secondsLeft > 0) {
        return Math.min(5000, Math.round(secondsLeft * 1000));
      }
    } catch {
      // Ignore non-JSON body.
    }

    const backoffMs = 500 * Math.pow(2, attempt);
    return Math.min(5000, backoffMs);
  }

  private getTeacherIdentityDebugPath(): string {
    if (!this.teacherIdentityDebugPath) {
      this.teacherIdentityDebugPath = resolveUserDataFilePath(
        "magister_teacher_identity_debug.json",
        "Magister teacher identity debug",
      );
    }

    return this.teacherIdentityDebugPath;
  }

  private writeTeacherIdentityDebug(data: TeacherIdentityDebugData): void {
    if (!this.isVerboseMagisterDebugEnabled()) {
      return;
    }

    try {
      fs.writeFileSync(
        this.getTeacherIdentityDebugPath(),
        JSON.stringify(data, null, 2),
        "utf8",
      );
    } catch (error) {
      logger.error("Failed to write teacher identity debug file:", error);
    }
  }

  private getSubjectFetchDebugDir(): string {
    if (!this.subjectFetchDebugDir) {
      this.subjectFetchDebugDir = resolveUserDataFilePath(
        "magister_subject_fetch_debug",
        "Magister subject fetch debug",
      );
    }

    return this.subjectFetchDebugDir;
  }

  private writeSubjectFetchDebug(data: SubjectFetchDebugData): void {
    try {
      const hasEndpointFailure =
        data.endpointResults?.some((result) => !result.success) ?? false;
      const shouldWrite =
        this.isVerboseMagisterDebugEnabled() ||
        hasEndpointFailure ||
        data.subjectCount === 0;

      if (!shouldWrite) {
        return;
      }

      const dir = this.getSubjectFetchDebugDir();
      fs.mkdirSync(dir, { recursive: true });
      const filePath = `${dir}/student_${data.studentId}_registration_${data.registrationId}.json`;

      const payload: SubjectFetchDebugData =
        this.isVerboseMagisterDebugEnabled()
          ? data
          : {
              ...data,
              responseSample: undefined,
              endpointResults: data.endpointResults?.filter(
                (result) => !result.success,
              ),
            };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
    } catch (error) {
      logger.error("Failed to write subject fetch debug file:", error);
    }
  }

  private normalizeForCompare(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private teacherNameMatches(
    candidateTeacherName: string,
    filterTeacherName: string,
    strict = false,
  ): boolean {
    const candidate = this.normalizeForCompare(candidateTeacherName);
    const filter = this.normalizeForCompare(filterTeacherName);

    if (!candidate || !filter) {
      return false;
    }

    const candidateCompact = candidate.replace(/\s+/g, "");
    const filterCompact = filter.replace(/\s+/g, "");

    // Prevent overmatching on tiny fragments like "p" or initials only.
    if (
      !strict &&
      candidateCompact.length >= 4 &&
      filterCompact.length >= 4 &&
      (candidate.includes(filter) || filter.includes(candidate))
    ) {
      return true;
    }

    const filterParts = filter.split(/\s+/).filter(Boolean);
    const candidateParts = candidate.split(/\s+/).filter(Boolean);
    const filterFirstName = filterParts[0] ?? "";
    const filterFirstInitial = filterFirstName.charAt(0);
    const filterLastName = filterParts[filterParts.length - 1];

    if (strict) {
      if (!filterLastName || !candidate.includes(filterLastName)) {
        return false;
      }

      if (filterFirstName.length >= 2 && candidate.includes(filterFirstName)) {
        return true;
      }

      const compactInitialMatch = `${filterFirstInitial}${filterLastName}`;
      return (
        Boolean(filterFirstInitial) &&
        candidateCompact.includes(compactInitialMatch)
      );
    }

    // Support abbreviated teacher formats like "P. Dreef".
    if (
      filterLastName &&
      filterLastName.length >= 3 &&
      candidate.includes(filterLastName)
    ) {
      return true;
    }

    const candidateLastName = candidateParts[candidateParts.length - 1];
    if (
      candidateLastName &&
      candidateLastName.length >= 3 &&
      filter.includes(candidateLastName)
    ) {
      return true;
    }

    return false;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length < 2) {
        return null;
      }

      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const json = Buffer.from(paddedBase64, "base64").toString("utf8");
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getTeacherNameFromLogin(): string | null {
    const explicitUserInfo = this.authData?.userInfo;
    if (explicitUserInfo && typeof explicitUserInfo === "object") {
      const fromUserInfo = explicitUserInfo as Record<string, unknown>;
      const directName = fromUserInfo.name;
      if (typeof directName === "string" && directName.trim().length > 0) {
        return directName.trim();
      }
    }

    if (!this.authData?.token) {
      return null;
    }

    const payload = this.decodeJwtPayload(this.authData.token);
    if (!payload) {
      return null;
    }

    const nameKeys = [
      "name",
      "unique_name",
      "preferred_username",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    ];

    for (const key of nameKeys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    const givenName = payload.given_name;
    const familyName = payload.family_name;
    if (
      typeof givenName === "string" &&
      givenName.trim().length > 0 &&
      typeof familyName === "string" &&
      familyName.trim().length > 0
    ) {
      return `${givenName.trim()} ${familyName.trim()}`;
    }

    return null;
  }

  private extractEmployeeIdFromHref(href: unknown): string | undefined {
    if (typeof href !== "string") return undefined;
    const match = href.match(/\/api\/medewerkers\/(\d+)/i);
    return match?.[1];
  }

  private extractRegistrationIdFromHref(href: unknown): string | undefined {
    if (typeof href !== "string") return undefined;
    const match = href.match(/\/api\/(?:aanmeldingen|inschrijvingen)\/(\d+)/i);
    return match?.[1];
  }

  private getTeacherIdentityFromAuthData(): TeacherIdentity {
    const identity: TeacherIdentity = {
      name: this.getTeacherNameFromLogin() ?? undefined,
    };

    const payload = this.authData?.token
      ? this.decodeJwtPayload(this.authData.token)
      : null;

    if (payload) {
      const employeeIdKeys = [
        "medewerkerId",
        "medewerkerid",
        "employeeId",
        "employee_id",
      ];
      for (const key of employeeIdKeys) {
        const value = payload[key];
        if (typeof value === "string" || typeof value === "number") {
          identity.employeeId = String(value);
          break;
        }
      }

      const codeKeys = ["code", "medewerkerCode", "medewerkercode"];
      for (const key of codeKeys) {
        const value = payload[key];
        if (typeof value === "string" && value.trim().length > 0) {
          identity.code = value.trim().toUpperCase();
          break;
        }
      }

      const familyName = payload.family_name;
      if (typeof familyName === "string" && familyName.trim().length > 0) {
        identity.lastName = familyName.trim();
      }
    }

    return identity;
  }

  private async resolveTeacherIdentity(
    teacherNameFilter?: string,
  ): Promise<TeacherIdentity | null> {
    if (this.cachedTeacherIdentity) {
      const resolvedIdentity = {
        ...this.cachedTeacherIdentity,
        name: teacherNameFilter?.trim() || this.cachedTeacherIdentity.name,
      };

      this.writeTeacherIdentityDebug({
        timestamp: new Date().toISOString(),
        tokenDerivedIdentity: this.getTeacherIdentityFromAuthData(),
        endpointResponses: [],
        resolvedIdentity,
      });

      return resolvedIdentity;
    }

    const identity = this.getTeacherIdentityFromAuthData();
    const endpointResponses: TeacherIdentityDebugData["endpointResponses"] = [];
    if (teacherNameFilter?.trim()) {
      identity.name = teacherNameFilter.trim();

      const employeeIdFromFilter =
        this.extractEmployeeIdFromHref(teacherNameFilter);
      if (employeeIdFromFilter) {
        identity.employeeId = employeeIdFromFilter;
      }
    }

    const hasStrongIdentity = Boolean(identity.employeeId || identity.code);
    if (hasStrongIdentity) {
      this.cachedTeacherIdentity = identity;
      return identity;
    }

    const endpoints = [
      "/api/account",
      "/api/account/me",
      "/api/medewerkers/me",
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await this.makeAuthenticatedRequest(endpoint);
        endpointResponses.push({
          endpoint,
          success: true,
          response,
        });
        if (!response || typeof response !== "object") {
          continue;
        }

        const record = response as MagisterAccountResponse;
        const persoonRecord =
          record.Persoon && typeof record.Persoon === "object"
            ? record.Persoon
            : null;

        const directId =
          record.id ??
          record.medewerkerId ??
          record.medewerkerid ??
          persoonRecord?.Id ??
          persoonRecord?.id ??
          null;
        if (directId !== null && directId !== undefined) {
          identity.employeeId = String(directId);
        }

        const directCode =
          record.code ?? persoonRecord?.Code ?? persoonRecord?.code;
        if (typeof directCode === "string" && directCode.trim().length > 0) {
          identity.code = directCode.trim().toUpperCase();
        }

        const lastName =
          record.achternaam ??
          persoonRecord?.Achternaam ??
          persoonRecord?.achternaam;
        if (typeof lastName === "string" && lastName.trim().length > 0) {
          identity.lastName = lastName.trim();
        }

        const firstName =
          record.roepnaam ?? persoonRecord?.Roepnaam ?? persoonRecord?.roepnaam;
        if (
          typeof firstName === "string" &&
          firstName.trim().length > 0 &&
          typeof lastName === "string" &&
          lastName.trim().length > 0
        ) {
          identity.name = `${firstName.trim()} ${lastName.trim()}`;
        }

        const links = record.links;
        if (links && typeof links === "object") {
          const linkValues = Object.values(links as Record<string, unknown>);
          for (const linkValue of linkValues) {
            if (linkValue && typeof linkValue === "object") {
              const href = (linkValue as Record<string, unknown>).href;
              const employeeIdFromHref = this.extractEmployeeIdFromHref(href);
              if (employeeIdFromHref) {
                identity.employeeId = employeeIdFromHref;
                break;
              }
            }
          }
        }

        const persoonLinks = persoonRecord?.Links;
        if (persoonLinks && typeof persoonLinks === "object") {
          const linkValues = Object.values(
            persoonLinks as Record<string, unknown>,
          );
          for (const linkValue of linkValues) {
            if (linkValue && typeof linkValue === "object") {
              const href = (linkValue as Record<string, unknown>).href;
              const employeeIdFromHref = this.extractEmployeeIdFromHref(href);
              if (employeeIdFromHref) {
                identity.employeeId = employeeIdFromHref;
                break;
              }
            }
          }
        }

        if (identity.employeeId || identity.code) {
          break;
        }
      } catch (error) {
        endpointResponses.push({
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Try next endpoint variant.
      }
    }

    // When the medewerker endpoint is known (e.g. /api/medewerkers/28630),
    // hydrate identity directly from that medewerker record.
    if (identity.employeeId) {
      try {
        const medewerkerResponse = await this.makeAuthenticatedRequest(
          `/api/medewerkers/${identity.employeeId}`,
        );
        endpointResponses.push({
          endpoint: `/api/medewerkers/${identity.employeeId}`,
          success: true,
          response: medewerkerResponse,
        });
        if (medewerkerResponse && typeof medewerkerResponse === "object") {
          const medewerker = medewerkerResponse as Record<string, unknown>;

          const code = medewerker.code;
          if (typeof code === "string" && code.trim().length > 0) {
            identity.code = code.trim().toUpperCase();
          }

          const roepnaam =
            typeof medewerker.roepnaam === "string"
              ? medewerker.roepnaam.trim()
              : "";
          const achternaam =
            typeof medewerker.achternaam === "string"
              ? medewerker.achternaam.trim()
              : "";

          if (achternaam) {
            identity.lastName = achternaam;
          }

          const fullName = [roepnaam, achternaam].filter(Boolean).join(" ");
          if (fullName) {
            identity.name = fullName;
          }
        }
      } catch (error) {
        endpointResponses.push({
          endpoint: `/api/medewerkers/${identity.employeeId}`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Continue with what we already know.
      }
    }

    this.cachedTeacherIdentity = identity;
    this.writeTeacherIdentityDebug({
      timestamp: new Date().toISOString(),
      tokenDerivedIdentity: this.getTeacherIdentityFromAuthData(),
      endpointResponses,
      resolvedIdentity: identity,
    });
    return identity;
  }

  private asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];

    const record = value as Record<string, unknown>;
    const candidates = [
      record.items,
      record.results,
      record.data,
      record.value,
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }

    return [];
  }

  private isSubjectLikeRecord(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;
    return Boolean(
      record.studievak ||
        record.Studievak ||
        record.docenten ||
        record.Docenten ||
        record.groep ||
        record.Groep ||
        record.vak ||
        record.Vak ||
        record.vakNaam ||
        record.VakNaam ||
        record.vaknaam ||
        record.subject ||
        record.subjectName ||
        record.Subject ||
        record.SubjectName,
    );
  }

  private extractSubjectsArray(value: unknown): unknown[] {
    const directArray = this.asArray(value);
    if (directArray.length > 0) {
      return directArray;
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    const root = value as Record<string, unknown>;
    const preferredKeys = [
      "vakken",
      "subjects",
      "data",
      "results",
      "items",
      "value",
    ];

    for (const key of preferredKeys) {
      const candidate = root[key];
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate;
      }
    }

    for (const [key, candidate] of Object.entries(root)) {
      if (!Array.isArray(candidate) || candidate.length === 0) {
        continue;
      }

      const keyLower = key.toLowerCase();
      if (
        preferredKeys.includes(keyLower) ||
        keyLower.includes("vak") ||
        keyLower.includes("subject")
      ) {
        return candidate;
      }
    }

    const queue: Array<{ node: unknown; depth: number }> = [
      { node: value, depth: 0 },
    ];
    const visited = new Set<unknown>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const { node, depth } = current;
      if (depth > 4 || !node || typeof node !== "object") {
        continue;
      }

      if (visited.has(node)) {
        continue;
      }
      visited.add(node);

      if (Array.isArray(node)) {
        if (
          node.length > 0 &&
          node.some((entry) => this.isSubjectLikeRecord(entry))
        ) {
          return node;
        }

        if (
          node.length > 0 &&
          node.every((entry) => entry && typeof entry === "object")
        ) {
          const flattenedKeys = new Set(
            node
              .slice(0, 5)
              .flatMap((entry) => Object.keys(entry as Record<string, unknown>))
              .map((key) => key.toLowerCase()),
          );

          if (
            flattenedKeys.has("studievak") ||
            flattenedKeys.has("vak") ||
            flattenedKeys.has("vaknaam") ||
            flattenedKeys.has("groep") ||
            flattenedKeys.has("docenten")
          ) {
            return node;
          }
        }

        node.forEach((entry) => {
          if (entry && typeof entry === "object") {
            queue.push({ node: entry, depth: depth + 1 });
          }
        });
        continue;
      }

      const record = node as Record<string, unknown>;
      Object.values(record).forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }
        queue.push({ node: entry, depth: depth + 1 });
      });
    }

    return [];
  }

  private buildStudentSearchEndpoint(fields: string[]): string {
    const baseSearchUrl =
      "/api/leerlingen/zoeken?q=**&top=200&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01";
    const fieldsQuery = fields.map((field) => `velden=${field}`).join("&");
    return `${baseSearchUrl}&${fieldsQuery}`;
  }

  private getPrimaryStudentSearchFields(): string[] {
    return [
      "stamnummer",
      "naam",
      "klassen",
      "studies",
      "emailadres",
      "telefoonnummer",
      "profiel1",
    ];
  }

  private toStudentApiRecord(
    rawStudent: unknown,
  ): MagisterStudentApiRecord | null {
    if (!rawStudent || typeof rawStudent !== "object") {
      return null;
    }

    const student = rawStudent as Record<string, unknown>;
    const id = Number(student.id);
    const roepnaam =
      typeof student.roepnaam === "string" ? student.roepnaam : "";
    const achternaam =
      typeof student.achternaam === "string" ? student.achternaam : "";
    const code = typeof student.code === "string" ? student.code : "";
    const emailadres =
      typeof student.emailadres === "string" ? student.emailadres : "";

    if (!Number.isFinite(id) || !roepnaam || !achternaam || !code) {
      return null;
    }

    return {
      id,
      voorletters:
        typeof student.voorletters === "string"
          ? student.voorletters
          : undefined,
      roepnaam,
      tussenvoegsel:
        typeof student.tussenvoegsel === "string"
          ? student.tussenvoegsel
          : undefined,
      achternaam,
      code,
      emailadres,
      telefoonnummer:
        typeof student.telefoonnummer === "string"
          ? student.telefoonnummer
          : undefined,
      klassen: Array.isArray(student.klassen)
        ? student.klassen.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      lesgroepen: Array.isArray(student.lesgroepen)
        ? student.lesgroepen.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      studies: Array.isArray(student.studies)
        ? student.studies.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
      profiel1:
        typeof student.profiel1 === "string" ? student.profiel1 : undefined,
      externeId:
        typeof student.externeId === "string" ? student.externeId : undefined,
      links:
        student.links && typeof student.links === "object"
          ? (student.links as MagisterStudentApiRecord["links"])
          : undefined,
      vakken: Array.isArray(student.vakken) ? student.vakken : undefined,
    };
  }

  private extractRegistrationIds(registrations: unknown): string[] {
    const items = this.asArray(registrations) as MagisterRegistrationRecord[];
    const ids = new Set<string>();

    const addIdFromUnknown = (rawId: unknown) => {
      if (rawId === undefined || rawId === null) return;
      const asString = String(rawId).trim();
      if (asString.length === 0) return;

      ids.add(asString);
    };

    items.forEach((record) => {
      if (!record || typeof record !== "object") return;

      const linkDerivedIds = new Set<string>();

      const links = record.links;
      if (links && typeof links === "object") {
        Object.values(links as Record<string, unknown>).forEach((linkValue) => {
          if (linkValue && typeof linkValue === "object") {
            const href = (linkValue as Record<string, unknown>).href;
            const registrationId = this.extractRegistrationIdFromHref(href);
            if (registrationId) {
              linkDerivedIds.add(registrationId);
            }
          }
        });
      }

      const directHrefId = this.extractRegistrationIdFromHref(record.href);
      if (directHrefId) {
        linkDerivedIds.add(directHrefId);
      }

      const directUrlId = this.extractRegistrationIdFromHref(record.url);
      if (directUrlId) {
        linkDerivedIds.add(directUrlId);
      }

      // Prefer canonical IDs from registration links.
      if (linkDerivedIds.size > 0) {
        linkDerivedIds.forEach((registrationId) => ids.add(registrationId));
        return;
      }

      const explicitRegistrationId =
        record.aanmeldingId ??
        record.aanmeldingid ??
        record.inschrijvingId ??
        record.inschrijvingid ??
        record.id;

      addIdFromUnknown(explicitRegistrationId);
    });

    return Array.from(ids);
  }

  private async tryAuthenticatedRequest(
    endpoint: string,
    options: MagisterRequestOptions = {},
  ): Promise<unknown | null> {
    try {
      return await this.makeAuthenticatedRequest(endpoint, options);
    } catch {
      return null;
    }
  }

  private async getRegistrationsForStudent(
    studentId: number,
  ): Promise<string[]> {
    const endpoints = [
      `/api/leerlingen/${studentId}/aanmeldingen`,
      `/api/leerlingen/${studentId}/inschrijvingen`,
    ];

    for (const endpoint of endpoints) {
      const response = await this.tryAuthenticatedRequest(endpoint, {
        suppressNotFound: true,
      });
      if (!response) {
        continue;
      }

      const registrationIds = this.extractRegistrationIds(response);
      if (registrationIds.length > 0) {
        return registrationIds;
      }
    }

    return [];
  }

  private extractDirectTeacherNames(subject: unknown): string[] {
    if (!subject || typeof subject !== "object") return [];

    const record = subject as Record<string, unknown>;
    const names = new Set<string>();

    const addName = (value: unknown) => {
      if (typeof value === "string" && value.trim().length > 0) {
        names.add(value.trim());
      }
    };

    addName(record.docentNaam);
    addName(record.DocentNaam);
    addName(record.docent);
    addName(record.Docent);
    addName(record.teacherName);
    addName(record.TeacherName);
    addName(record.teacher);
    addName(record.Teacher);
    addName(record.vakDocent);
    addName(record.VakDocent);

    return Array.from(names);
  }

  private extractTeacherCandidates(subject: unknown): TeacherCandidate[] {
    const candidates: TeacherCandidate[] = [];

    const directNames = this.extractDirectTeacherNames(subject);
    directNames.forEach((name) => {
      candidates.push({ fullName: name });
    });

    if (!subject || typeof subject !== "object") {
      return candidates;
    }

    const record = subject as Record<string, unknown>;
    const teacherCollections = [
      record.docenten,
      record.Docenten,
      record.teachers,
      record.Teachers,
    ];

    teacherCollections.forEach((collection) => {
      this.asArray(collection).forEach((entry) => {
        if (!entry || typeof entry !== "object") {
          return;
        }

        const teacher = entry as Record<string, unknown>;
        const firstName =
          typeof teacher.roepnaam === "string"
            ? teacher.roepnaam.trim()
            : typeof teacher.Roepnaam === "string"
              ? teacher.Roepnaam.trim()
              : "";
        const lastName =
          typeof teacher.achternaam === "string"
            ? teacher.achternaam.trim()
            : typeof teacher.Achternaam === "string"
              ? teacher.Achternaam.trim()
              : "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ");

        let employeeId: string | undefined;
        const links = teacher.links ?? teacher.Links;
        if (links && typeof links === "object") {
          const selfLink =
            (links as Record<string, unknown>).self ??
            (links as Record<string, unknown>).Self;
          if (selfLink && typeof selfLink === "object") {
            employeeId = this.extractEmployeeIdFromHref(
              (selfLink as Record<string, unknown>).href ??
                (selfLink as Record<string, unknown>).Href,
            );
          }
        }

        if (!employeeId) {
          const rawEmployeeId =
            teacher.medewerkerId ??
            teacher.medewerkerid ??
            teacher.MedewerkerId ??
            teacher.MedewerkerID;
          if (rawEmployeeId !== undefined && rawEmployeeId !== null) {
            employeeId = String(rawEmployeeId);
          }
        }

        const code =
          typeof teacher.code === "string" && teacher.code.trim().length > 0
            ? teacher.code.trim().toUpperCase()
            : typeof teacher.Code === "string" && teacher.Code.trim().length > 0
              ? teacher.Code.trim().toUpperCase()
              : undefined;

        candidates.push({
          fullName: fullName || undefined,
          lastName: lastName || undefined,
          code,
          employeeId,
        });
      });
    });

    return candidates;
  }

  private teacherCandidateMatchesIdentity(
    candidate: TeacherCandidate,
    identity: TeacherIdentity,
  ): boolean {
    if (identity.employeeId && candidate.employeeId) {
      return identity.employeeId === candidate.employeeId;
    }

    if (identity.code && candidate.code) {
      return identity.code.toUpperCase() === candidate.code.toUpperCase();
    }

    if (identity.name && candidate.fullName) {
      return this.teacherNameMatches(candidate.fullName, identity.name, true);
    }

    if (identity.lastName && candidate.lastName) {
      return (
        this.normalizeForCompare(identity.lastName) ===
        this.normalizeForCompare(candidate.lastName)
      );
    }

    return false;
  }

  private getStudentClassPrefixes(studentClassNames?: string[]): string[] {
    if (!Array.isArray(studentClassNames) || studentClassNames.length === 0) {
      return [];
    }

    const prefixes = new Set<string>();
    studentClassNames.forEach((className) => {
      if (typeof className !== "string") return;
      const normalized = className.trim().toLowerCase();
      if (!normalized) return;

      // Exact class (e.g. ck4b) and level prefix (e.g. ck4).
      prefixes.add(normalized);
      const levelPrefixMatch = normalized.match(/^([a-z]+\d+)/i);
      if (levelPrefixMatch?.[1]) {
        prefixes.add(levelPrefixMatch[1].toLowerCase());
      }
    });

    return Array.from(prefixes);
  }

  private isRelevantLessonGroupForStudent(
    groupName: string,
    studentClassPrefixes: string[],
  ): boolean {
    const normalizedGroup = groupName.trim().toLowerCase();
    if (!normalizedGroup) {
      return false;
    }

    // Exclude broad/service groups.
    if (!normalizedGroup.includes(".")) {
      return false;
    }
    if (normalizedGroup.startsWith("c_")) {
      return false;
    }

    if (studentClassPrefixes.length === 0) {
      return true;
    }

    return studentClassPrefixes.some((prefix) =>
      normalizedGroup.startsWith(`${prefix}.`),
    );
  }

  private extractGroupName(subject: unknown): string | null {
    if (!subject || typeof subject !== "object") return null;

    const record = subject as Record<string, unknown>;
    const candidates = [
      record.groep,
      record.Groep,
      record.groepNaam,
      record.GroepNaam,
      record.groepsnaam,
      record.Groepsnaam,
      record.groepcode,
      record.Groepcode,
      record.group,
      record.Group,
      record.groupName,
      record.GroupName,
      record.lesgroep,
      record.Lesgroep,
      record.lesgroepNaam,
      record.LesgroepNaam,
      record.className,
      record.ClassName,
      record.naam,
      record.Naam,
    ];

    const fromObject = (value: unknown): string | null => {
      if (!value || typeof value !== "object") {
        return null;
      }

      const nested = value as Record<string, unknown>;
      const nestedCandidates = [
        nested.code,
        nested.Code,
        nested.naam,
        nested.Naam,
        nested.omschrijving,
        nested.Omschrijving,
        nested.groepcode,
        nested.Groepcode,
        nested.groupCode,
        nested.GroupCode,
        nested.groepsnaam,
        nested.Groepsnaam,
        nested.groepNaam,
        nested.GroepNaam,
        nested.lesgroep,
        nested.Lesgroep,
        nested.lesgroepNaam,
        nested.LesgroepNaam,
      ];

      for (const nestedCandidate of nestedCandidates) {
        if (
          typeof nestedCandidate === "string" &&
          nestedCandidate.trim().length > 0
        ) {
          return nestedCandidate.trim();
        }
      }

      return null;
    };

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }

      const nestedGroup = fromObject(candidate);
      if (nestedGroup) {
        return nestedGroup;
      }

      if (Array.isArray(candidate)) {
        for (const entry of candidate) {
          const nestedArrayGroup = fromObject(entry);
          if (nestedArrayGroup) {
            return nestedArrayGroup;
          }
          if (typeof entry === "string" && entry.trim().length > 0) {
            return entry.trim();
          }
        }
      }
    }

    return null;
  }

  private extractSubjectName(subject: unknown): string | null {
    if (!subject || typeof subject !== "object") return null;

    const record = subject as Record<string, unknown>;
    const candidates = [
      record.vak,
      record.Vak,
      record.vakNaam,
      record.VakNaam,
      record.vaknaam,
      record.subject,
      record.Subject,
      record.subjectName,
      record.SubjectName,
      record.naam,
      record.Naam,
      record.studievak,
      record.Studievak,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
      if (candidate && typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;
        const nestedName =
          nested.naam ?? nested.vakNaam ?? nested.vaknaam ?? nested.name;
        if (typeof nestedName === "string" && nestedName.trim().length > 0) {
          return nestedName.trim();
        }
      }
    }

    return null;
  }

  private async getSubjectsForRegistration(
    studentId: number,
    registrationId: string,
  ): Promise<unknown[]> {
    const endpoints = [`/api/aanmeldingen/${registrationId}/vakken`];

    const debugData: SubjectFetchDebugData = {
      timestamp: new Date().toISOString(),
      studentId,
      registrationId,
      endpointTried: [...endpoints],
      endpointResults: [],
      subjectCount: 0,
    };

    let bestSubjectsWithoutGroup: unknown[] | null = null;
    let bestEndpointWithoutGroup: string | undefined;

    for (const endpoint of endpoints) {
      let response: unknown | null = null;
      try {
        response = await this.makeAuthenticatedRequest(endpoint, {
          suppressNotFound: true,
        });
      } catch (error) {
        debugData.endpointResults?.push({
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        continue;
      }

      if (response === null || response === undefined) {
        debugData.endpointResults?.push({
          endpoint,
          success: true,
          responseType: "nullish",
        });
        continue;
      }

      const responseType = Array.isArray(response) ? "array" : typeof response;
      const responsePreview =
        typeof response === "string"
          ? response.slice(0, 250)
          : JSON.stringify(response).slice(0, 250);
      debugData.endpointResults?.push({
        endpoint,
        success: true,
        responseType,
        responsePreview,
      });

      const subjects = this.extractSubjectsArray(response);
      if (subjects.length > 0) {
        const hasGroupInfo = subjects.some(
          (subject) => this.extractGroupName(subject) !== null,
        );

        if (hasGroupInfo) {
          debugData.successfulEndpoint = endpoint;
          debugData.subjectCount = subjects.length;
          debugData.responseSample = subjects[0] ?? null;
          this.writeSubjectFetchDebug(debugData);
          return subjects;
        }

        if (!bestSubjectsWithoutGroup) {
          bestSubjectsWithoutGroup = subjects;
          bestEndpointWithoutGroup = endpoint;
        }
      }
    }

    if (bestSubjectsWithoutGroup) {
      debugData.successfulEndpoint = bestEndpointWithoutGroup;
      debugData.subjectCount = bestSubjectsWithoutGroup.length;
      debugData.responseSample = bestSubjectsWithoutGroup[0] ?? null;
      this.writeSubjectFetchDebug(debugData);
      return bestSubjectsWithoutGroup;
    }

    this.writeSubjectFetchDebug(debugData);

    return [];
  }

  private async getSubjectsForStudentWithoutRegistration(
    studentId: number,
  ): Promise<unknown[]> {
    const endpoints = [`/api/leerlingen/${studentId}/vakken`];

    for (const endpoint of endpoints) {
      const response = await this.tryAuthenticatedRequest(endpoint, {
        suppressNotFound: true,
      });
      if (!response) {
        continue;
      }

      const subjects = this.extractSubjectsArray(response);
      if (subjects.length > 0) {
        return subjects;
      }
    }

    return [];
  }

  private async getTeacherFilteredGroupsForStudent(
    studentId: number,
    teacherIdentity: TeacherIdentity,
    preloadedSubjects?: unknown[],
    studentClassNames?: string[],
  ): Promise<{ groups: string[]; subjects: MatchedSubjectRecord[] }> {
    if (
      !teacherIdentity.employeeId &&
      !teacherIdentity.code &&
      !teacherIdentity.name &&
      !teacherIdentity.lastName
    ) {
      return { groups: [], subjects: [] };
    }
    const studentClassPrefixes =
      this.getStudentClassPrefixes(studentClassNames);

    const registrationIds = await this.getRegistrationsForStudent(studentId);

    if (registrationIds.length === 0) {
      logger.debug(
        `No registrations found for student ${studentId}; skipping teacher-group enrichment`,
      );
    }

    const groups = new Set<string>();
    const subjectRecords = new Map<string, MatchedSubjectRecord>();
    let hasAnyTeacherMatch = false;

    const registrationSubjects: Array<{
      registrationId?: string;
      subjects: unknown[];
    }> = [];

    const processSubjects = (
      subjects: unknown[],
      registrationId?: string,
      requireTeacherMatch = true,
    ) => {
      subjects.forEach((subject) => {
        const directTeacherNames = this.extractDirectTeacherNames(subject);
        const teacherCandidates = this.extractTeacherCandidates(subject);
        const teacherNamesFromCandidates = teacherCandidates
          .map((candidate) => candidate.fullName?.trim())
          .filter((name): name is string => Boolean(name));

        // Only trust explicit teacher fields per subject; no broad list fallback.
        const teacherMatches =
          teacherCandidates.length > 0 &&
          teacherCandidates.some((candidate) =>
            this.teacherCandidateMatchesIdentity(candidate, teacherIdentity),
          );

        if (teacherMatches) {
          hasAnyTeacherMatch = true;
        }

        if (requireTeacherMatch && !teacherMatches) return;

        const groupName = this.extractGroupName(subject);
        if (
          groupName &&
          this.isRelevantLessonGroupForStudent(groupName, studentClassPrefixes)
        ) {
          const recordKey = `${registrationId ?? "none"}::${groupName}`;
          const existing = subjectRecords.get(recordKey);
          const combinedTeacherNames = Array.from(
            new Set([
              ...(existing?.teacherNames ?? []),
              ...directTeacherNames,
              ...teacherNamesFromCandidates,
            ]),
          );

          // Ignore groups without any resolvable teacher name.
          if (combinedTeacherNames.length === 0) {
            return;
          }

          groups.add(groupName);

          subjectRecords.set(recordKey, {
            group: groupName,
            teacherNames: combinedTeacherNames,
            subjectName:
              existing?.subjectName ??
              this.extractSubjectName(subject) ??
              undefined,
            registrationId,
          });
        }
      });
    };

    if (preloadedSubjects && preloadedSubjects.length > 0) {
      processSubjects(preloadedSubjects);
      registrationSubjects.push({ subjects: preloadedSubjects });
      if (groups.size > 0) {
        return {
          groups: Array.from(groups),
          subjects: Array.from(subjectRecords.values()),
        };
      }
    }

    for (const registrationId of registrationIds) {
      const subjects = await this.getSubjectsForRegistration(
        studentId,
        registrationId,
      );

      if (subjects.length === 0) {
        logger.debug(
          `No subjects found for student ${studentId} registration ${registrationId}`,
        );
      }

      registrationSubjects.push({ registrationId, subjects });
      processSubjects(subjects, registrationId);
    }

    if (groups.size === 0) {
      const directSubjects =
        await this.getSubjectsForStudentWithoutRegistration(studentId);
      registrationSubjects.push({ subjects: directSubjects });
      processSubjects(directSubjects);
    }

    // Fallback: some tenants omit/flatten teacher linkage in vakken payloads.
    // If we could not match the teacher at all, still surface relevant
    // subject/group info instead of persisting an entirely empty result.
    if (groups.size === 0 && !hasAnyTeacherMatch) {
      registrationSubjects.forEach((entry) => {
        processSubjects(entry.subjects, entry.registrationId, false);
      });
    }

    return {
      groups: Array.from(groups),
      subjects: Array.from(subjectRecords.values()),
    };
  }

  constructor() {
    // Don't load stored auth in constructor, wait for app ready
  }

  /**
   * Opens a login window and handles the authentication flow
   */
  async authenticate(): Promise<MagisterAuthData | null> {
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const authWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
        },
      });

      const resolveAuth = (data: MagisterAuthData | null) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          if (data) {
            resolve(data);
          } else {
            reject(new Error("No authentication data found"));
          }
        }
      };

      const rejectAuth = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          reject(error);
        }
      };

      // Load the Magister login page
      authWindow.loadURL(`${this.baseUrl}/op/#/vandaag`);

      // Add manual authentication and cancel buttons
      authWindow.webContents.on("dom-ready", () => {
        authWindow.webContents.executeJavaScript(`
          (function() {
            // Listen for cancel/extract auth messages
            window.addEventListener('message', function(event) {
              if (event.data.type === 'CANCEL_AUTH') {
                // Signal cancellation by setting a flag
                localStorage.setItem('__auth_cancelled__', 'true');
                window.close();
              } else if (event.data.type === 'EXTRACT_AUTH') {
                // Signal manual extraction
                localStorage.setItem('__manual_extract__', 'true');
                console.log('Manual extraction triggered - checking for tokens...');
              }
            });
            
            // Create a cancel button
            const cancelButton = document.createElement('button');
            cancelButton.innerHTML = '✕ Cancel Login';
            cancelButton.style.position = 'fixed';
            cancelButton.style.top = '10px';
            cancelButton.style.left = '10px';
            cancelButton.style.zIndex = '10000';
            cancelButton.style.padding = '10px 15px';
            cancelButton.style.backgroundColor = '#dc2626';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontSize = '14px';
            cancelButton.style.fontWeight = 'bold';
            
            cancelButton.onclick = function() {
              window.postMessage({ type: 'CANCEL_AUTH' }, '*');
            };
            
            document.body.appendChild(cancelButton);
            
            // Create a debug button
            const debugButton = document.createElement('button');
            debugButton.innerHTML = 'Extract Auth (Debug)';
            debugButton.style.position = 'fixed';
            debugButton.style.top = '10px';
            debugButton.style.right = '10px';
            debugButton.style.zIndex = '10000';
            debugButton.style.padding = '10px';
            debugButton.style.backgroundColor = '#007ACC';
            debugButton.style.color = 'white';
            debugButton.style.border = 'none';
            debugButton.style.borderRadius = '5px';
            debugButton.style.cursor = 'pointer';
            
            debugButton.onclick = function() {
              console.log('Extract Auth button clicked');
              window.postMessage({ type: 'EXTRACT_AUTH' }, '*');
              
              // Give visual feedback
              debugButton.innerHTML = 'Extracting...';
              debugButton.style.backgroundColor = '#fbbf24';
            };
            
            document.body.appendChild(debugButton);
          })();
        `);

        // Check for manual extraction trigger
        authWindow.webContents.executeJavaScript(`
          (function() {
            setInterval(function() {
              const manualExtract = localStorage.getItem('__manual_extract__');
              if (manualExtract === 'true') {
                localStorage.removeItem('__manual_extract__');
                console.log('Manual extraction flag detected');
                // This will be picked up by the main process
                document.title = 'EXTRACT_NOW';
              }
            }, 500);
          })();
        `);
      });

      // Listen for navigation events
      authWindow.webContents.on("did-navigate", async (event, url) => {
        // Check if we're on a page that might have authentication data
        if (
          url.includes("magister.net") &&
          !url.includes("/login") &&
          !url.includes("/auth")
        ) {
          setTimeout(async () => {
            try {
              const tokenData = await this.extractTokenFromBrowser(authWindow);
              if (tokenData) {
                this.authData = tokenData;
                await this.storeAuth(tokenData);
                resolveAuth(tokenData);
              }
            } catch (error) {
              logger.error("Error extracting token after navigation:", error);
            }
          }, 2000); // Wait 2 seconds for page to fully load
        }
      });

      // Listen for page load completion
      authWindow.webContents.on("did-finish-load", async () => {
        const currentUrl = authWindow.webContents.getURL();

        // Try token extraction on page load
        if (
          currentUrl.includes("magister.net") &&
          !currentUrl.includes("/login")
        ) {
          setTimeout(async () => {
            try {
              const tokenData = await this.extractTokenFromBrowser(authWindow);
              if (tokenData) {
                this.authData = tokenData;
                await this.storeAuth(tokenData);
                resolveAuth(tokenData);
              }
            } catch (error) {
              logger.error("Error extracting token on page load:", error);
            }
          }, 1000);
        }
      });

      // Listen for manual extraction trigger (via page title change)
      authWindow.webContents.on("page-title-updated", async (event, title) => {
        if (title === "EXTRACT_NOW") {
          logger.debug("Manual extraction triggered via title");
          try {
            const tokenData = await this.extractTokenFromBrowser(authWindow);
            if (tokenData) {
              this.authData = tokenData;
              await this.storeAuth(tokenData);
              resolveAuth(tokenData);
            } else {
              logger.error("No token found during manual extraction");
            }
          } catch (error) {
            logger.error("Error during manual extraction:", error);
          }
        }
      });

      // Handle window closed by user
      authWindow.on("closed", async () => {
        if (!isResolved) {
          // Check if it was cancelled by the user via the cancel button
          try {
            const wasCancelled = await authWindow.webContents
              .executeJavaScript(`localStorage.getItem('__auth_cancelled__')`)
              .catch(() => null);

            if (wasCancelled === "true") {
              rejectAuth(new Error("Login cancelled by user"));
            } else {
              rejectAuth(new Error("Authentication window was closed"));
            }
          } catch {
            rejectAuth(new Error("Authentication window was closed"));
          }
        }
      });

      // Set a timeout for authentication
      setTimeout(() => {
        if (!isResolved) {
          rejectAuth(new Error("Authentication timeout - please try again"));
        }
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Extracts JWT token from the browser session
   */
  private async extractTokenFromBrowser(
    window: BrowserWindow,
  ): Promise<MagisterAuthData | null> {
    try {
      // Execute JavaScript in the renderer to get tokens from various sources
      const result = await window.webContents.executeJavaScript(`
        (function() {
          // Check all possible localStorage keys
          const localStorageKeys = Object.keys(localStorage);
          
          const localStorageToken = localStorage.getItem('access_token') || 
                                   localStorage.getItem('token') ||
                                   localStorage.getItem('jwt') ||
                                   localStorage.getItem('authToken') ||
                                   localStorage.getItem('auth_token') ||
                                   localStorage.getItem('accessToken') ||
                                   localStorage.getItem('magister_token') ||
                                   localStorage.getItem('bearer_token');
          
          // Check sessionStorage
          const sessionStorageKeys = Object.keys(sessionStorage);
          
          const sessionStorageToken = sessionStorage.getItem('access_token') || 
                                     sessionStorage.getItem('token') ||
                                     sessionStorage.getItem('jwt') ||
                                     sessionStorage.getItem('authToken') ||
                                     sessionStorage.getItem('auth_token') ||
                                     sessionStorage.getItem('accessToken') ||
                                     sessionStorage.getItem('magister_token') ||
                                     sessionStorage.getItem('bearer_token');

          // Check cookies
          const cookies = document.cookie;
          
          // Look for JWT patterns in cookies
          const jwtPattern = /[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,}/g;
          const potentialTokens = cookies.match(jwtPattern) || [];
          
          // Check for tokens in all localStorage values
          const allLocalStorageTokens = [];
          for (const key of localStorageKeys) {
            const value = localStorage.getItem(key);
            if (value && jwtPattern.test(value)) {
              allLocalStorageTokens.push({ key, value });
            }
          }
          
          // Check for tokens in all sessionStorage values
          const allSessionStorageTokens = [];
          for (const key of sessionStorageKeys) {
            const value = sessionStorage.getItem(key);
            if (value && jwtPattern.test(value)) {
              allSessionStorageTokens.push({ key, value });
            }
          }
          
          // Check if we can access any authentication objects in the global scope
          let authObject = null;
          try {
            // Common authentication object names
            authObject = window.auth || window.authentication || window.user || window.currentUser;
          } catch (e) {
            // No global auth object available
          }
          
          return {
            localStorage: localStorageToken,
            sessionStorage: sessionStorageToken,
            cookies: cookies,
            potentialTokens: potentialTokens,
            allLocalStorageTokens: allLocalStorageTokens,
            allSessionStorageTokens: allSessionStorageTokens,
            authObject: authObject,
            url: window.location.href,
            localStorageKeys: localStorageKeys,
            sessionStorageKeys: sessionStorageKeys
          };
        })()
      `);

      // Try to find a valid JWT token from various sources
      let token = result.localStorage || result.sessionStorage;

      // If no direct token found, try from discovered tokens
      if (
        !token &&
        result.allLocalStorageTokens &&
        result.allLocalStorageTokens.length > 0
      ) {
        token = result.allLocalStorageTokens[0].value;
      }

      if (
        !token &&
        result.allSessionStorageTokens &&
        result.allSessionStorageTokens.length > 0
      ) {
        // Check if this is an OIDC token structure
        const sessionValue = result.allSessionStorageTokens[0].value;

        try {
          // Try to parse as JSON (OIDC structure)
          const oidcData = JSON.parse(sessionValue);
          if (oidcData.access_token) {
            token = oidcData.access_token;
          } else if (oidcData.id_token) {
            token = oidcData.id_token;
          } else {
            token = sessionValue;
          }
        } catch {
          // If not JSON, use as-is
          token = sessionValue;
        }
      }

      if (
        !token &&
        result.potentialTokens &&
        result.potentialTokens.length > 0
      ) {
        token = result.potentialTokens[0];
      }

      // Try to extract from auth object
      if (!token && result.authObject) {
        try {
          token =
            result.authObject.token ||
            result.authObject.accessToken ||
            result.authObject.jwt;
        } catch {
          // Could not extract token from auth object
        }
      }

      if (token) {
        return {
          token,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Default 24 hours
        };
      }

      return null;
    } catch (error) {
      logger.error("Error extracting token from browser:", error);
      return null;
    }
  }

  /**
   * Makes an authenticated request to the Magister API
   */
  async makeAuthenticatedRequest(
    endpoint: string,
    options: MagisterRequestOptions = {},
  ): Promise<unknown> {
    if (!this.authData || this.isTokenExpired()) {
      throw new Error("Not authenticated or token expired");
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    if (this.isVerboseMagisterDebugEnabled()) {
      logger.debug(`Making API request to: ${url}`);
    }

    const {
      suppressErrorLogging = false,
      suppressNotFound = false,
      ...fetchOptions
    } = options;

    const maxRateLimitRetries = 2;

    for (let attempt = 0; attempt <= maxRateLimitRetries; attempt++) {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          Authorization: `Bearer ${this.authData.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...fetchOptions.headers,
        },
      });

      if (this.isVerboseMagisterDebugEnabled()) {
        logger.debug(`API Response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const responseText = await response.text();

        if (response.status === 429 && attempt < maxRateLimitRetries) {
          const waitMs = this.getRateLimitDelayMs(
            response,
            responseText,
            attempt,
          );
          if (this.isVerboseMagisterDebugEnabled()) {
            logger.debug(
              `Rate limited on ${endpoint}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRateLimitRetries})`,
            );
          }
          await this.delay(waitMs);
          continue;
        }

        if (
          !(suppressNotFound && response.status === 404) &&
          !suppressErrorLogging
        ) {
          logger.debug(`API Error Response: ${responseText}`);
        }
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${responseText}`,
        );
      }

      const responseData = await response.json();
      if (this.isVerboseMagisterDebugEnabled()) {
        logger.debug("API Response Data:", responseData);
      }
      return responseData;
    }

    throw new Error(
      `API request failed: exceeded retry budget for endpoint ${endpoint}`,
    );
  }

  /**
   * Get today's schedule/information
   */
  async getTodayInfo(): Promise<MagisterTodayInfo> {
    try {
      // Get today's date in the format Magister expects
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Test the known working endpoint first to verify API access
      logger.debug("Testing known working endpoint first...");
      try {
        const testResponse = await this.makeAuthenticatedRequest(
          "/api/leerlingen/zoeken?q=**&top=1&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam",
        );
        logger.debug("Test endpoint successful! API access confirmed.");
        logger.debug("Test response:", testResponse);
      } catch (error) {
        logger.debug("Test endpoint failed:", error);
      }

      // Try schedule/agenda endpoints based on the working API pattern
      const endpoints = [
        `/api/leerlingen/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/leerlingen/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/leerlingen/rooster?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/rooster?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/rooster?vanaf=${dateStr}&tot=${dateStr}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.makeAuthenticatedRequest(endpoint);
          return data as MagisterTodayInfo;
        } catch {
          logger.debug(`Endpoint ${endpoint} failed, trying next...`);
        }
      }

      throw new Error("No working endpoints found");
    } catch (error) {
      logger.error("Error fetching today info:", error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserInfo(): Promise<MagisterUserInfo> {
    try {
      // Test the search endpoint to get current user info
      logger.debug("Testing user search endpoint...");
      try {
        const searchResponse = await this.makeAuthenticatedRequest(
          "/api/leerlingen/zoeken?q=**&top=10&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam&velden=klassen&velden=emailadres",
        );
        logger.debug("User search successful:", searchResponse);

        // Try to extract current user from search results
        const searchData = searchResponse as { items?: unknown[] };
        if (
          searchData &&
          Array.isArray(searchData.items) &&
          searchData.items.length > 0
        ) {
          // For now, return the first user (this might need refinement)
          const user = searchData.items[0] as Record<string, unknown>;
          return {
            id: (user.stamnummer as string) || (user.id as string) || "unknown",
            name:
              ((user.naam as Record<string, unknown>)
                ?.volledigeNaam as string) ||
              (user.roepnaam as string) ||
              "Unknown User",
            email: user.emailadres as string,
            class:
              (user.klassen as unknown[]) &&
              (user.klassen as unknown[]).length > 0
                ? ((user.klassen as Record<string, unknown>[])[0]
                    .naam as string)
                : undefined,
          } as MagisterUserInfo;
        }
      } catch (error) {
        logger.debug("User search endpoint failed:", error);
      }

      // Try other user info endpoints
      const endpoints = [
        "/api/leerlingen/me",
        "/api/personen/leerling",
        "/api/account/me",
        "/api/leerling/me",
        "/api/personen/leerling/basisprofiel",
        "/api/personen/leerling/profiel",
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.makeAuthenticatedRequest(endpoint);
          return data as MagisterUserInfo;
        } catch {
          logger.debug(`Endpoint ${endpoint} failed, trying next...`);
        }
      }

      throw new Error("No working user info endpoints found");
    } catch (error) {
      logger.error("Error fetching user info:", error);
      throw error;
    }
  }

  /**
   * Check if the current token is expired
   */
  private isTokenExpired(): boolean {
    return !this.authData || Date.now() > this.authData.expiresAt;
  }

  /**
   * Store authentication data securely
   */
  private async storeAuth(authData: MagisterAuthData): Promise<void> {
    try {
      // In a real app, you'd want to encrypt this data
      await session.defaultSession.cookies.set({
        url: "https://local-storage",
        name: "magister_auth",
        value: JSON.stringify(authData),
        secure: true,
        httpOnly: true,
      });
    } catch (error) {
      logger.error("Error storing auth data:", error);
    }
  }

  /**
   * Load stored authentication data
   */
  private async loadStoredAuth(): Promise<void> {
    try {
      const cookies = await session.defaultSession.cookies.get({
        url: "https://local-storage",
        name: "magister_auth",
      });

      if (cookies.length > 0) {
        const authData = JSON.parse(cookies[0].value);
        if (!this.isTokenExpiredForData(authData)) {
          this.authData = authData;
        }
      }
    } catch (error) {
      logger.error("Error loading stored auth:", error);
    }
  }

  private isTokenExpiredForData(authData: MagisterAuthData): boolean {
    return Date.now() > authData.expiresAt;
  }

  /**
   * Clear stored authentication data
   */
  async logout(): Promise<void> {
    this.authData = null;
    try {
      await session.defaultSession.cookies.remove(
        "https://local-storage",
        "magister_auth",
      );
    } catch (error) {
      logger.error("Error clearing auth data:", error);
    }
  }

  /**
   * Test API connectivity with known working endpoint (limited to 5 students)
   */
  async testAPI(): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      logger.debug("Testing Magister API connectivity...");
      const response = await this.makeAuthenticatedRequest(
        "/api/leerlingen/zoeken?q=**&top=5&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam&velden=klassen&velden=emailadres",
      );
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "API test failed",
      };
    }
  }

  /**
   * Fetch all students from the API
   */
  async getAllStudents(teacherNameFilter?: string): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      logger.debug("Fetching all students from Magister API...");
      const response = await this.makeAuthenticatedRequest(
        this.buildStudentSearchEndpoint(this.getPrimaryStudentSearchFields()),
      );

      const responseData = response as { items?: unknown[] };

      const filterName =
        typeof teacherNameFilter === "string" &&
        teacherNameFilter.trim().length > 0
          ? teacherNameFilter.trim()
          : undefined;

      const teacherIdentity = await this.resolveTeacherIdentity(filterName);

      if (teacherIdentity && Array.isArray(responseData.items)) {
        logger.debug(
          `Applying teacher filter for student groups with identity: ${JSON.stringify(
            {
              name: teacherIdentity.name,
              employeeId: teacherIdentity.employeeId,
              code: teacherIdentity.code,
              lastName: teacherIdentity.lastName,
            },
          )}`,
        );

        const enrichedItems: unknown[] = [];
        for (const rawStudent of responseData.items) {
          const student = this.toStudentApiRecord(rawStudent);
          if (!student) {
            enrichedItems.push(rawStudent);
            continue;
          }

          try {
            const preloadedSubjects = Array.isArray(student.vakken)
              ? student.vakken
              : [];
            const matchResult = await this.getTeacherFilteredGroupsForStudent(
              student.id,
              teacherIdentity,
              preloadedSubjects,
              student.klassen,
            );

            enrichedItems.push({
              ...student,
              lesgroepen: matchResult.groups,
              vakken: matchResult.subjects,
            });
          } catch (error) {
            logger.debug(
              `Failed to enrich student ${student.id} with teacher-filtered groups:`,
              error,
            );
            enrichedItems.push(student);
          }
        }

        responseData.items = enrichedItems;
      }

      logger.debug(
        `Successfully fetched ${responseData.items?.length || 0} students from API`,
      );
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch all students",
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Load stored auth if not already loaded
    if (this.authData === null) {
      await this.loadStoredAuth();
    }
    return this.authData !== null && !this.isTokenExpired();
  }

  /**
   * Fetch student photo with authentication
   */
  async fetchStudentPhoto(
    studentId: number,
    photoHref?: string,
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!this.authData || !this.authData.token) {
        return { success: false, error: "Not authenticated" };
      }

      const normalizedHref =
        typeof photoHref === "string" && photoHref.trim().length > 0
          ? photoHref.trim()
          : `/api/leerlingen/${studentId}/foto`;
      const url = normalizedHref.startsWith("http")
        ? normalizedHref
        : `${this.baseUrl}${normalizedHref}`;
      logger.debug(`Fetching student photo: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authData.token}`,
          Accept: "image/*",
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        const detail = responseText.trim().slice(0, 200);
        logger.debug(
          `Photo fetch failed: ${response.status} ${response.statusText} ${detail}`,
        );
        return {
          success: false,
          error: detail
            ? `Failed to fetch photo: ${response.status} ${response.statusText} - ${detail}`
            : `Failed to fetch photo: ${response.status} ${response.statusText}`,
        };
      }

      // Convert response to base64 data URL (works across Electron processes)
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const mimeType = blob.type || "image/jpeg"; // fallback to jpeg
      const dataUrl = `data:${mimeType};base64,${base64}`;

      logger.debug(
        `Successfully fetched photo for student ${studentId} (${mimeType}, ${buffer.length} bytes)`,
      );
      return { success: true, data: dataUrl };
    } catch (error) {
      logger.error("Error fetching student photo:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear all authentication data and session
   */
  async clearToken(): Promise<void> {
    logger.debug("Clearing authentication token and session data...");

    this.authData = null;

    // Clear from localStorage
    try {
      localStorage.removeItem("magister_auth");
      logger.debug("Cleared authentication data from localStorage");
    } catch (error) {
      logger.warn("Failed to clear localStorage:", error);
    }

    // Clear any session data
    try {
      const defaultSession = session.defaultSession;
      await defaultSession.clearStorageData({
        storages: ["cookies", "localstorage"],
        origin: "https://merletcollege.magister.net",
      });
      logger.debug("Cleared Magister session data");
    } catch (error) {
      logger.warn("Failed to clear session data:", error);
    }
  }
}

// Export singleton instance (created lazily)
let _magisterAPI: MagisterAPI | null = null;

export const magisterAPI = {
  get instance(): MagisterAPI {
    if (!_magisterAPI) {
      _magisterAPI = new MagisterAPI();
    }
    return _magisterAPI;
  },
};
