# IndexedDB Schema (MVP)

## Overview

- DB name: `lifeplan_mvp`
- DB version: `1`
- Date key: `YearMonth` = `"YYYY-MM"` (lexicographic order matches chronological order)
- Source model: `src/lib/domain/types.ts`

## Object Stores

### `plans`

- keyPath: `id`
- indexes:
  - `by_userId` -> `userId`
  - `by_status` -> `status`
  - `by_archivedAt` -> `archivedAt`
  - `by_updatedAt` -> `updatedAt`
  - `by_userId_status` -> `['userId','status']`
  - `by_userId_updatedAt` -> `['userId','updatedAt']`

### `planVersions`

- keyPath: `id`
- indexes:
  - `by_planId` -> `planId`
  - `by_planId_versionNo` -> `['planId','versionNo']` (unique)
  - `by_planId_isCurrent` -> `['planId','isCurrent']`
  - `by_createdAt` -> `createdAt`

### `scenarioAssumptions`

- keyPath: `id`
- indexes:
  - `by_versionId` -> `planVersionId`
  - `by_versionId_scenarioKey` -> `['planVersionId','scenarioKey']` (unique)

### `monthlyRecords`

- keyPath: `id`
- indexes:
  - `by_planId` -> `planId`
  - `by_planId_ym` -> `['planId','ym']` (unique)
  - `by_ym` -> `ym`

### `monthlyItems`

- keyPath: `id`
- indexes:
  - `by_monthlyRecordId` -> `monthlyRecordId`
  - `by_monthlyRecordId_kind` -> `['monthlyRecordId','kind']`
  - `by_monthlyRecordId_category` -> `['monthlyRecordId','category']`

### `lifeEvents`

- keyPath: `id`
- indexes:
  - `by_versionId` -> `planVersionId`
  - `by_versionId_startYm` -> `['planVersionId','startYm']`
  - `by_versionId_direction` -> `['planVersionId','direction']`
  - `by_versionId_eventType` -> `['planVersionId','eventType']`

### `housingAssumptions`

- keyPath: `id`
- indexes:
  - `by_versionId` -> `planVersionId`
  - `by_versionId_type` -> `['planVersionId','housingType']` (unique)
  - `by_versionId_isSelected` -> `['planVersionId','isSelected']`

## Query to Index Mapping

- Plans list (by user/status/updatedAt): `plans.by_userId_status`, `plans.by_userId_updatedAt`, `plans.by_updatedAt`
- Plan by id: `plans` (keyPath)
- Current version id: `plans` (field `currentVersionId`)

- Versions by planId (desc by versionNo): `planVersions.by_planId_versionNo` + cursor("prev")
- Current version: `planVersions.by_planId_isCurrent` with key `[planId, true]`

- MonthlyRecord by planId + ym: `monthlyRecords.by_planId_ym`
- MonthlyRecord list by planId (desc): `monthlyRecords.by_planId_ym` + cursor("prev")
- Latest month: `monthlyRecords.by_planId_ym` + cursor("prev") (first)
- MonthlyItem list by monthlyRecordId: `monthlyItems.by_monthlyRecordId`

- LifeEvents by planVersionId: `lifeEvents.by_versionId`
- LifeEvents future/past: `lifeEvents.by_versionId_startYm` + cursor range on `startYm`
- LifeEvents next 3: `lifeEvents.by_versionId_startYm` + cursor (asc, limit 3)

- HousingAssumptions 4 types by version: `housingAssumptions.by_versionId`
- HousingAssumptions by version + type: `housingAssumptions.by_versionId_type`
- Selected housing: `housingAssumptions.by_versionId_isSelected` with key `[planVersionId, true]`

## Constraints

- `monthlyRecords` is unique by `(planId, ym)`
- `housingAssumptions` is unique by `(planVersionId, housingType)`
- `isCurrent` / `isSelected` are enforced in app logic (use transaction to keep single true)

## Upgrade Strategy

- v1: initial schema above
- v2: add snapshots stores (`snapshots_lcc`, `snapshots_projection`)
- v3: add indexes based on query hot spots
- v4: split large JSON fields if needed (e.g., `housingRepairs`)

Upgrade rules:
- Prefer additive changes (new store/index) to avoid data loss
- Use `onupgradeneeded` branch by version
- Provide a DB reset method for dev (delete database)
