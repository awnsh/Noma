Add-Type -AssemblyName System.Drawing

$logoPath = Join-Path $PSScriptRoot '..\src\assets\noma-logo.png'
$logo = [System.Drawing.Image]::FromFile($logoPath)

$size = 64
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# rounded dark square background
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#09090b'))
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 14
$rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$path.AddArc($rect.X, $rect.Y, $r*2, $r*2, 180, 90)
$path.AddArc($rect.Right-$r*2, $rect.Y, $r*2, $r*2, 270, 90)
$path.AddArc($rect.Right-$r*2, $rect.Bottom-$r*2, $r*2, $r*2, 0, 90)
$path.AddArc($rect.X, $rect.Bottom-$r*2, $r*2, $r*2, 90, 90)
$path.CloseFigure()
$g.FillPath($bgBrush, $path)

# logo mark, padded
$pad = 12
$g.DrawImage($logo, $pad, $pad, $size - $pad*2, $size - $pad*2)
$g.Dispose()

$outPath = Join-Path $PSScriptRoot '..\public\favicon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Saved $outPath"
