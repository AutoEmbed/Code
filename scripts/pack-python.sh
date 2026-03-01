#!/bin/bash
# Pack Python environment for bundling with Electron app
# This script creates a portable Python environment with all dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_ENV_DIR="$PROJECT_DIR/python-env"

echo "=== AutoEmbed Python Environment Packer ==="

# Clean previous build
if [ -d "$PYTHON_ENV_DIR" ]; then
    echo "Cleaning previous python-env..."
    rm -rf "$PYTHON_ENV_DIR"
fi

# Option 1: conda-pack (if conda available)
if command -v conda &> /dev/null; then
    echo "Using conda-pack..."

    # Create fresh env
    conda create -n autoembed-pack python=3.11 -y
    conda run -n autoembed-pack pip install -r "$PROJECT_DIR/backend/requirements.txt"

    # Pack
    conda install -n autoembed-pack conda-pack -y
    conda run -n autoembed-pack conda-pack -n autoembed-pack -o "$PROJECT_DIR/python-env.tar.gz" --force

    # Extract
    mkdir -p "$PYTHON_ENV_DIR"
    tar -xzf "$PROJECT_DIR/python-env.tar.gz" -C "$PYTHON_ENV_DIR"
    rm "$PROJECT_DIR/python-env.tar.gz"

    # Cleanup
    conda remove -n autoembed-pack --all -y

    echo "Python environment packed to $PYTHON_ENV_DIR"
else
    echo "conda not found. Using venv instead..."

    python3 -m venv "$PYTHON_ENV_DIR"
    source "$PYTHON_ENV_DIR/bin/activate"
    pip install -r "$PROJECT_DIR/backend/requirements.txt"
    deactivate

    echo "Python venv created at $PYTHON_ENV_DIR"
fi

echo "=== Done ==="
echo "Size: $(du -sh "$PYTHON_ENV_DIR" | cut -f1)"
