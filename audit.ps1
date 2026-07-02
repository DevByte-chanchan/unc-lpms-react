$courses = Invoke-RestMethod -Uri "http://localhost:3000/api/courses" -Method Get
foreach ($c in $courses) {
    $code = $c.code
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:3000/api/courses/$code/items" -Method Get
    } catch { continue }
    Write-Output "=== $code ($($r.Count) items) ==="
    $violations = @()
    foreach ($item in $r) {
        $ilo = $item.ilo
        $cl = $item.cognitiveLevel
        if ([string]::IsNullOrEmpty($cl)) { continue }
        if ($ilo -eq "ILO1") {
            if ($cl -ne "Remembering" -and $cl -ne "Understanding") {
                $violations += "Item $($item.id): ILO1 has '$cl'"
            }
        }
        if ($ilo -eq "ILO2") {
            if ($cl -ne "Understanding" -and $cl -ne "Applying" -and $cl -ne "Analyzing" -and $cl -ne "Evaluating") {
                $violations += "Item $($item.id): ILO2 has '$cl'"
            }
        }
        if ($ilo -eq "ILO3") {
            if ($cl -ne "Applying" -and $cl -ne "Analyzing" -and $cl -ne "Evaluating" -and $cl -ne "Creating") {
                $violations += "Item $($item.id): ILO3 has '$cl'"
            }
        }
    }
    if ($violations.Count -gt 0) {
        Write-Output "  VIOLATIONS:"
        $violations | ForEach-Object { Write-Output "    $_" }
    } else {
        Write-Output "  ILO bounds: PASS"
    }
    $ilos = $r | Group-Object ilo
    $ilos | ForEach-Object { Write-Output "  $($_.Name): $($_.Count)" }
    $cls = $r | Group-Object cognitiveLevel
    $cls | ForEach-Object { Write-Output "  CL $($_.Name): $($_.Count)" }
    $withR = $r | Where-Object { $_.rubrics.Count -gt 0 } | Select-Object -First 1
    if ($withR) {
        $firstR = $withR.rubrics[0]
        $hasName = (-not [string]::IsNullOrEmpty($firstR.criteria))
        $hasDesc = (-not [string]::IsNullOrEmpty($firstR.description))
        if ($hasName -and $hasDesc) {
            Write-Output "  Rubric format: PASS (criteria+description present)"
        } else {
            Write-Output "  Rubric format: FAIL - name=$hasName desc=$hasDesc"
        }
    } else {
        Write-Output "  Rubric format: N/A (no items have rubrics)"
    }
    Write-Output ""
}
