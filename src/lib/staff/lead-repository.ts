export type SpeakingLeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost"
  | "spam";

export type SpeakingLeadListItem = Readonly<{
  id: string;
  contactId: string;
  displayName: string;
  organization?: string;
  title: string;
  status: SpeakingLeadStatus;
  pipeline: "Speaking Engagements";
  createdAt: string;
  updatedAt: string;
  version: number;
}>;

export type SpeakingLeadDetail = SpeakingLeadListItem & Readonly<{
  submission?: Readonly<{ id: string; payload: Readonly<Record<string, unknown>> }>;
  identities: readonly Readonly<{ kind: "email" | "phone"; value: string }>[];
  timeline: readonly Readonly<Record<string, unknown>>[];
  notifications: readonly Readonly<{
    kind: "organizer_acknowledgement" | "internal_notification";
    state: string;
  }>[];
}>;

type Session = Readonly<{
  siteId: string;
  memberId: string;
  capabilities: readonly string[];
}>;

type Transaction = Session & {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<Readonly<{ rows: readonly Row[]; rowCount: number | null }>>;
};

type Database = {
  withSession<Result>(
    session: Session,
    operation: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<SpeakingLeadStatus>([
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
  "spam",
]);

function requiredText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || !value) throw new Error("Speaking lead projection was invalid.");
  return value;
}

function listItem(row: Record<string, unknown>): SpeakingLeadListItem {
  const id = requiredText(row, "id");
  const contactId = requiredText(row, "contact_id");
  const status = row.status;
  const version = Number(row.version);
  if (!uuid.test(id) || !uuid.test(contactId) || !statuses.has(status as SpeakingLeadStatus) || !Number.isSafeInteger(version) || version < 1) {
    throw new Error("Speaking lead projection was invalid.");
  }
  const organization = typeof row.organization === "string" && row.organization
    ? row.organization
    : undefined;
  return Object.freeze({
    id,
    contactId,
    displayName: requiredText(row, "display_name"),
    ...(organization ? { organization } : {}),
    title: requiredText(row, "title"),
    status: status as SpeakingLeadStatus,
    pipeline: "Speaking Engagements",
    createdAt: new Date(requiredText(row, "created_at")).toISOString(),
    updatedAt: new Date(requiredText(row, "updated_at")).toISOString(),
    version,
  });
}

function records(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  if (value === null || value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error("Speaking lead detail was invalid.");
  }
  return Object.freeze(value as Record<string, unknown>[]);
}

export class PostgresSpeakingLeadRepository {
  constructor(private readonly input: Readonly<{ database: Database; session: Session }>) {}

  async list(): Promise<readonly SpeakingLeadListItem[]> {
    return this.input.database.withSession(this.input.session, async (transaction) => {
      const response = await transaction.query(
        `select lead.id,lead.contact_id,contact.display_name,contact.organization,
          lead.title,lead.status,lead.created_at,lead.updated_at,xmin::text as version
         from public.builder_leads lead
         join public.builder_contacts contact on contact.site_id=lead.site_id and contact.id=lead.contact_id
         where lead.service_key=$1
         order by lead.updated_at desc,lead.id`,
        ["speaking-engagement"],
      );
      return Object.freeze(response.rows.map(listItem));
    });
  }

