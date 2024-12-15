#!/bin/bash

# Check if the directory exists
if [ ! -d "$1" ]; then
  echo "Directory $1 does not exist. Please provide a valid directory."
  exit 1
fi

# Initialize LCOV input files variable
LCOV_INPUT_FILES=""

# Find lcov.info and coverage.lcov files
while read FILENAME; do
  LCOV_INPUT_FILES="$LCOV_INPUT_FILES -a \"$FILENAME\""
done < <(find "$1" \( -name lcov.info -o -name coverage.lcov \))

# Check if any files were found
if [ -z "$LCOV_INPUT_FILES" ]; then
  echo "No lcov.info or coverage.lcov files found in $1."
  exit 1
fi

# Run lcov command with the specified output path
eval lcov "${LCOV_INPUT_FILES}" -o "$1/$2"
