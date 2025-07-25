# MySport Owner-CinetPay Refactor Plan

## 📋 Current State Analysis

### Edge Functions Inventory (30 functions total)

#### **🔥 DELETE - Debug/Test Functions (13 functions)**
These were created for debugging the current broken payout flow and are no longer needed:
- `debug-booking-payout/`
- `debug-payout-account-query/`
- `debug-payout-config/`
- `diagnose-recent-payment/`
- `list-recent-bookings/`
- `test-direct-payout/`
- `test-webhook/`
- `test-webhook-simple/`
- `create-contact-and-retry/`
- `create-missing-contact/`
- `fix-blocked-payouts/`
- `force-payout-success/`
- `force-confirm-booking/`

#### **🔥 DELETE - Obsoleted by New Flow (3 functions)**
- `create-owner-contact/` → will be merged into owner registration
- `transfer-to-owner/` → duplicate of create-owner-payout
- `check-cinetpay-transfers/` → unnecessary with simplified flow

#### **✅ KEEP - Core Business Logic (10 functions)**
- `approve-booking/` → booking workflow
- `cinetpay-webhook/` → payment confirmation
- `cinetpay-transfer-webhook/` → transfer status updates
- `create-cinetpay-payment/` → payment creation
- `create-owner-payout/` → **REFACTOR HEAVILY**
- `create-field/` → field creation
- `approve-owner-request/` → owner approval
- `send-booking-email/` → notifications
- `send-sms-notification/` → notifications
- `cleanup-expired-bookings/` → maintenance

#### **✅ KEEP - Auth Flow (4 functions)**
- `request-owner-otp/` → owner verification
- `verify-owner-otp/` → owner verification
- `confirm-booking-owner/` → booking confirmation
- `create-cinetpay-merchant/` → merchant setup

## 🗄️ Database Schema Changes

### Current Schema Issues:
- `owners` table is minimal (only id, user_id, created_at)
- `payout_accounts` table manages phone numbers and CinetPay contacts
- Complex lookups: booking → field → owner → payout_account → cinetpay_contact_id

### Target Schema:
```sql
-- Enhanced owners table
ALTER TABLE owners ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE owners ADD COLUMN mobile_money TEXT NOT NULL DEFAULT '';
ALTER TABLE owners ADD COLUMN cinetpay_contact_id TEXT;

-- Migration: Backfill from payout_accounts
UPDATE owners 
SET phone = pa.phone, 
    mobile_money = pa.phone, 
    cinetpay_contact_id = pa.cinetpay_contact_id
FROM payout_accounts pa 
WHERE owners.id = pa.owner_id AND pa.is_active = true;

-- Drop obsolete table
DROP TABLE payout_accounts;

-- Drop obsolete payouts columns
ALTER TABLE payouts DROP COLUMN IF EXISTS error_message;
ALTER TABLE payouts DROP COLUMN IF EXISTS payout_attempted_at;
```

## 🏗️ New Simplified Flow

### Owner Registration:
1. Frontend collects: `phone`, `mobile_money`
2. Create `owners` record with both phones
3. Immediately call CinetPay API to create contact using `mobile_money`
4. Store `cinetpay_contact_id` in owners table
5. ✅ Owner ready for payouts

### Payout Flow:
1. `booking_id` → `booking.fields.owner_id` → `owners.user_id` → `owners` record
2. If `cinetpay_contact_id` is null, create it and update owners table
3. Use `owners.mobile_money` and `owners.cinetpay_contact_id` for transfer
4. ✅ Single query, single source of truth

## 📁 Files to Delete

### Edge Functions:
```bash
rm -rf supabase/functions/debug-booking-payout/
rm -rf supabase/functions/debug-payout-account-query/
rm -rf supabase/functions/debug-payout-config/
rm -rf supabase/functions/diagnose-recent-payment/
rm -rf supabase/functions/list-recent-bookings/
rm -rf supabase/functions/test-direct-payout/
rm -rf supabase/functions/test-webhook/
rm -rf supabase/functions/test-webhook-simple/
rm -rf supabase/functions/create-contact-and-retry/
rm -rf supabase/functions/create-missing-contact/
rm -rf supabase/functions/fix-blocked-payouts/
rm -rf supabase/functions/force-payout-success/
rm -rf supabase/functions/force-confirm-booking/
rm -rf supabase/functions/create-owner-contact/
rm -rf supabase/functions/transfer-to-owner/
rm -rf supabase/functions/check-cinetpay-transfers/
```

### Config entries to remove:
- 16 function configurations from `supabase/config.toml`

## 🎯 Core Function Refactors

### `create-owner-payout/index.ts`
**Before:** 700+ lines, complex fallbacks, error-prone lookups
**After:** ~200 lines, single owner lookup, guaranteed contact_id

### Owner Registration Flow
**Before:** Separate owner creation + manual payout account setup
**After:** Single registration creates owner + CinetPay contact atomically

## 📱 Frontend Changes

### Owner Registration Form
```typescript
// Add to owner signup
interface OwnerRegistration {
  phone: string;        // Regular contact
  mobile_money: string; // Payout number (default = phone)
}
```

### Owner Settings
```typescript
// Single payout phone field
interface PayoutSettings {
  mobile_money: string; // Editable payout number
}
```

## ✅ Success Criteria

1. **Owner registration** creates CinetPay contact immediately
2. **Single database query** to get payout info: `owners` table only
3. **Zero debug functions** in production
4. **100% payout success rate** for owners with valid phone numbers
5. **End-to-end test** passes: register → create field → book → pay → payout

## 📦 Deliverables

1. ✅ This refactor plan
2. 🔄 Migration SQL script
3. 🔄 Streamlined `create-owner-payout/index.ts`
4. 🔄 Updated owner registration endpoint
5. 🔄 Frontend form updates
6. 🔄 Clean `supabase/config.toml`
7. 🔄 End-to-end test confirmation
8. 🔄 Post-refactor checklist

---

**Total Reduction:** 16 functions deleted, 1 table dropped, ~2000 lines of code removed
**Result:** Bulletproof payout flow with single source of truth