$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pdfOutput = Join-Path $projectRoot 'public\pdfs'
$temporaryOutput = Join-Path $projectRoot '.tmp\latex'
New-Item -ItemType Directory -Force -Path $pdfOutput, $temporaryOutput | Out-Null
foreach ($name in @('gaussian-integral', 'euler-lagrange', 'taylor-formula')) {
    $sourceFile = Join-Path $projectRoot "public\tex\$name.tex"
    & xelatex -interaction=nonstopmode -halt-on-error "-output-directory=$temporaryOutput" $sourceFile
    if ($LASTEXITCODE -ne 0) { throw "LaTeX compilation failed: $name" }
    Copy-Item -LiteralPath (Join-Path $temporaryOutput "$name.pdf") -Destination (Join-Path $pdfOutput "$name.pdf")
}
Write-Output 'Three sample PDFs compiled successfully.'
