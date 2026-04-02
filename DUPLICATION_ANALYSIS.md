# Event Content Duplication Analysis

## Summary

Found several potential causes for content being doubled when updating events. The duplication likely occurs in three areas:

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Teams Text Duplication (Likely Source)**

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L335)
**Lines**: 335-336

When loading event data for editing, teams are converted to text format, but there's NO VERIFICATION that the text format matches what gets saved back.

```typescript
// LOADING (AddEvent.tsx:335-336)
const teamLines = teams.map(
  (t) => `${t.name} | ${t.description || ""} | ${t.contact_email || ""}`,
);
setTeamsText(teamLines.join("\n"));
```

**Problem**: There's no `.trim()` call on empty description/email fields:

- If `t.description` = `""` and `t.contact_email` = `""`, this creates: `"Team Name |  | "`
- When parsed back in [eventService.ts:481](src/lib/eventService.ts#L481-L490), this might create duplicate entries with empty strings

---

### 2. **Schedule Text Format Mismatch**

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L320)
**Lines**: 318-321

```typescript
// LOADING
const scheduleLines = schedules.map((s) => {
  const start = s.start_at
    ? new Date(s.start_at).toISOString().slice(0, 16) // ← Format: YYYY-MM-DDTHH:MM
    : "";
  return `${start} | ${s.title} | ${s.description || ""}`;
});
```

**vs. Parsing in eventService.ts:455-457:**

```typescript
// SAVING & PARSING
const parts = line.split("|").map((p) => p.trim());
const start = parts[0] || null; // Expects valid ISO date OR null
```

**Problem**: If schedules are loaded with **empty start_at**, they create blank lines with just pipes `" | title | description"`, which after `.trim()` and `.split("|")` might create invalid records.

---

### 3. **Empty Line Filtering Issue**

