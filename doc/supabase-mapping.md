# Supabase Mapping (Stub)

This document tracks the planned mapping between repository interfaces and
Supabase tables/queries. The current implementation is a stub.

## Planned Tables

- `plans`
- `plan_versions`
- `scenario_assumptions`
- `monthly_records`
- `monthly_items`
- `life_events`
- `housing_assumptions`

## Repository Method Mapping (TODO)

| Repository | Method | Planned Table(s) | Notes |
| --- | --- | --- | --- |
| PlanRepository | list/get/create/update/archive/restore/delete | `plans` | TODO: define status handling and soft delete strategy |
| VersionRepository | listByPlan/get/getCurrent/createInitial/createFromCurrent/setCurrent/delete | `plan_versions`, `plans` | TODO: currentVersionId source of truth |
| VersionRepository | getScenarioSet/upsertScenarioSet/ensureScenarioSet | `scenario_assumptions` | TODO: scenario key storage |
| MonthlyRepository | getByYm/listByPlan/upsert/upsertByYm/copyFromPreviousMonth/deleteByYm | `monthly_records` | TODO: ym indexing |
| MonthlyRepository | listItems/replaceItems/deleteItemsByRecord | `monthly_items` | TODO: batch replace strategy |
| EventRepository | listByVersion/get/create/update/duplicate/delete | `life_events` | TODO: duplication rules |
| HousingRepository | listByVersion/getByType/upsert/setSelected/applyPreset | `housing_assumptions` | TODO: selected invariant |

## RLS Notes (Placeholder)

- TODO: decide per-user access model (plan ownership).
- TODO: enforce plan/version scoped access via policies.
