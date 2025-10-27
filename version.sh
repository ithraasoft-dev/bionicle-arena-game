#!/bin/bash

# Bionicle Arena - Version Management Script
# Usage: ./version.sh [patch|minor|major]

VERSION_FILE="VERSION"
CHANGELOG_FILE="CHANGELOG.md"
PACKAGE_JSON="package.json"

# Function to get current version
get_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "1.0.0"
    fi
}

# Function to increment version
increment_version() {
    local version=$1
    local type=$2
    
    IFS='.' read -r -a version_parts <<< "$version"
    major=${version_parts[0]}
    minor=${version_parts[1]}
    patch=${version_parts[2]}
    
    case $type in
        "patch")
            patch=$((patch + 1))
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        *)
            echo "Invalid version type. Use: patch, minor, or major"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Function to update version in files
update_version_files() {
    local new_version=$1
    local date=$(date +%Y-%m-%d)
    
    # Update VERSION file
    echo "$new_version" > "$VERSION_FILE"
    
    # Update package.json
    if [ -f "$PACKAGE_JSON" ]; then
        sed -i "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
    fi
    
    # Update index.html
    if [ -f "index.html" ]; then
        sed -i "s/<div class=\"version-info\">v.*<\/div>/<div class=\"version-info\">v$new_version<\/div>/" "index.html"
    fi
    
    # Add entry to changelog
    local temp_file=$(mktemp)
    echo "# Changelog" > "$temp_file"
    echo "" >> "$temp_file"
    echo "All notable changes to the Bionicle Arena project will be documented in this file." >> "$temp_file"
    echo "" >> "$temp_file"
    echo "## [$new_version] - $date" >> "$temp_file"
    echo "" >> "$temp_file"
    echo "### Added" >> "$temp_file"
    echo "- " >> "$temp_file"
    echo "" >> "$temp_file"
    echo "### Changed" >> "$temp_file"
    echo "- " >> "$temp_file"
    echo "" >> "$temp_file"
    echo "### Fixed" >> "$temp_file"
    echo "- " >> "$temp_file"
    echo "" >> "$temp_file"
    
    # Append existing changelog content (skip the first few lines)
    if [ -f "$CHANGELOG_FILE" ]; then
        tail -n +5 "$CHANGELOG_FILE" >> "$temp_file"
    fi
    
    mv "$temp_file" "$CHANGELOG_FILE"
}

# Main script
if [ $# -eq 0 ]; then
    echo "Current version: $(get_version)"
    echo "Usage: $0 [patch|minor|major]"
    exit 0
fi

current_version=$(get_version)
new_version=$(increment_version "$current_version" "$1")

echo "Updating version from $current_version to $new_version"
update_version_files "$new_version"

echo "Version updated successfully!"
echo "Don't forget to:"
echo "1. Update CHANGELOG.md with your changes"
echo "2. Commit your changes: git add . && git commit -m 'Release v$new_version'"
echo "3. Tag the release: git tag v$new_version"