# Pulls new CRM database backups from the VPS to this machine. Pull-based on
# purpose: the laptop isn't always on, so each run just fetches whatever it
# missed. Meant to be run by a Windows scheduled task (see
# Context/11.DbBackup.md) but safe to run by hand.
#
# Remote layout is produced by scripts/backup-db.sh:
#   ~/Mapping/backups/auto/{db_*.custom, daily/, weekly/}
# Local mirror: <LocalRoot>/{auto, daily, weekly}

param(
    [string]$KeyPath   = "D:\Hilmi\Coding\Sahaibat\VPS_DW\DWSSH.pem",
    [string]$Remote    = "DzakiWismadi@103.93.162.31",
    [string]$RemoteDir = "Mapping/backups/auto",
    [string]$LocalRoot = "D:\Hilmi\Coding\Sahaibat\Backups\vps-crm-db",
    # Local retention. "auto" files are 4/day, so only recent ones are kept;
    # daily/weekly are the long-term history.
    [int]$KeepAutoDays   = 7,
    [int]$KeepDailyDays  = 365,
    [int]$StaleAfterHours = 13
)

$ErrorActionPreference = "Stop"

# Git's ssh/scp don't enforce Windows ACLs on the key file the way the
# built-in OpenSSH does, so prefer them when present.
$gitBin = "C:\Program Files\Git\usr\bin"
$ssh = if (Test-Path "$gitBin\ssh.exe") { "$gitBin\ssh.exe" } else { "ssh" }
$scp = if (Test-Path "$gitBin\scp.exe") { "$gitBin\scp.exe" } else { "scp" }
$sshOpts = @("-i", $KeyPath, "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", "-o", "StrictHostKeyChecking=accept-new")

New-Item -ItemType Directory -Force -Path $LocalRoot, "$LocalRoot\auto", "$LocalRoot\daily", "$LocalRoot\weekly" | Out-Null
$log = Join-Path $LocalRoot "pull.log"
function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Add-Content -Path $log -Encoding utf8 }

try {
    # "<epoch-seconds> <relative path>" for every finished dump (*.tmp never matches).
    $listing = & $ssh @sshOpts $Remote "cd $RemoteDir && find . -name 'db_*.custom' -printf '%T@ %P\n'"
    if ($LASTEXITCODE -ne 0) { throw "ssh listing failed (exit $LASTEXITCODE)" }
    $remoteFiles = @($listing | Where-Object { $_ -match '\S' } | ForEach-Object {
        $epoch, $path = $_ -split ' ', 2
        [pscustomobject]@{ Epoch = [double]$epoch; Path = $path.Trim() }
    })
    if ($remoteFiles.Count -eq 0) { throw "no backups found on the VPS in $RemoteDir" }

    $newest = ($remoteFiles | Sort-Object Epoch -Descending | Select-Object -First 1)
    $ageH = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $newest.Epoch) / 3600
    if ($ageH -gt $StaleAfterHours) {
        Log ("WARN newest VPS backup is {0:N1}h old ({1}) - is the cron job running?" -f $ageH, $newest.Path)
    }

    $fetched = 0
    foreach ($f in $remoteFiles) {
        # Remote "db_x.custom" -> local auto\, "daily/db_x.custom" -> local daily\.
        $rel = if ($f.Path -match '/') { $f.Path -replace '/', '\' } else { "auto\$($f.Path)" }
        $dest = Join-Path $LocalRoot $rel
        if (Test-Path $dest) { continue }
        $tmp = "$dest.part"
        & $scp @sshOpts "${Remote}:$RemoteDir/$($f.Path)" $tmp
        if ($LASTEXITCODE -ne 0) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue; throw "scp failed for $($f.Path)" }
        if ((Get-Item $tmp).Length -lt 1024) { Remove-Item $tmp -Force; throw "downloaded file too small: $($f.Path)" }
        Move-Item $tmp $dest
        $fetched++
    }

    # Prune local copies by file time (the remote already prunes itself).
    Get-ChildItem "$LocalRoot\auto" -Filter "db_*.custom" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepAutoDays) } | Remove-Item -Force
    Get-ChildItem "$LocalRoot\daily" -Filter "db_*.custom" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDailyDays) } | Remove-Item -Force

    Log "OK fetched $fetched new file(s); newest on VPS: $($newest.Path)"
    Set-Content -Path (Join-Path $LocalRoot "last-success.txt") -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Encoding utf8
} catch {
    Log "FAIL $($_.Exception.Message)"
    exit 1
}
