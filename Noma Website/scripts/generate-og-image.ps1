Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bgColor = [System.Drawing.ColorTranslator]::FromHtml('#050506')
$g.Clear($bgColor)

# soft radial-ish glow (approximated with concentric translucent ellipses)
$accent = [System.Drawing.Color]::FromArgb(255, 125, 211, 192)
for ($i = 6; $i -ge 1; $i--) {
    $alpha = [int](5 * $i)
    $r = 90 + $i * 55
    $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 125, 211, 192))
    $g.FillEllipse($glowBrush, 900 - $r/2, 120 - $r/2, $r, $r)
    $glowBrush.Dispose()
}

# grid lines, faint
$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(10, 255, 255, 255)), 1
for ($x = 0; $x -lt $width; $x += 48) { $g.DrawLine($gridPen, $x, 0, $x, $height) }
for ($y = 0; $y -lt $height; $y += 48) { $g.DrawLine($gridPen, 0, $y, $width, $y) }
$gridPen.Dispose()

$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 234, 234, 236))
$accentBrush = New-Object System.Drawing.SolidBrush $accent
$mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 152, 152, 159))

$kickerFont = New-Object System.Drawing.Font('Consolas', 18, [System.Drawing.FontStyle]::Regular)
$g.DrawString('ADAPTIVE COMPUTER INTERFACE', $kickerFont, $accentBrush, 90, 130)

$titleFont = New-Object System.Drawing.Font('Segoe UI Semibold', 76, [System.Drawing.FontStyle]::Bold)
$g.DrawString('NOMA', $titleFont, $whiteBrush, 86, 175)

$taglineFont = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Regular)
$g.DrawString('Your computer changes.', $taglineFont, $whiteBrush, 90, 330)
$g.DrawString('Your interface should too.', $taglineFont, $mutedBrush, 90, 375)

# rotary encoder mark, bottom-left, echoes the favicon/hardware motif
$ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 40, 40, 47)), 3
$g.DrawEllipse($ringPen, 90, 470, 90, 90)
$ringPen.Dispose()
$accentPen = New-Object System.Drawing.Pen $accent, 4
$accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($accentPen, 135, 515, 135, 480)
$accentPen.Dispose()
$g.FillEllipse($accentBrush, 127, 507, 16, 16)

$g.Dispose()
$outPath = Join-Path $PSScriptRoot '..\public\og-image.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "Saved $outPath"
