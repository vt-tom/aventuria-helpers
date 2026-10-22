param([ValidateSet('status','compare','deploy','export-packs','deploy-packs')][string]$Action='status',[switch]$Force,[switch]$Restart)
$ErrorActionPreference='Stop'
# Identisch in allen Development-Modulen; nur diese Tabelle kennt die Foundry-Ziele.
$targets=@{
  'dsa5-helpers'='D:\FoundryVTT\user-data-paths\v14\Data\modules\dsa5-helpers'
  'melliador-helpers'='D:\FoundryVTT\user-data-paths\v14\Data\modules\melliador-helpers'
  'aventuria-helpers'='D:\FoundryVTT\user-data-paths\v14-aventuria\Data\modules\aventuria-helpers'
}
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$id=Split-Path $root -Leaf
if(!$targets.ContainsKey($id)){throw 'Unbekanntes Modul'}
if($root -ne "D:\Development\$id"){throw 'Nur aus der Development-Arbeitskopie ausfuehren'}
$target=$targets[$id]
$dataPath=Split-Path (Split-Path (Split-Path $target))
$manifest=Get-Content -LiteralPath (Join-Path $root 'module.json') -Raw | ConvertFrom-Json
$packNames=@($manifest.packs | Where-Object {$_} | ForEach-Object {$_.name})
$targetPacks=Join-Path $target 'packs'
if($manifest.id -ne $id){throw 'Manifest-Pruefung fehlgeschlagen'}
if($packNames.Count -eq 0){
  if((Test-Path -LiteralPath (Join-Path $root 'packs')) -or (Test-Path -LiteralPath $targetPacks)){throw 'Pack-Ordner ohne Packs im Manifest; keine Datenbanken mit diesem Skript uebertragen'}
} else {
  # Quellen: packs/_source/<name> (Git). Kompilierte Packs entstehen nur in .deploy\builds.
  foreach($pack in $manifest.packs){if($pack.path -ne "packs/$($pack.name)" -or !(Test-Path -LiteralPath (Join-Path $root "packs\_source\$($pack.name)"))){throw "Pack-Pruefung fehlgeschlagen: $($pack.name)"}}
}
# Explizite Laufzeitdateien; Entwicklungsdateien, Git und packs bleiben ausserhalb dieser Liste.
$runtime=@('module.json','scripts','styles','templates','lang','assets','LICENSE','README.md','README-de.md','CHANGELOG.md','CHANGES.md','CHANGES-en.md')
$entries=$runtime | Where-Object {Test-Path -LiteralPath (Join-Path $root $_)}
$state=Join-Path $root '.deploy'
$deployed=Join-Path $state 'deployed-sources'
function Assert-PlainTree($dir){
  if((Get-Item -Force -LiteralPath $dir).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Verknuepfung nicht erlaubt: $dir"}
  foreach($child in Get-ChildItem -LiteralPath $dir -Force){
    if($child.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Verknuepfung nicht erlaubt: $($child.FullName)"}
    if($child.PSIsContainer){Assert-PlainTree $child.FullName}
  }
}
function Inventory($dir,$names){
  $result=@{}
  foreach($name in $names){
    $p=Join-Path $dir $name
    if(!(Test-Path -LiteralPath $p)){continue}
    $item=Get-Item -Force -LiteralPath $p
    $files=if($item.PSIsContainer){Get-ChildItem -LiteralPath $p -Recurse -File -Force}else{@($item)}
    foreach($file in $files){$relative=$file.FullName.Substring($dir.Length+1); $result[$relative]=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash}
  }
  return $result
}
# Move-Item weicht bei gesperrten Ordnern still auf Kopieren+Loeschen aus und hinterlaesst Halbzustaende.
# Directory.Move/File.Move sind auf demselben Laufwerk atomar und scheitern sonst vollstaendig.
function Move-Atomic($from,$to){
  if((Get-Item -Force -LiteralPath $from).PSIsContainer){[IO.Directory]::Move($from,$to)}else{[IO.File]::Move($from,$to)}
}
function Test-Same($a,$b){
  if($a.Count -ne $b.Count){return $false}
  foreach($key in $a.Keys){if($a[$key] -ne $b[$key]){return $false}}
  return $true
}
function Assert-Same($a,$b){
  if($a.Count -ne $b.Count){throw 'Dateizahl stimmt nicht ueberein'}
  foreach($key in $a.Keys){if($a[$key] -ne $b[$key]){throw "Hashabweichung: $key"}}
}
function Test-FoundryRunning{
  # pm2 oder direkter Start: nur --dataPath ist verlaesslich, exakt verglichen (v14 ist Praefix von v14-aventuria).
  $wanted=$dataPath.Replace('\','/').TrimEnd('/').ToLower()
  foreach($cmd in @(Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'node.exe' -or $_.Name -like '*Foundry*'} | ForEach-Object {$_.CommandLine})){
    if("$cmd".Replace('\','/').ToLower() -match '--datapath[= ]"?([^"\s]+)'){if($Matches[1].TrimEnd('/') -eq $wanted){return $true}}
  }
  return $false
}
function Invoke-Packs{
  & node (Join-Path $PSScriptRoot 'foundry-packs.mjs') @args
  if($LASTEXITCODE -ne 0){throw "foundry-packs.mjs $($args[0]) fehlgeschlagen"}
}
function Pack-State{
  if(!(Test-Path -LiteralPath $targetPacks)){return 'fehlen in Foundry'}
  if(!(Test-Path -LiteralPath $deployed)){return 'unbekannt (noch nie per deploy-packs uebertragen)'}
  if(Test-Same (Inventory (Join-Path $root 'packs\_source') $packNames) (Inventory $deployed $packNames)){return 'aktuell'}
  return 'veraltet (deploy-packs)'
}
# Live-Bearbeitungen in Foundry erkennen: Export (Wegwerfkopie) gegen den zuletzt uebertragenen Quellstand.
function Export-FoundryPacks($dest){
  Invoke-Packs export $target $dest | Out-Host
  $baseline=if(Test-Path -LiteralPath $deployed){$deployed}else{Join-Path $root 'packs\_source'}
  # Ausgabe nicht in den Rueckgabewert der Funktion laufen lassen.
  & node (Join-Path $PSScriptRoot 'foundry-packs.mjs') compare $baseline $dest --accept (Join-Path $root 'packs\_source') --fail-on-diff | Out-Host
  if($LASTEXITCODE -eq 3){return $true}
  if($LASTEXITCODE -ne 0){throw 'Vergleich fehlgeschlagen'}
  return $false
}
foreach($entry in $entries){$p=Join-Path $root $entry; if((Get-Item -Force -LiteralPath $p).PSIsContainer){Assert-PlainTree $p}elseif((Get-Item -Force -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Verknuepfung in Quelle'}}
if(Test-Path -LiteralPath $target){
  # Vor dem Verschieben (deploy) den ganzen Ordner pruefen, sonst nur das, was verglichen oder ersetzt wird.
  if($Action -eq 'deploy'){Assert-PlainTree $target}
  else{foreach($name in @($runtime)+@('packs')){$p=Join-Path $target $name; if(Test-Path -LiteralPath $p){if((Get-Item -Force -LiteralPath $p).PSIsContainer){Assert-PlainTree $p}elseif((Get-Item -Force -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Verknuepfung nicht erlaubt: $p"}}}}
}
$source=Inventory $root $entries
$installed=Inventory $target $runtime
$changes=@(foreach($key in @(@($source.Keys)+@($installed.Keys) | Sort-Object -Unique)){
  if($source[$key] -ne $installed[$key]){if(!$source.ContainsKey($key)){"Entfaellt: $key"}elseif(!$installed.ContainsKey($key)){"Neu: $key"}else{"Geaendert: $key"}}
})
Write-Output "Quelle: $root"
Write-Output "Foundry-Kopie: $target"
Write-Output "Laufzeitdateien: $($source.Count); Inhaltsabweichungen: $($changes.Count)"
if($packNames.Count){
  $packState=Pack-State
  Write-Output "Packs ($($packNames -join ', ')): $packState; Foundry laeuft: $(Test-FoundryRunning)"
} elseif($Action -in @('export-packs','deploy-packs')){throw 'Dieses Modul hat keine Packs'}
if($Action -eq 'status'){return}
if($Action -eq 'compare'){$changes; return}
if($Restart){
  # Nur fuer pm2-gestartetes Foundry: stoppen, Pack-Aktion in eigenem Prozess, danach in jedem Fall wieder starten.
  if($Action -notin @('export-packs','deploy-packs')){throw '-Restart nur mit export-packs oder deploy-packs'}
  $found="$(& node (Join-Path $PSScriptRoot 'foundry-packs.mjs') pm2-find $dataPath 2>$null)".Trim()
  if($LASTEXITCODE -ne 0 -or !$found){throw "Kein pm2-Prozess mit --dataPath=$dataPath gefunden"}
  $pmId,$pmStatus=$found -split ' '
  $wasOnline=$pmStatus -eq 'online'
  if($wasOnline){
    Write-Output "Stoppe Foundry (pm2 $pmId) ..."
    & pm2.cmd stop $pmId | Out-Null
    if($LASTEXITCODE -ne 0){throw "pm2 stop $pmId fehlgeschlagen"}
  }
  $code=1
  try {
    $deadline=(Get-Date).AddSeconds(60)
    while(Test-FoundryRunning){if((Get-Date) -gt $deadline){throw 'Foundry-Prozess nach 60 s noch aktiv'}; Start-Sleep -Milliseconds 500}
    $childArgs=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,$Action)
    if($Force){$childArgs+='-Force'}
    & powershell.exe @childArgs
    $code=$LASTEXITCODE
  } finally {
    if($wasOnline){
      Write-Output "Starte Foundry (pm2 $pmId) ..."
      & pm2.cmd start $pmId | Out-Null
      if($LASTEXITCODE -ne 0){Write-Warning "pm2 start $pmId fehlgeschlagen - Foundry von Hand starten"}
    }
  }
  if($code -ne 0){throw "$Action fehlgeschlagen (siehe oben)"}
  if($wasOnline){Write-Output 'Foundry laeuft wieder; Welt neu laden.'}
  return
}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss-fff'
if($Action -eq 'export-packs'){
  if(Test-FoundryRunning){throw 'Foundry zuerst zum Setup zurueckkehren lassen und den Server stoppen'}
  $dest=Join-Path $state "exports\$stamp"
  if(Export-FoundryPacks $dest){Write-Output "Abweichungen oben. Einzeln uebernehmen: node tools/foundry-packs.mjs adopt `"$dest`" <Pack> <ID> [--new]"}
  else{Write-Output 'Keine Live-Bearbeitungen gegenueber dem zuletzt uebertragenen Stand.'}
  return
}
$backupRoot="D:\FoundryBackups\$stamp\$id"
if($Action -eq 'deploy'){
  New-Item -ItemType Directory -Path $backupRoot | Out-Null
  # Vollstaendiges altes Modul einschliesslich .git/Notizen bleibt als Sicherung erhalten; packs bleibt liegen (deploy-packs).
  $stage=Join-Path $backupRoot 'prepared'
  New-Item -ItemType Directory -Path $stage | Out-Null
  foreach($entry in $entries){Copy-Item -LiteralPath (Join-Path $root $entry) -Destination $stage -Recurse}
  Assert-Same $source (Inventory $stage $entries)
  # Erneut pruefen, falls die Quelle waehrend des Kopierens bearbeitet wurde.
  Assert-Same $source (Inventory $root $entries)
  $backup=Join-Path $backupRoot 'previous-module'
  $keep=@('packs')
  $allBefore=if(Test-Path -LiteralPath $target){Inventory $target @((Get-ChildItem -LiteralPath $target -Force).Name | Where-Object {$_ -notin $keep})}else{@{}}
  $moved=@()
  try {
    New-Item -ItemType Directory -Path $backup | Out-Null
    if(Test-Path -LiteralPath $target){
      foreach($item in Get-ChildItem -LiteralPath $target -Force | Where-Object {$_.Name -notin $keep}){
        Move-Atomic $item.FullName (Join-Path $backup $item.Name)
        $moved += $item.Name
      }
      Assert-Same $allBefore (Inventory $backup @((Get-ChildItem -LiteralPath $backup -Force).Name))
    } else {New-Item -ItemType Directory -Path $target | Out-Null}
    foreach($item in Get-ChildItem -LiteralPath $stage -Force){Copy-Item -LiteralPath $item.FullName -Destination $target -Recurse}
    Assert-Same $source (Inventory $target $entries)
  } catch {
    $failure=$_
    # Auch bei einem gesperrten Modulordner bereits verschobene Eintraege wiederherstellen.
    $failed=Join-Path $backupRoot 'failed-module'
    New-Item -ItemType Directory -Path $failed | Out-Null
    foreach($name in $moved){
      $p=Join-Path $target $name
      if(Test-Path -LiteralPath $p){Move-Atomic $p (Join-Path $failed $name)}
      Move-Atomic (Join-Path $backup $name) (Join-Path $target $name)
    }
    throw $failure
  }
  Write-Output "Uebertragung per SHA-256 geprueft. Sicherung: $backup"
  if($packNames.Count -and $packState -ne 'aktuell'){Write-Output "Hinweis: Packs $packState - bei gestopptem Foundry deploy-packs ausfuehren."}
  Write-Output 'Foundry-Browser nach der Uebertragung neu laden (F5). Keine Welt-/Systemdaten geaendert.'
  return
}
# deploy-packs: LevelDB-Dateien nur bei gestopptem Foundry ersetzen.
if(Test-FoundryRunning){throw 'Foundry zuerst zum Setup zurueckkehren lassen und den Server stoppen'}
foreach($name in $packNames){
  $lock=Join-Path $targetPacks "$name\LOCK"
  if(Test-Path -LiteralPath $lock){try {[IO.File]::Open($lock,'Open','ReadWrite','None').Close()} catch {throw "Pack $name ist gesperrt"}}
}
if(Test-Path -LiteralPath $targetPacks){
  $export=Join-Path $state "exports\$stamp"
  if((Export-FoundryPacks $export) -and !$Force){throw "Foundry-Packs weichen vom zuletzt uebertragenen Stand ab (Live-Bearbeitung?). Einzeln uebernehmen: node tools/foundry-packs.mjs adopt `"$export`" <Pack> <ID> [--new] - oder bewusst verwerfen mit -Force."}
}
$build=Join-Path $state "builds\$stamp"
Invoke-Packs build $build
New-Item -ItemType Directory -Path $backupRoot | Out-Null
$built=Inventory $build $packNames.ForEach({"packs\$_"})
$backup=Join-Path $backupRoot 'previous-packs'
New-Item -ItemType Directory -Path $backup | Out-Null
# Alles in packs (auch Reste wie _source aus einem frueheren Git-Checkout) wandert in die Sicherung.
$allBefore=if(Test-Path -LiteralPath $targetPacks){Inventory $targetPacks @((Get-ChildItem -LiteralPath $targetPacks -Force).Name)}else{@{}}
$moved=@()
try {
  if(Test-Path -LiteralPath $targetPacks){
    foreach($item in Get-ChildItem -LiteralPath $targetPacks -Force){
      Move-Atomic $item.FullName (Join-Path $backup $item.Name)
      $moved += $item.Name
    }
    Assert-Same $allBefore (Inventory $backup @((Get-ChildItem -LiteralPath $backup -Force).Name))
  } else {New-Item -ItemType Directory -Path $targetPacks | Out-Null}
  foreach($name in $packNames){Copy-Item -LiteralPath (Join-Path $build "packs\$name") -Destination $targetPacks -Recurse}
  Assert-Same $built (Inventory $target $packNames.ForEach({"packs\$_"}))
} catch {
  $failure=$_
  $failed=Join-Path $backupRoot 'failed-packs'
  New-Item -ItemType Directory -Path $failed | Out-Null
  foreach($name in $moved){
    $p=Join-Path $targetPacks $name
    if(Test-Path -LiteralPath $p){Move-Atomic $p (Join-Path $failed $name)}
    Move-Atomic (Join-Path $backup $name) (Join-Path $targetPacks $name)
  }
  throw $failure
}
if(Test-Path -LiteralPath $deployed){Remove-Item -LiteralPath $deployed -Recurse}
Copy-Item -LiteralPath (Join-Path $build 'sources') -Destination $deployed -Recurse
Write-Output "Packs per Rueckexport und SHA-256 geprueft. Build: $build; Sicherung: $backup"
Write-Output 'Foundry jetzt starten. Keine Welt-/Systemdaten geaendert.'
