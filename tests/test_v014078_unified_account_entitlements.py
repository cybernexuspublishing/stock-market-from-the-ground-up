"""Account-management source contract: unified inventory and no silent success."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
api=(root/"functions/api/admin-accounts-v01353.js").read_text()
ui=(root/"assets/js/admin-operations.js").read_text()
assert "async function accountEntitlementInventory(env,id)" in api
for table in ("user_plan_grants","site_subscriptions","user_tool_passes","user_library"):
 assert table+"?select=" in api, "missing "+table
assert "accessInventory:await accountEntitlementInventory(env,id)" in api
assert "if(external.length)" in api
assert "if(effective?.planCode!==plan)" in api
assert "Membership update is NOT verified" in api
assert "gu76_reset_zero_monthly_qa" in api
assert "source==='stripe_zero_monthly_qa_v72'" in api
assert "await audit(env,actor,'v1353.membership.adjust'" in api
assert "Complete Account Access &amp; Revocation Ledger" in ui
assert "inventoryTable('Membership grants'" in ui
assert "inventoryTable('Payment-provider subscriptions'" in ui
assert "inventoryTable('Book & companion access'" in ui
assert "inventoryTable('Tool passes'" in ui
assert "data-account-revoke" in ui
assert "/api/admin-access-v01355?action=" in ui
assert "Revoke this specific Owner-issued" in ui
assert "Stripe payments or other account rights" in ui
print("PASS v78: complete per-account entitlement sources, targeted audited manual revocation, no unverified Owner membership changes.")