**File**: [src/lib/eventService.ts](src/lib/eventService.ts#L441-L456)
**Lines**: 441-456

```typescript
const lines = scheduleText
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean); // ← This filters empty strings
```

**Problem**: If the form somehow contains DUPLICATE newlines or DUPLICATE sections (e.g., from autosave + manual edit), those duplicates won't be filtered out. Only completely empty lines are removed.

---

## 🟡 POTENTIAL RACE CONDITIONS

### 4. **Delete Before Insert Pattern (Non-Atomic)**

**File**: [src/lib/eventService.ts](src/lib/eventService.ts#L437-L472)
**Lines**: 437-472

```typescript
// ← Schedule deletion
await supabase.from("event_schedules").delete().eq("event_id", eventId);

if (scheduleText && scheduleText.trim()) {
  // ... parse logic ...
  if (scheduleInserts.length > 0) {
    // ← Schedule insertion
    await supabase.from("event_schedules").insert(scheduleInserts);
  }
}

// ← Teams deletion
await supabase.from("event_teams").delete().eq("event_id", eventId);

if (teamsText && teamsText.trim()) {
  // ... parse logic ...
  await supabase.from("event_teams").insert(teamInserts);
}
```

**Risk**: If the update is called **TWICE simultaneously** (e.g., auto-save + manual save), records could be:

- Deleted by first call
- Inserted by first call
- Deleted by second call (now deleting what first call inserted)
- Inserted by second call (duplicating original entries)

**Status**: Not caught by retry logic - deletes are successful, only inserts might fail.

---

## 🟡 FORM LOADING ISSUES

### 5. **Multiple Event Load Triggers**

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L178-357)
**Lines**: 178-357

```typescript
useEffect(() => {
  if (!isEditMode || !slug) return;

  const loadEvent = async () => {
    // loads event data
  };

  loadEvent();
}, [isEditMode, slug, navigate]); // ← Dependency array
```

**Risk**: If `slug` changes, this might re-fetch and reload scheduleText/teamsText, potentially APPENDING to existing state instead of REPLACING it. (Needs verification: does setScheduleText replace or append?)

**Verification Needed**: Check if `setScheduleText` is called with `.trim()` to ensure no leading/trailing newlines get duplicated.

---

## 🔵 EVIDENCE OF THE DUPLICATION PATH

### Step 1: Load Event

- User opens event for editing
- [AddEvent.tsx:320](src/pages/AddEvent.tsx#L320) loads schedules and converts to text
- scheduleText set to something like: `"2025-03-15T09:00 | Opening | Welcome\n2025-03-15T10:00 | Kickoff | Guidelines"`

### Step 2: User Makes No Changes

- Form remains unchanged
- User clicks "Save"

### Step 3: Save/Update

- [AddEvent.tsx:740](src/pages/AddEvent.tsx#L740) calls `updateEvent(eventId, payload)`
- [eventService.ts:437](src/lib/eventService.ts#L437) deletes all schedules
- [eventService.ts:441-472](src/lib/eventService.ts#L441-L472) parses scheduleText and re-inserts

### Step 4: DUPLICATION OCCURS IF:

- ✅ scheduleText gets **DUPLICATED** during form load (e.g., autosave loads draft that already has duplicated text)
- ✅ Form data is fetched **TWICE**, concatenating results
- ✅ Empty line entries create **PHANTOM RECORDS** that survive parsing
- ✅ User manually adds duplicate entries and doesn't notice

---

## ✅ RECOMMENDED FIXES

### Fix 1: Ensure Proper Text Sanitization on Load

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L315-L340)

```typescript
// BEFORE
if (schedules && schedules.length > 0) {
  const scheduleLines = schedules.map((s) => {
    const start = s.start_at
      ? new Date(s.start_at).toISOString().slice(0, 16)
      : "";
    return `${start} | ${s.title} | ${s.description || ""}`;
  });
  setScheduleText(scheduleLines.join("\n"));
}

// AFTER - Add trim and filter
if (schedules && schedules.length > 0) {
  const scheduleLines = schedules
    .map((s) => {
      const start = s.start_at
        ? new Date(s.start_at).toISOString().slice(0, 16)
        : "";
      const desc = (s.description || "").trim();
      return `${start} | ${s.title} | ${desc}`.trim(); // ← ADD TRIM
    })
    .filter((line) => line.trim() && !line.match(/^\s*\|\s*\|\s*$/)); // ← FILTER EMPTY LINES
  setScheduleText(scheduleLines.join("\n"));
}
```

### Fix 2: Add Deduplication in Parsing

**File**: [src/lib/eventService.ts](src/lib/eventService.ts#L441-L456)

```typescript
// BEFORE
const lines = scheduleText
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

// AFTER - Add uniqueness check
const lines = scheduleText
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

// Deduplicate
const uniqueLines = [...new Set(lines)];  // ← ADD THIS

const scheduleInserts = uniqueLines  // ← USE uniqueLines
  .map((line) => {
```

### Fix 3: Prevent Multiple Concurrent Updates

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L700-750)

```typescript
// BEFORE
setLoading(true);
try {
  // call update...
  const updated = await eventService.updateEvent(eventId, payload);
}

// AFTER - Add update gate
const [isUpdating, setIsUpdating] = useState(false);

if (isUpdating) {
  toast({ title: "Save in progress...", });
  return;
}

setIsUpdating(true);
try {
  const updated = await eventService.updateEvent(eventId, payload);
} finally {
  setIsUpdating(false);
}
```

### Fix 4: Validate Load Data

**File**: [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx#L325-L336)

```typescript
// BEFORE
if (teams && teams.length > 0) {
  const teamLines = teams.map(
    (t) => `${t.name} | ${t.description || ""} | ${t.contact_email || ""}`,
  );
  setTeamsText(teamLines.join("\n"));
}

// AFTER - Add validation and cleanup
if (teams && teams.length > 0) {
  const teamLines = teams
    .map((t) => {
      const name = (t.name || "").trim();
      const desc = (t.description || "").trim();
      const email = (t.contact_email || "").trim();
      return `${name} | ${desc} | ${email}`.trim(); // ← Trim each part
    })
    .filter((line) => line && !line.match(/^\s*\|\s*\|\s*$/)); // ← Filter invalid lines
  if (teamLines.length > 0) {
    setTeamsText(teamLines.join("\n"));
  }
}
```

### Fix 5: Atomic Delete+Insert with Transaction

**File**: [src/lib/eventService.ts](src/lib/eventService.ts#L437-L472)

```typescript
// Ideally use batch operations or transaction
// If Supabase supports it:
const batchSchedules = [
  supabase.from("event_schedules").delete().eq("event_id", eventId),
  scheduleInserts.length > 0
    ? supabase.from("event_schedules").insert(scheduleInserts)
    : null,
];

await Promise.all(batchSchedules.filter(Boolean));
```

---

## 🧪 TESTING STEPS TO IDENTIFY DUPLICATION

1. **Create event** with 3 schedule items
2. **Edit event** (redirect to /events/slug/edit)
3. **Don't modify anything** → Click Save
4. **Check database**: `SELECT * FROM event_schedules WHERE event_id = 'xxx'`
   - Should still have 3 items
   - If 6 items: Duplication confirmed from load→save cycle

5. **Edit again, this time change one schedule item**
6. **Click Save**
7. **Check database**: Should have 3 items with 1 modified
   - If more than 3: Duplication in parse logic

8. **Check autosave localStorage**: `localStorage.getItem('event-draft:slug')`
   - Does saved draft have duplicate sections?

9. **Check browser console** for duplicate POST requests to update endpoint

---

## 📊 ROOT CAUSE LIKELIHOOD

| Issue                                             | Likelihood | Impact                              |
| ------------------------------------------------- | ---------- | ----------------------------------- |
| Empty pipe lines `" \| \| "` in scheduleText      | **HIGH**   | Creates phantom records             |
| Schedule/team text loaded with duplicated entries | **MEDIUM** | Depends on form reload frequency    |
| Concurrent update calls (autosave + manual)       | **MEDIUM** | Would double entries without errors |
| Autosave draft concatenation                      | **LOW**    | Draft loading replaces, not appends |
| Parse logic missing deduplication                 | **LOW**    | Only if above issues exist          |

---

## Next Steps

1. Add console logging to track scheduleText value before/after load
2. Add console logging to track parsed scheduleInserts before DB insert
3. Check if autosave is triggering extra form loads
4. Verify concurrent update protection
5. Implement fixes in order: Fix 1 → Fix 4 → Fix 5 → Fix 2 → Fix 3
