param([Parameter(Mandatory=$true)][string]$TargetFile)
$ErrorActionPreference = 'Stop'
$stream = $null
try {
    $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
    $before = [Convert]::FromBase64String($payload.before)
    $after = [Convert]::FromBase64String($payload.after)
    # Windows rejects competing opens/writes while this handle is held.
    $stream = [IO.File]::Open($TargetFile, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    if ($stream.Length -ne $before.Length) { throw 'Concurrent change' }
    $actual = New-Object byte[] $before.Length
    $offset = 0
    while ($offset -lt $actual.Length) {
        $count = $stream.Read($actual, $offset, $actual.Length - $offset)
        if ($count -eq 0) { throw 'Unexpected end' }
        $offset += $count
    }
    if ([Convert]::ToBase64String($actual) -cne $payload.before) { throw 'Concurrent change' }
    try {
        $stream.Position = 0
        $stream.Write($after, 0, $after.Length)
        $stream.SetLength($after.Length)
        $stream.Flush($true)
    } catch {
        $stream.Position = 0
        $stream.Write($before, 0, $before.Length)
        $stream.SetLength($before.Length)
        $stream.Flush($true)
        throw
    }
} catch {
    [Console]::Error.WriteLine('Issue-Datei nicht aktualisiert: Konflikt oder Dateizugriff fehlgeschlagen.')
    exit 1
} finally {
    if ($null -ne $stream) { $stream.Dispose() }
}
