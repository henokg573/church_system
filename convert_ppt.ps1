param(
    [Parameter(Mandatory=$true)][string]$InputFile,
    [Parameter(Mandatory=$true)][string]$OutputFile
)
$ErrorActionPreference = "Stop"
$powerpoint = $null
$presentation = $null
try {
    $powerpoint = New-Object -ComObject PowerPoint.Application
    # msoFalse = 0 : open without a window
    $presentation = $powerpoint.Presentations.Open($InputFile, $true, $false, $false)
    # ppSaveAsPDF = 32
    $presentation.SaveAs($OutputFile, 32)
    $presentation.Close()
    Write-Output "OK"
}
finally {
    if ($presentation) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    if ($powerpoint) { $powerpoint.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
