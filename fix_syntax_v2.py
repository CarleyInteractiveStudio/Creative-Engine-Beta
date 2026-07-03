import re
import os

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r') as f:
        content = f.read()

    # Specifically fix the "} else if (ley.constructor.name === "Type" {" pattern
    # It seems the regex might be failing on multi-line or complex conditions
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if 'constructor.name ===' in line and '{' in line and ')' not in line[line.find('if'):]:
            # Add missing parenthesis
            line = line.replace(' {', ') {')
        new_lines.append(line)

    content = '\n'.join(new_lines)

    with open(filepath, 'w') as f:
        f.write(content)

files = ['js/editor/ui/InspectorWindow.js', 'js/editor/ui/HierarchyWindow.js', 'js/editor/MateriaFactory.js', 'js/engine/SceneManager.js', 'js/editor.js', 'js/engine/StandaloneRuntime.js']
for f in files:
    fix_file(f)
