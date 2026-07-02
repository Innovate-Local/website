// AI-usage analytics (staff). Server-only. Aggregations over ai_usage_events for
// the Insights dashboard. Cost is micro-USD; sums cast to float8 so they come
// back as plain JS numbers.
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { aiUsageEvents, organizations, projects } from '@/lib/db/schema'

const e = aiUsageEvents

function sinceClause(days?: number) {
  if (!days) return undefined
  return gte(e.createdAt, new Date(Date.now() - days * 86_400_000))
}

export type AiSpendSummary = { costMicros: number; totalTokens: number; calls: number }

export async function getAiSpendSummary(days?: number): Promise<AiSpendSummary> {
  const [row] = await getDb()
    .select({
      costMicros: sql<number>`coalesce(sum(${e.costMicros}), 0)::float8`,
      totalTokens: sql<number>`coalesce(sum(${e.totalTokens}), 0)::float8`,
      calls: sql<number>`count(*)::int`,
    })
    .from(e)
    .where(sinceClause(days))
  return row ?? { costMicros: 0, totalTokens: 0, calls: 0 }
}

export type FeatureSpend = { feature: string; costMicros: number; calls: number; tokens: number }

export async function getAiSpendByFeature(days?: number): Promise<FeatureSpend[]> {
  return getDb()
    .select({
      feature: e.feature,
      costMicros: sql<number>`coalesce(sum(${e.costMicros}), 0)::float8`,
      calls: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${e.totalTokens}), 0)::float8`,
    })
    .from(e)
    .where(sinceClause(days))
    .groupBy(e.feature)
    .orderBy(sql`sum(${e.costMicros}) desc`)
}

export type DaySpend = { day: string; costMicros: number; calls: number }

export async function getAiSpendByDay(days: number): Promise<DaySpend[]> {
  return getDb()
    .select({
      day: sql<string>`to_char(date_trunc('day', ${e.createdAt}), 'YYYY-MM-DD')`,
      costMicros: sql<number>`coalesce(sum(${e.costMicros}), 0)::float8`,
      calls: sql<number>`count(*)::int`,
    })
    .from(e)
    .where(gte(e.createdAt, new Date(Date.now() - days * 86_400_000)))
    .groupBy(sql`date_trunc('day', ${e.createdAt})`)
    .orderBy(sql`date_trunc('day', ${e.createdAt})`)
}

export type OrgSpend = { orgId: string | null; orgName: string | null; costMicros: number; calls: number }

export async function getAiSpendByOrg(days?: number, limit = 10): Promise<OrgSpend[]> {
  return getDb()
    .select({
      orgId: e.orgId,
      orgName: organizations.name,
      costMicros: sql<number>`coalesce(sum(${e.costMicros}), 0)::float8`,
      calls: sql<number>`count(*)::int`,
    })
    .from(e)
    .leftJoin(organizations, eq(organizations.id, e.orgId))
    .where(and(sinceClause(days), sql`${e.orgId} is not null`))
    .groupBy(e.orgId, organizations.name)
    .orderBy(sql`sum(${e.costMicros}) desc`)
    .limit(limit)
}

export type ProjectSpend = { projectId: string | null; title: string | null; costMicros: number; calls: number }

export async function getAiSpendByProject(days?: number, limit = 10): Promise<ProjectSpend[]> {
  return getDb()
    .select({
      projectId: e.projectId,
      title: projects.title,
      costMicros: sql<number>`coalesce(sum(${e.costMicros}), 0)::float8`,
      calls: sql<number>`count(*)::int`,
    })
    .from(e)
    .leftJoin(projects, eq(projects.id, e.projectId))
    .where(and(sinceClause(days), sql`${e.projectId} is not null`))
    .groupBy(e.projectId, projects.title)
    .orderBy(sql`sum(${e.costMicros}) desc`)
    .limit(limit)
}

export type AiEventRow = {
  id: string
  feature: string
  model: string
  totalTokens: number
  costMicros: number
  createdAt: Date
}

export async function getRecentAiEvents(limit = 15): Promise<AiEventRow[]> {
  return getDb()
    .select({
      id: e.id,
      feature: e.feature,
      model: e.model,
      totalTokens: e.totalTokens,
      costMicros: e.costMicros,
      createdAt: e.createdAt,
    })
    .from(e)
    .orderBy(desc(e.createdAt))
    .limit(limit)
}
