Add-Type -AssemblyName System.Drawing
$S = 1024
$bmp = New-Object System.Drawing.Bitmap $S, $S
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::Transparent)

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# Purple rounded-square background with a diagonal gradient (brand violet)
$bg = RoundRect 0 0 $S $S 210
$rect = New-Object System.Drawing.Rectangle 0, 0, $S, $S
$c1 = [System.Drawing.ColorTranslator]::FromHtml("#7b5fd4")
$c2 = [System.Drawing.ColorTranslator]::FromHtml("#5a3fb0")
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $c1, $c2, 55.0
$g.FillPath($grad, $bg)

# Subtle inner glow ring
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(46, 255, 255, 255)), 6
$g.DrawPath($pen, (RoundRect 26 26 ($S-52) ($S-52) 188))

# White terminal "V"
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = [System.Drawing.StringAlignment]::Center
$fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
$vPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$layout = New-Object System.Drawing.RectangleF 0, -70, $S, $S
$vPath.AddString("V", (New-Object System.Drawing.FontFamily("Consolas")),
  [int][System.Drawing.FontStyle]::Bold, 600, $layout, $fmt)
$g.FillPath([System.Drawing.Brushes]::White, $vPath)

# Orange accent underline (the vovonacci.com/live accent #f5b13d)
$orange = [System.Drawing.ColorTranslator]::FromHtml("#f5b13d")
$ob = New-Object System.Drawing.SolidBrush $orange
$g.FillPath($ob, (RoundRect (($S/2)-170) 762 340 46 23))

$g.Dispose()
$out = "C:\Users\Pedro\vovonacci-reader\icon-source.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "wrote $out"