  async get(leadId: string): Promise<SpeakingLeadDetail | null> {
    if (!uuid.test(leadId)) return null;
    return this.input.database.withSession(this.input.session, async (transaction) => {
      const response = await transaction.query(
        `select lead.id,lead.contact_id,contact.display_name,contact.organization,
          lead.title,lead.status,lead.created_at,lead.updated_at,xmin::text as version,
          result.submission_id,submission.payload,
          coalesce((select jsonb_agg(jsonb_build_object('kind',identity.identity_type,'value',identity.normalized_value) order by identity.created_at)
            from public.builder_contact_identities identity where identity.site_id=lead.site_id and identity.contact_id=lead.contact_id),'[]'::jsonb) identities,
          coalesce((select jsonb_agg(jsonb_build_object('kind',event.event_kind,'priorStatus',event.prior_status,'currentStatus',event.current_status,'metadata',event.safe_metadata,'occurredAt',event.occurred_at) order by event.occurred_at,event.id)
            from public.builder_lead_events event where event.site_id=lead.site_id and event.lead_id=lead.id),'[]'::jsonb) timeline,
          coalesce((select jsonb_agg(jsonb_build_object('kind',outbox.message_kind,'state',outbox.state) order by outbox.created_at,outbox.id)
            from public.builder_general_outbox outbox where outbox.site_id=lead.site_id and outbox.lead_id=lead.id),'[]'::jsonb) notifications
         from public.builder_leads lead
         join public.builder_contacts contact on contact.site_id=lead.site_id and contact.id=lead.contact_id
         left join public.builder_form_submission_results result on result.site_id=lead.site_id and result.lead_id=lead.id and result.version=1
         left join public.builder_form_submissions submission on submission.site_id=result.site_id and submission.id=result.submission_id
         where lead.id=$1 and lead.service_key='speaking-engagement'`,
        [leadId],
      );
      const row = response.rows[0];
      if (!row) return null;
      const item = listItem(row);
      const submissionId = typeof row.submission_id === "string" ? row.submission_id : undefined;
      const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? row.payload as Record<string, unknown>
        : undefined;
      return Object.freeze({
        ...item,
        ...(submissionId && payload
          ? { submission: Object.freeze({ id: submissionId, payload: Object.freeze(payload) }) }
          : {}),
        identities: records(row.identities) as SpeakingLeadDetail["identities"],
        timeline: records(row.timeline),
        notifications: records(row.notifications) as SpeakingLeadDetail["notifications"],
      });
    });
  }

  async changeStatus(input: Readonly<{
    leadId: string;
    expectedVersion: number;
    status: SpeakingLeadStatus;
    occurredAt: string;
  }>): Promise<Readonly<{ status: "applied"; version: number } | { status: "conflict" }>> {
    if (!uuid.test(input.leadId) || !Number.isSafeInteger(input.expectedVersion) || !statuses.has(input.status) || Number.isNaN(Date.parse(input.occurredAt))) {
      throw new Error("Speaking lead status change was invalid.");
    }
    return this.input.database.withSession(this.input.session, async (transaction) => {
      const response = await transaction.query<{ version: string }>(
        `with current as (
           select site_id,id,status from public.builder_leads
           where id=$1 and service_key='speaking-engagement' and xmin::text::bigint=$2 for update
         ), updated as (
           update public.builder_leads lead set status=$3,updated_at=$4::timestamptz
           from current where lead.site_id=current.site_id and lead.id=current.id
           returning lead.site_id,lead.id,current.status prior_status,lead.status,xmin::text version
         ), event as (
           insert into public.builder_lead_events(site_id,lead_id,event_kind,prior_status,current_status,safe_metadata,occurred_at)
           select site_id,id,'status_changed',prior_status,status,'{}'::jsonb,$4::timestamptz from updated
         ) select version from updated`,
        [input.leadId, input.expectedVersion, input.status, input.occurredAt],
      );
      const version = Number(response.rows[0]?.version);
      return Number.isSafeInteger(version) && version > 0
        ? Object.freeze({ status: "applied" as const, version })
        : Object.freeze({ status: "conflict" as const });
    });
  }

  async addActivity(input: Readonly<{
    leadId: string;
    kind: "note" | "task";
    body: string;
    occurredAt: string;
  }>): Promise<Readonly<{ status: "applied" }>> {
    const body = input.body.trim();
    if (!uuid.test(input.leadId) || !["note", "task"].includes(input.kind) || body.length < 1 || body.length > 4000 || Number.isNaN(Date.parse(input.occurredAt))) {
      throw new Error("Speaking lead activity was invalid.");
    }
    return this.input.database.withSession(this.input.session, async (transaction) => {
      const response = await transaction.query(
        `insert into public.builder_lead_events(site_id,lead_id,event_kind,safe_metadata,occurred_at)
         select lead.site_id,lead.id,$2,jsonb_build_object('body',$3),$4::timestamptz
         from public.builder_leads lead where lead.id=$1 and lead.service_key='speaking-engagement'
         returning id`,
        [input.leadId, input.kind === "note" ? "note_added" : "task_added", body, input.occurredAt],
      );
      if (response.rowCount !== 1) throw new Error("Speaking lead activity was invalid.");
      return Object.freeze({ status: "applied" as const });
    });
  }
}
