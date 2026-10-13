# Manual one-time cleanup for files replaced by the stable-name baseline.
# Run from repo root (GitHub Desktop: Repository -> Open in Explorer -> open PowerShell).
# Safe default: SHOW ONLY. -Apply deletes only exact old paths when their replacement exists.
param([switch]$Apply)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$maps=@()
$maps+=Import-Csv (Join-Path $root 'docs/ASSET_RENAME_MAP.csv') | ForEach-Object { [pscustomobject]@{ old_path=$_.old_path; replacement_path=$_.new_path } }
$maps+=Import-Csv (Join-Path $root 'docs/RETIRE_PRIOR_BASELINE_FILES.csv')
$removed=0
foreach($row in $maps){
  if($row.old_path -eq 'sw-v0135.js'){continue} # still supported legacy SW install URL
  $old=Join-Path $root $row.old_path
  $new=Join-Path $root $row.replacement_path
  if(-not (Test-Path -LiteralPath $old -PathType Leaf)){continue}
  if(-not (Test-Path -LiteralPath $new -PathType Leaf)){
    Write-Warning "Preserving $($row.old_path): new destination not present: $($row.replacement_path)"
    continue
  }
  if($Apply){Remove-Item -LiteralPath $old -Force;Write-Host "RETIRED $($row.old_path)"; $removed++}
  else {Write-Host "WOULD RETIRE $($row.old_path) -> $($row.replacement_path)"}
}
if($Apply){Write-Host "Completed retirement of $removed exact old files. Review GitHub Desktop changes."}
else {Write-Host 'No files changed. To retire old paths AFTER copying the new package: powershell -ExecutionPolicy Bypass -File scripts/cleanup-retired-assets.ps1 -Apply'}
