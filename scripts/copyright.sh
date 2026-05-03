#!/bin/bash

# AiBoT - Copyright Header Application Script
# This script adds the professional copyright header to all code files.

COPYRIGHT_HEADER="/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */"

# Directories to ignore
IGNORE_DIRS=(".git" "node_modules" ".next" "public" "assets")

echo "Applying copyright headers to code files..."

# Find files and process them
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.css" \) | while read -r file; do
    # Skip ignored directories
    skip=false
    for dir in "${IGNORE_DIRS[@]}"; do
        if [[ "$file" == *"/$dir/"* ]] || [[ "$file" == "./$dir/"* ]]; then
            skip=true
            break
        fi
    done
    [ "$skip" = true ] && continue

    # Check if header already exists
    if grep -q "Copyright (c) 2026 Suryanshu Nabheet" "$file"; then
        continue
    fi

    echo "Processing $file"
    
    # Create a temporary file
    tmp_file=$(mktemp)
    
    # Check for shebang
    first_line=$(head -n 1 "$file")
    if [[ "$first_line" == "#!"* ]]; then
        echo "$first_line" > "$tmp_file"
        echo "" >> "$tmp_file"
        echo "$COPYRIGHT_HEADER" >> "$tmp_file"
        tail -n +2 "$file" >> "$tmp_file"
    else
        echo "$COPYRIGHT_HEADER" > "$tmp_file"
        echo "" >> "$tmp_file"
        cat "$file" >> "$tmp_file"
    fi
    
    # Overwrite original file
    mv "$tmp_file" "$file"
done

echo "Copyright headers applied successfully!"
