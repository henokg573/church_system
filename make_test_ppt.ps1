$ErrorActionPreference = "Stop"
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Add($false)
$slide1 = $pres.Slides.Add(1, 1)
$slide1.Shapes.Title.TextFrame.TextRange.Text = "Presenter Test Slide 1"
$slide2 = $pres.Slides.Add(2, 1)
$slide2.Shapes.Title.TextFrame.TextRange.Text = "Presenter Test Slide 2"
$out = "C:\Users\Henok Girma\Documents\church_system 2\church_system\test_upload.pptx"
$pres.SaveAs($out, 24)  # ppSaveAsOpenXMLPresentation
$pres.Close()
$pp.Quit()
Write-Output "CREATED $out"
