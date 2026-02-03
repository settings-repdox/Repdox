# QUICK TEST EXECUTION GUIDE

## 🎯 Run Tests in 5 Minutes

### Option 1: Automated Build Test (Local)

```bash
cd /home/NEXE/projects/repdox-spark-nexus

# Test 1: Build project
npm run build
# Expected: ✓ built in ~13s

# Test 2: Check linting
npm run lint
# Expected: 76 issues (non-blocking, doesn't affect functionality)
```

### Option 2: Database Tests (Supabase SQL Editor)

Go to https://app.supabase.com → Your Project → SQL Editor

**Copy-paste each test below and run:**

#### TEST 1: Verify Schema Migration Applied

```sql
SELECT COUNT(*) as constraint_count
FROM information_schema.table_constraints
WHERE table_name IN ('events', 'user_profiles', 'event_registrations')
AND constraint_type IN ('U', 'F');
-- Expected result: >= 8 (constraints created)
```

#### TEST 2: Verify Quota Tables Exist

```sql
SELECT COUNT(*) FROM public.quota_limits;
-- Expected result: 5 (default quota rules)

SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_enforce%';
-- Expected result: 3 (3 quota enforcement triggers)
```

#### TEST 3: Verify Similarity Detection Function

```sql
SELECT proname FROM pg_proc
WHERE proname IN ('detect_duplicate_events', 'check_event_similarity_phase1')
LIMIT 2;
-- Expected result: 2 rows (both functions exist)
```

#### TEST 4: Quick Feature Test (Similarity)

```sql
-- This will fail silently if no events exist, which is OK
SELECT * FROM public.detect_duplicate_events(
  'Test Event',
  'Test Location',
  now() + interval '7 days',
  '00000000-0000-0000-0000-000000000000'::uuid
)
LIMIT 1;
-- Expected: Function executes without error
```

---

## 📊 Test Results Summary

### Build Status: ✅ PASSED

- TypeScript compilation: **100% success**
- Module bundling: **2,265 modules**
- Output size: **1.5MB gzipped**
- Build time: **13.55 seconds**

### Features Implemented: ✅ ALL 8

1. **Schema Hardening** - Unique constraints, foreign keys, check constraints
2. **Event Quota** - Max 5 events/day/user enforcement
3. **Registration Quota** - Max 200 registrations/day/user enforcement
4. **Similarity Detection** - Levenshtein distance algorithm for duplicates
5. **Atomic Operations** - Race condition prevention with INSERT...ON CONFLICT
6. **RLS Policies** - Row-level security for quota visibility
7. **QR Tokens** - JWT-based single-use verification tokens
8. **Email Verification** - Tokenized verification flow

### Database Migrations: ✅ READY

- ✅ 20260114_schema_hardening_constraints_FIXED.sql
- ✅ 20260114_usage_quotas_and_rate_limits_FIXED.sql
- ✅ 20260114_event_similarity_detection_FIXED.sql

### API Routes: ✅ READY

- ✅ POST /api/events/create (with duplicate detection)
- ✅ POST /api/events/register (with quota enforcement)
- ✅ POST /api/profile/create (with unique handle)
- ✅ POST /api/profile/verify (with token validation)
- ✅ POST /api/qr/generate (JWT token creation)
- ✅ POST /api/qr/verify (token verification)

---

## 🚀 Next Steps

### Immediate (Today)

1. ✅ Review BUILD_VERIFICATION_REPORT.md
2. ✅ Review TEST_VERIFICATION_REPORT.md
3. ⭕ **Run database tests in Supabase SQL Editor** (copy-paste above)

### Short-term (This Week)

1. Set up Supabase KV (Upstash Redis) for rate limiting
2. Configure environment variables:
   ```
   KV_REST_API_URL=https://your-instance.upstash.io
   KV_REST_API_TOKEN=your_token_here
   QR_TOKEN_SECRET=<generate with: openssl rand -base64 32>
   ```
3. Test email delivery (SendGrid or Twilio)

### Before Production

1. ⭕ **Run all 6 database tests** from MIGRATION_DEPLOYMENT_CHECKLIST.md
2. ⭕ **Test API endpoints** with real auth tokens
3. ⭕ **Set staging database backup**
4. Review and sign off on deployment checklist

---

## 📚 Key Documents

| Document                                                                 | Purpose                                         |
| ------------------------------------------------------------------------ | ----------------------------------------------- |
| [TEST_VERIFICATION_REPORT.md](./TEST_VERIFICATION_REPORT.md)             | Complete test procedures with SQL/cURL examples |
| [MIGRATION_DEPLOYMENT_CHECKLIST.md](./MIGRATION_DEPLOYMENT_CHECKLIST.md) | Step-by-step deployment guide                   |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)                 | Feature overview                                |
| [README_SECURITY.md](./README_SECURITY.md)                               | Security architecture                           |
| [DEPENDENCIES.md](./DEPENDENCIES.md)                                     | Required packages                               |

---

## ⚠️ Known Issues

**76 Lint Warnings** (non-blocking)

- Impact: None - build succeeds
- Action: Optional - can be fixed post-deployment
- Files affected: Various components and API routes

**QUICK_REFERENCE.ts Parsing Error**

- Impact: Linting only - doesn't affect build
- Action: File is documentation only
- Fix: Can be resolved in next maintenance cycle

---

## 🎓 Test Execution Tips

### For Beginners:

1. Start with Build Status test (easiest)
2. Use the Supabase SQL Editor (no terminal needed)
3. Copy-paste SQL tests exactly as shown
4. Check "Expected result" matches your output

### For Experienced:

1. Run all tests simultaneously in Supabase
2. Use the deployment checklist for comprehensive testing
3. Set up monitoring before production deployment
4. Review rate limiting configuration in middleware.ts

---

## ❓ FAQ

**Q: Do I need to run the tests?**  
A: Tests confirm the implementation works. Recommended before production.

**Q: What if a test fails?**  
A: Each test includes expected output. If different, check MIGRATION_DEPLOYMENT_CHECKLIST.md for troubleshooting.

**Q: Can I skip to production?**  
A: Not recommended. Run staging tests first to catch any issues.

**Q: How long do tests take?**  
A: All 6 database tests: ~10 minutes total

**Q: Do I need a Supabase account?**  
A: Yes, you already have one (igghkfselpqlyktsiulj.supabase.co)

---

**Status:** ✅ **READY FOR TESTING**  
**Generated:** February 4, 2026  
**Project:** repdox-spark-nexus
