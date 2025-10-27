# Bionicle Arena - Version Management Script (PowerShell)
# Usage: .\version.ps1 [patch|minor|major]

param(
    [string]$VersionType = ""
)

$VERSION_FILE = "VERSION"
$CHANGELOG_FILE = "CHANGELOG.md"
$PACKAGE_JSON = "package.json"
$INDEX_HTML = "index.html"

# Function to get current version
function Get-CurrentVersion {
    if (Test-Path $VERSION_FILE) {
        return Get-Content $VERSION_FILE -Raw | ForEach-Object { $_.Trim() }
    } else {
        return "1.0.0"
    }
}

# Function to increment version
function New-Version {
    param(
        [string]$CurrentVersion,
        [string]$Type
    )
    
    $versionParts = $CurrentVersion.Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1] 
    $patch = [int]$versionParts[2]
    
    switch ($Type) {
        "patch" { $patch++ }
        "minor" { $minor++; $patch = 0 }
        "major" { $major++; $minor = 0; $patch = 0 }
        default { 
            Write-Error "Invalid version type. Use: patch, minor, or major"
            exit 1
        }
    }
    
    return "$major.$minor.$patch"
}

# Function to update version in files
function Update-VersionFiles {
    param([string]$NewVersion)
    
    $date = Get-Date -Format "yyyy-MM-dd"
    
    # Update VERSION file
    Set-Content -Path $VERSION_FILE -Value $NewVersion
    
    # Update package.json
    if (Test-Path $PACKAGE_JSON) {
        $content = Get-Content $PACKAGE_JSON -Raw
        $content = $content -replace '"version": ".*"', "`"version`": `"$NewVersion`""
        Set-Content -Path $PACKAGE_JSON -Value $content
    }
    
    # Update index.html
    if (Test-Path $INDEX_HTML) {
        $content = Get-Content $INDEX_HTML -Raw
        $content = $content -replace '<div class="version-info">v.*</div>', "<div class=`"version-info`">v$NewVersion</div>"
        Set-Content -Path $INDEX_HTML -Value $content
    }
    
    Write-Host "Version files updated successfully!" -ForegroundColor Green
}

# Main script
if ([string]::IsNullOrEmpty($VersionType)) {
    $currentVersion = Get-CurrentVersion
    Write-Host "Current version: $currentVersion" -ForegroundColor Yellow
    Write-Host "Usage: .\version.ps1 [patch|minor|major]" -ForegroundColor Cyan
    exit 0
}

$currentVersion = Get-CurrentVersion
$newVersion = New-Version -CurrentVersion $currentVersion -Type $VersionType

Write-Host "Updating version from $currentVersion to $newVersion" -ForegroundColor Yellow
Update-VersionFiles -NewVersion $newVersion

Write-Host ""
Write-Host "Don't forget to:" -ForegroundColor Cyan
Write-Host "1. Update CHANGELOG.md with your changes" -ForegroundColor White
Write-Host "2. Commit your changes: git add . && git commit -m 'Release v$newVersion'" -ForegroundColor White
Write-Host "3. Tag the release: git tag v$newVersion" -ForegroundColor White