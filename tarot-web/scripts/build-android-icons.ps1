# 生成 Android 应用图标（legacy + adaptive）与启动图
#
# 源图：满幅方形底图（有纹理的底色 + 居中徽记），如 taluo 卡背风格
# 用法：powershell -ExecutionPolicy Bypass -File scripts\build-android-icons.ps1
#
# 2026-09-13 重写（原版假设源图是"透明背景圆形"，与新图不符）：
#   1. 自适应图标（Android 8+）= background/@color + foreground/@mipmap 两层。满幅图直接当前景
#      会被遮罩裁掉边缘（太阳光芒、月牙尖），因此前景做法是把源图缩到 72% 居中，
#      徽记落在系统安全区（66dp/108dp）内；四周用取样底色铺满，避免露出"图画方框"。
#   2. foreground 用 108dp 尺寸（旧脚本用 48dp legacy 尺寸，系统放大后发虚）；
#      legacy 尺寸只给 ic_launcher / ic_launcher_round（Android 7.1- 用）。
#   3. 底色不再写死：从源图四角取样，同时写回 values/ic_launcher_background.xml。
#   4. 启动图按屏幕比例合成（底色铺满 + 徽记居中 50%），避免整图被拉成大高个。
#      注意：底纹不能"模糊后铺满"——20px 模糊后仍能看出巨大徽记残影，观感很差。

Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\icon-source.png"
$resRoot = Join-Path $PSScriptRoot "..\android\app\src\main\res"

if (-not (Test-Path $srcPath)) { throw "source image not found: $srcPath" }
$src = New-Object System.Drawing.Bitmap((Resolve-Path $srcPath).Path)

function New-G([System.Drawing.Bitmap]$bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    return $g
}

# 取全图**逐通道中位数**作为底色：
# 背景像素占多数（徽记约占 1/4），中位数即背景色，且天然排除角落暗边与徽记高光的影响，
# 比"取四角平均"更接近真实底色（角落含暗角，会偏深，合成时会露出方框）。
function Get-BgColor([System.Drawing.Bitmap]$bmp) {
    $rs = New-Object System.Collections.Generic.List[int]
    $gs = New-Object System.Collections.Generic.List[int]
    $bs = New-Object System.Collections.Generic.List[int]
    for ($x = 0; $x -lt $bmp.Width; $x += 3) {
        for ($y = 0; $y -lt $bmp.Height; $y += 3) {
            $c = $bmp.GetPixel($x, $y)
            $rs.Add($c.R); $gs.Add($c.G); $bs.Add($c.B)
        }
    }
    $rs.Sort(); $gs.Sort(); $bs.Sort()
    $mid = [int]($rs.Count / 2)
    return [System.Drawing.Color]::FromArgb(255, $rs[$mid], $gs[$mid], $bs[$mid])
}

$bgColor = Get-BgColor $src
$hex = '#{0:X2}{1:X2}{2:X2}' -f $bgColor.R, $bgColor.G, $bgColor.B
Write-Host "  sampled background: $hex"

# 底色铺满 + 源图按 ratio 居中盖上
function Save-Composed([string]$file, [int]$w, [int]$h, [double]$ratio) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = New-G $bmp
    $g.Clear($bgColor)
    $side = [int]([Math]::Min($w, $h) * $ratio)
    $x = [int](($w - $side) / 2); $y = [int](($h - $side) / 2)
    $g.DrawImage($src, $x, $y, $side, $side)
    $g.Dispose()
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# 满幅等比铺满（不合成），用于 legacy 图标
function Save-Full([string]$file, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = New-G $bmp
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# ---- 1. mipmap：legacy 48dp + adaptive 108dp ----
$densities = @(
    @{ dir = "mipmap-mdpi";    legacy = 48;  icon = 108 },
    @{ dir = "mipmap-hdpi";    legacy = 72;  icon = 162 },
    @{ dir = "mipmap-xhdpi";   legacy = 96;  icon = 216 },
    @{ dir = "mipmap-xxhdpi";  legacy = 144; icon = 324 },
    @{ dir = "mipmap-xxxhdpi"; legacy = 192; icon = 432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resRoot $d.dir
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    Save-Full (Join-Path $dir "ic_launcher.png")       $d.legacy
    Save-Full (Join-Path $dir "ic_launcher_round.png") $d.legacy
    # 自适应前景：108dp 画布，徽记占 72%（落在系统安全区内）
    Save-Composed (Join-Path $dir "ic_launcher_foreground.png") $d.icon $d.icon 0.72

    Write-Host ("  {0}: legacy {1}px / adaptive {2}px" -f $d.dir, $d.legacy, $d.icon)
}

# ---- 2. 背景色写回 values/ic_launcher_background.xml ----
$bgXml = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- 自适应图标背景层：由 scripts/build-android-icons.ps1 从 icon-source.png 四角取样写入 -->
    <color name="ic_launcher_background">$hex</color>
</resources>
"@
$bgXmlPath = Join-Path $resRoot "values\ic_launcher_background.xml"
[System.IO.File]::WriteAllText($bgXmlPath, $bgXml, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "  wrote $bgXmlPath"

# ---- 3. 启动图：**不生成位图** ----
# drawable/splash.xml 已用 layer-list 实现（背景色 + 居中 @mipmap/ic_launcher_foreground），
# 它在任意屏幕都居中、按密度取清晰版本，且不增加包体。
# 2026-09-13 教训：往 drawable*/ 再放 splash.png 会与 splash.xml **资源重名导致 mergeResources 失败**
# （Duplicate resources），且早期方案把位图铺到 11 个目录曾让 APK 从 9.59MB 涨到 34.85MB。
# 所以本脚本只管图标，启动图交给 XML。

$src.Dispose()
Write-Host "Done."
