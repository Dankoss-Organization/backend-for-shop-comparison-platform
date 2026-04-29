param(
  [Parameter(Mandatory = $true)]
  [string]$ProductId,

  [string]$ApiBaseUrl = "http://localhost:3000",

  [int]$PollIntervalSec = 1,

  [int]$TimeoutSec = 60,

  [int]$BatchCount = 5
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-JobStatus {
  param([string]$JobId)
  Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/v1/products/sync-jobs/$JobId"
}

function Wait-ForJobCompletion {
  param([string]$JobId, [int]$Timeout, [int]$Interval)

  $started = Get-Date
  while ($true) {
    $status = Get-JobStatus -JobId $JobId
    Write-Host "Job $JobId status: $($status.status)"

    if ($status.status -eq "completed" -or $status.status -eq "failed" -or $status.status -eq "not_found") {
      return $status
    }

    $elapsed = (Get-Date) - $started
    if ($elapsed.TotalSeconds -ge $Timeout) {
      throw "Timeout waiting for job $JobId after $Timeout seconds"
    }

    Start-Sleep -Seconds $Interval
  }
}

try {
  Write-Step "Queue smoke test started"
  Write-Host "ProductId: $ProductId"
  Write-Host "API base URL: $ApiBaseUrl"

  Write-Step "1) Enqueue positive job"
  $job = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/v1/products/$ProductId/sync" -ContentType "application/json" -Body '{"source":"manual-test"}'
  Write-Host "Enqueued jobId: $($job.jobId), status: $($job.status)"

  Write-Step "2) Poll positive job until completed or failed"
  $final = Wait-ForJobCompletion -JobId $job.jobId -Timeout $TimeoutSec -Interval $PollIntervalSec
  $final | ConvertTo-Json -Depth 8

  if ($final.status -ne "completed") {
    throw "Positive flow failed. Expected completed, got $($final.status)"
  }

  Write-Step "3) Negative test with not-existing-id"
  $badJob = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/v1/products/not-existing-id/sync" -ContentType "application/json" -Body '{"source":"negative-test"}'
  Write-Host "Enqueued negative jobId: $($badJob.jobId)"

  $badFinal = Wait-ForJobCompletion -JobId $badJob.jobId -Timeout $TimeoutSec -Interval $PollIntervalSec
  $badFinal | ConvertTo-Json -Depth 8

  if ($badFinal.status -ne "failed") {
    throw "Negative flow failed. Expected failed, got $($badFinal.status)"
  }

  Write-Step "4) Batch enqueue test"
  $batchJobs = @()
  1..$BatchCount | ForEach-Object {
    $batchJob = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/v1/products/$ProductId/sync" -ContentType "application/json" -Body "{\"source\":\"batch-test-$_\"}"
    $batchJobs += $batchJob
  }

  Write-Host "Enqueued $($batchJobs.Count) batch jobs"

  $batchResults = @()
  foreach ($batch in $batchJobs) {
    $batchResults += Wait-ForJobCompletion -JobId $batch.jobId -Timeout $TimeoutSec -Interval $PollIntervalSec
  }

  $completedCount = ($batchResults | Where-Object { $_.status -eq "completed" }).Count
  Write-Host "Batch completed: $completedCount / $($batchJobs.Count)"

  if ($completedCount -ne $batchJobs.Count) {
    throw "Batch flow failed. Not all jobs completed successfully"
  }

  Write-Step "PASS: All smoke tests passed"
  exit 0
}
catch {
  Write-Host "`nFAIL: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
