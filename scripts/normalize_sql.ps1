# Normalizes SQL files under supabase/schemas
$files = Get-ChildItem -Path "..\apps\web\supabase\schemas" -Filter "*.sql" -Recurse
foreach ($f in $files) {
  $text = Get-Content $f.FullName -Raw -ErrorAction Stop
  # Normalize line endings
  $text = $text -replace "\r\n","\n"
  # Split into lines
  $lines = $text -split "\n"
  $out = @()
  $blankStreak = 0
  foreach ($line in $lines) {
    $trimmedEnd = $line.TrimEnd()
    # Convert leading tabs to two spaces
    $leading = $trimmedEnd -replace "^(\t+)", {param($m) ('  ' * ($m.Value.Length))}
    # Normalize leading spaces to even number (conservative)
    if ($leading -match '^(\s+)') {
      $lead = $matches[1]
      $count = $lead.Length
      if ($count % 2 -eq 1) { $count = $count - 1 }
      $rest = $trimmedEnd.Substring($lead.Length)
      $line2 = (' ' * $count) + $rest
    } else {
      $line2 = $trimmedEnd
    }

    if ($line2 -match '^[ \t]*$') {
      $blankStreak++
    } else {
      $blankStreak = 0
    }
    if ($blankStreak -le 1) { $out += $line2 }
  }
  $new = ($out -join "\r\n") + "\r\n"
  Set-Content -Path $f.FullName -Value $new -Encoding UTF8
  Write-Output "Formatted: $($f.FullName)"
}
