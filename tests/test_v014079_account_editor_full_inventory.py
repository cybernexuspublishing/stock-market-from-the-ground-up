"""v79 integrated Manage Account UI uses existing v78 source-aware read/write APIs."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
api=(root/"functions/api/admin-accounts-v01353.js").read_text()
ui=(root/"assets/js/admin-operations.js").read_text()
assert "inventory,inventoryErrors,effectiveAccess,effectiveError,grantCatalog,grantCatalogError" in api
assert "if(action==='revoke_resource')" in api and "if(action==='grant_resource')" in api
assert "gu78_admin_account_resource_revoke" in api
assert "gu78_admin_account_resource_grant" in api
assert "targetAccess(actor,id,x)" in api
assert "info.inventory||{}" in ui
assert "info.inventoryErrors||{}" in ui
assert "Complete Account" in ui or "All Account Entitlements" in ui
for name in ("grants","subscriptions","books","tools","legacyLearning","bookKeys","orders"):
 assert "'"+name+"'" in ui, name
assert "data-account-resource-revoke" in ui
assert "api('revoke_resource'" in ui and "api('grant_resource'" in ui
assert "recordId,reason:reason.trim()" in ui
assert "purchased" in ui or "paid purchases" in ui
assert "Source records remain available" in ui
assert "inventoryErrors" in api
assert "effective?.planCode!==plan" in api
assert "if(plan!=='FREE'&&(qa.length||external.length))" in api
print("PASS v79: one account editor lists all 7 source categories; audited manual revocation/grant; guarded Owner/Admin API.")
