# Runs gosom/google-maps-scraper for one or more queries and writes JSON
# results to scrape-output/<name>.json. Import into the leads table
# afterwards via the admin UI ("Scrapes" page) or POST /api/admin/import-staging.
#
# Usage:
#   .\scripts\run-scrape.ps1 -QueriesFile .\scrape-queries\yogyakarta.txt -Name yogyakarta-2026-09-02
#
# See docs/SCRAPER_GUIDE.md for flag reference and the block-risk tradeoff
# behind the conservative -c/-depth defaults below.

param(
    [Parameter(Mandatory = $true)]
    [string]$QueriesFile,

    [Parameter(Mandatory = $true)]
    [string]$Name,

    [int]$Concurrency = 2,
    [int]$Depth = 3,
    [string]$Lang = "id",
    [string]$Geo = "",
    [double]$Radius = 15000,
    [int]$Zoom = 13
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $repoRoot "scrape-output"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$queriesFullPath = (Resolve-Path $QueriesFile).Path
$outputFile = Join-Path $outputDir "$Name.json"

$dockerArgs = @(
    "run", "--rm",
    "-v", "gmaps-playwright-cache:/opt",
    "-v", "${queriesFullPath}:/queries.txt:ro",
    "-v", "${outputDir}:/out",
    "gosom/google-maps-scraper",
    "-input", "/queries.txt",
    "-results", "/out/$Name.json",
    "-json",
    "-depth", "$Depth",
    "-c", "$Concurrency",
    "-lang", "$Lang",
    "-exit-on-inactivity", "3m"
)

if ($Geo -ne "") {
    $dockerArgs += @("-geo", $Geo, "-radius", "$Radius", "-zoom", "$Zoom")
}

Write-Host "Running: docker $($dockerArgs -join ' ')"
& docker @dockerArgs

Write-Host ""
Write-Host "Done. Results written to: $outputFile"
Write-Host "Import into leads via the admin Scrapes page, or:"
Write-Host "  npx tsx scripts/import-scrape-json.ts --file `"$outputFile`" --query `"$(Get-Content $QueriesFile -Raw)`""
