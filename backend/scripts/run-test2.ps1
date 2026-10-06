# Keeps invoking the generator until no target needs work.
#
# One pass can leave a paper short: a throttled or truncated model call degrades
# into "no usable question", and the generator then simply moves on. Because a
# completed paper is skipped on discovery, a later pass costs only the papers
# that still need questions.
param(
  [int]$MaxPasses = 8,
  [int]$ThrottleMs = 2500,
  [string]$Source = "",
  [string]$LogName = "test2-full"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

$out = "logs\$LogName.log"
$err = "logs\$LogName.err.log"

for ($pass = 1; $pass -le $MaxPasses; $pass++) {
  "=== pass $pass/$MaxPasses started $(Get-Date -Format s) ===" | Tee-Object -FilePath $out -Append

  $cliArgs = @("tsx", "scripts/generate-test-2.ts", "--apply", "--throttle-ms", "$ThrottleMs")
  if ($Source) { $cliArgs += @("--source", $Source) }
  "npx $($cliArgs -join ' ')" | Tee-Object -FilePath $out -Append

  & npx.cmd @cliArgs 1>> $out 2>> $err
  $code = $LASTEXITCODE
  "=== pass $pass finished with exit $code at $(Get-Date -Format s) ===" | Tee-Object -FilePath $out -Append

  if ($code -ne 0) {
    "pass $pass failed with exit $code; stopping" | Tee-Object -FilePath $out -Append
    exit $code
  }

  # A pass that processed nothing but work is done.
  $summary = Select-String -Path $out -Pattern "Targets processed: (\d+)" | Select-Object -Last 1
  $processed = 0
  if ($summary) { $processed = [int]$summary.Matches[0].Groups[1].Value }
  if ($processed -eq 0) {
    "nothing left to do after pass $pass" | Tee-Object -FilePath $out -Append
    exit 0
  }
}

"reached the pass limit with work still queued" | Tee-Object -FilePath $out -Append
exit 0
