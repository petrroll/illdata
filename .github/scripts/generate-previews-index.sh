#!/bin/bash
# Script to generate the previews index.html page
# Usage: generate-previews-index.sh [previews_dir] [show_cleanup_info]

set -e

PREVIEWS_DIR=${1:-"deployment/previews"}
SHOW_CLEANUP_INFO=${2:-"false"}

# Create the HTML file
cat > "$PREVIEWS_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PR Previews - IllData</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 40px auto; 
            max-width: 800px; 
            line-height: 1.6; 
            color: #333; 
        }
        .header { margin-bottom: 30px; }
        .pr-link { 
            display: block; 
            padding: 15px 20px; 
            margin: 10px 0; 
            background: #f8f9fa; 
            text-decoration: none; 
            border-radius: 8px; 
            border: 1px solid #e9ecef;
            color: #495057;
            transition: all 0.2s ease;
        }
        .pr-link:hover { 
            background: #e9ecef; 
            border-color: #dee2e6;
            transform: translateY(-1px);
        }
        .pr-number { 
            font-weight: 600; 
            color: #0969da; 
        }
        .back-link { 
            color: #6c757d; 
            text-decoration: none; 
        }
        .back-link:hover { color: #495057; }
        .empty-state { 
            text-align: center; 
            color: #6c757d; 
            font-style: italic; 
            margin: 40px 0; 
        }
        .cleanup-info {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 0.9em;
            color: #0969da;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 PR Previews - IllData</h1>
        <p>Preview builds for pull requests</p>
EOF

# Add cleanup info if requested
if [ "$SHOW_CLEANUP_INFO" = "true" ]; then
    cat >> "$PREVIEWS_DIR/index.html" << 'EOF'
        <div class="cleanup-info">
            📅 Previews older than 7 days are automatically cleaned up daily
        </div>
EOF
fi

cat >> "$PREVIEWS_DIR/index.html" << 'EOF'
    </div>
EOF

# List all PR directories and add them to the index
if ls "$PREVIEWS_DIR"/pr-* 1> /dev/null 2>&1; then
    echo '<div class="pr-list">' >> "$PREVIEWS_DIR/index.html"
    for dir in "$PREVIEWS_DIR"/pr-*/; do
        if [ -d "$dir" ]; then
            pr_num=$(echo "$dir" | sed "s|$PREVIEWS_DIR/pr-\([0-9]*\)/|\1|")
            echo "<a href=\"./pr-$pr_num/\" class=\"pr-link\">" >> "$PREVIEWS_DIR/index.html"
            echo "<span class=\"pr-number\">PR #$pr_num</span>" >> "$PREVIEWS_DIR/index.html"
            echo "</a>" >> "$PREVIEWS_DIR/index.html"
        fi
    done
    echo '</div>' >> "$PREVIEWS_DIR/index.html"
else
    echo '<div class="empty-state">No preview builds available yet.</div>' >> "$PREVIEWS_DIR/index.html"
fi

# Add footer
cat >> "$PREVIEWS_DIR/index.html" << 'EOF'
    <p><a href="../" class="back-link">← Back to main site</a></p>
</body>
</html>
EOF

echo "Generated previews index at: $PREVIEWS_DIR/index.html"
