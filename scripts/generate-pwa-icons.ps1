Add-Type -AssemblyName System.Drawing

$rootPath = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $rootPath "public\logo\cosayach.png"
$outputPath = Join-Path $rootPath "public\pwa-icons"

if (-not (Test-Path $sourcePath)) {
    throw "No se encontró el logo base en $sourcePath"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

function New-BrandColor {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Hex,

        [byte] $Alpha = 255
    )

    $baseColor = [System.Drawing.ColorTranslator]::FromHtml($Hex)

    return [System.Drawing.Color]::FromArgb($Alpha, $baseColor.R, $baseColor.G, $baseColor.B)
}

function New-RoundedRectanglePath {
    param(
        [float] $X,
        [float] $Y,
        [float] $Width,
        [float] $Height,
        [float] $Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2

    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    return $path
}

$brandPrimary = New-BrandColor -Hex "#4e0bd9"
$brandSecondary = New-BrandColor -Hex "#2b066f"
$cardStart = New-BrandColor -Hex "#ffffff"
$cardEnd = New-BrandColor -Hex "#f6f3ff"
$cardBorder = [System.Drawing.Color]::FromArgb(55, 255, 255, 255)
$cardShadow = [System.Drawing.Color]::FromArgb(38, 11, 15, 35)
$orbHighlight = [System.Drawing.Color]::FromArgb(38, 255, 255, 255)
$accentFill = [System.Drawing.Color]::FromArgb(44, 78, 11, 217)

$logo = [System.Drawing.Image]::FromFile($sourcePath)

function Save-BrandIcon {
    param(
        [int] $Size,
        [ValidateSet("any", "maskable")]
        [string] $Variant,
        [string] $FileName
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $backgroundBrush = $null
    $orbBrush = $null
    $shadowBrush = $null
    $cardBrush = $null
    $borderPen = $null
    $lineBrush = $null
    $shadowPath = $null
    $cardPath = $null
    $linePath = $null

    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.Clear($brandPrimary)

        $canvasRect = New-Object System.Drawing.RectangleF 0, 0, $Size, $Size
        $backgroundBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($canvasRect, $brandPrimary, $brandSecondary, 135.0)
        $graphics.FillRectangle($backgroundBrush, $canvasRect)

        $orbBrush = New-Object System.Drawing.SolidBrush($orbHighlight)
        $graphics.FillEllipse($orbBrush, [float] ($Size * 0.62), [float] ($Size * 0.08), [float] ($Size * 0.24), [float] ($Size * 0.24))

        $outerPadding = if ($Variant -eq "maskable") { [float] ($Size * 0.18) } else { [float] ($Size * 0.12) }
        $cardWidth = [float] ($Size - ($outerPadding * 2))
        $cardHeight = if ($Variant -eq "maskable") { [float] ($Size * 0.42) } else { [float] ($Size * 0.44) }
        $cardX = [float] (($Size - $cardWidth) / 2)
        $cardY = [float] (($Size - $cardHeight) / 2)
        $cardRadius = [float] ($cardHeight * 0.28)

        $shadowPath = New-RoundedRectanglePath -X $cardX -Y ([float] ($cardY + ($Size * 0.022))) -Width $cardWidth -Height $cardHeight -Radius $cardRadius
        $shadowBrush = New-Object System.Drawing.SolidBrush($cardShadow)
        $graphics.FillPath($shadowBrush, $shadowPath)

        $cardRect = New-Object System.Drawing.RectangleF $cardX, $cardY, $cardWidth, $cardHeight
        $cardPath = New-RoundedRectanglePath -X $cardX -Y $cardY -Width $cardWidth -Height $cardHeight -Radius $cardRadius
        $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($cardRect, $cardStart, $cardEnd, 90.0)
        $graphics.FillPath($cardBrush, $cardPath)

        $borderPen = New-Object System.Drawing.Pen($cardBorder, [Math]::Max(1, [Math]::Round($Size * 0.005)))
        $graphics.DrawPath($borderPen, $cardPath)

        $lineWidth = [float] ($cardWidth * 0.52)
        $lineHeight = [float] [Math]::Max(4, [Math]::Round($Size * 0.022))
        $lineX = [float] (($Size - $lineWidth) / 2)
        $lineY = [float] ($cardY + ($cardHeight * 0.72))
        $linePath = New-RoundedRectanglePath -X $lineX -Y $lineY -Width $lineWidth -Height $lineHeight -Radius ([float] ($lineHeight / 2))
        $lineBrush = New-Object System.Drawing.SolidBrush($accentFill)
        $graphics.FillPath($lineBrush, $linePath)

        $logoMaxWidth = if ($Variant -eq "maskable") { [float] ($cardWidth * 0.76) } else { [float] ($cardWidth * 0.82) }
        $logoMaxHeight = [float] ($cardHeight * 0.42)
        $scale = [Math]::Min($logoMaxWidth / $logo.Width, $logoMaxHeight / $logo.Height)
        $logoWidth = [int] [Math]::Round($logo.Width * $scale)
        $logoHeight = [int] [Math]::Round($logo.Height * $scale)
        $logoAreaY = [float] ($cardY + ($cardHeight * 0.12))
        $logoAreaHeight = [float] ($cardHeight * 0.46)
        $logoX = [int] [Math]::Round(($Size - $logoWidth) / 2)
        $logoY = [int] [Math]::Round($logoAreaY + (($logoAreaHeight - $logoHeight) / 2))
        $graphics.DrawImage($logo, (New-Object System.Drawing.Rectangle $logoX, $logoY, $logoWidth, $logoHeight))

        $bitmap.Save((Join-Path $outputPath $FileName), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        if ($linePath) { $linePath.Dispose() }
        if ($cardPath) { $cardPath.Dispose() }
        if ($shadowPath) { $shadowPath.Dispose() }
        if ($lineBrush) { $lineBrush.Dispose() }
        if ($borderPen) { $borderPen.Dispose() }
        if ($cardBrush) { $cardBrush.Dispose() }
        if ($shadowBrush) { $shadowBrush.Dispose() }
        if ($orbBrush) { $orbBrush.Dispose() }
        if ($backgroundBrush) { $backgroundBrush.Dispose() }
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
    }
}

try {
    Save-BrandIcon -Size 180 -Variant any -FileName "apple-touch-icon.png"
    Save-BrandIcon -Size 192 -Variant any -FileName "icon-192.png"
    Save-BrandIcon -Size 512 -Variant any -FileName "icon-512.png"
    Save-BrandIcon -Size 192 -Variant maskable -FileName "maskable-192.png"
    Save-BrandIcon -Size 512 -Variant maskable -FileName "maskable-512.png"
}
finally {
    $logo.Dispose()
}